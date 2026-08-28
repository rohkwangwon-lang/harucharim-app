/**
 * 열 번째 검사 — 열량·단백질·식이섬유·나트륨 밖의 것.
 *
 * 이번에 두 갈래가 새로 생겼다.
 *  1) 세는 쪽 — 칼륨·인·칼슘·철. 음식에 값이 있어서 하루 합계를 낼 수 있다.
 *  2) 말하는 쪽 — B12·마그네슘·아연·비타민 D·티아민.
 *     값이 거의 없어서 셀 수 없고, 애초에 식품으로 채우는 것이 답도 아니다.
 *     대신 약과 수술을 보고 "이런 분은 모자라기 쉽습니다" 라고 말한다.
 *
 * 두 갈래가 각각 맞는지도 봐야 하지만, 정작 위험한 것은 둘이 부딪치는 자리다.
 * 신기능이 떨어진 분께 인을 줄이라고 하면서 유제품으로 칼슘을 채우라고 하면
 * 앱이 스스로 모순된 말을 하는 셈이다. 한 화면에서 반대되는 두 문장이 나란히
 * 놓이는 것을 이 앱은 이미 한 번 겪었다(위암의 갓김치).
 */
import { microTargets, foodContribution, nutritionRisk } from '../../src/engine/nutrition'
import { buildDayMenu, dayNotes, microUnknownNames } from '../../src/engine/menu'
import { adviseSupplements, adviseForShortfall } from '../../src/engine/supplementAdvice'
import { activeInteractions, activeRules, evaluateFood, evaluateSupplement } from '../../src/engine/rules'
import { ingredientKeywords, judgeProduct } from '../../src/engine/ingredientVerdict'
import { CURATED_FOODS, mealIsComplete, mealRole } from '../../src/data/foods'
import { REF_BY_ID } from '../../src/data/references'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { CancerId, CancerSubtype, PatientCondition, PatientContext, Phase } from '../../src/data/types'
import { MEAL_SLOTS } from '../../src/data/types'

const bugs: string[] = []
const seen = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seen.has(s)) { seen.add(s); bugs.push(s) } }

let seed = 20260825
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const some = <T,>(a: T[], p: number): T[] => a.filter(() => rnd() < p)

const CANCERS: CancerId[] = [
  'breast', 'prostate', 'lung', 'stomach', 'colorectal',
  'liver', 'pancreas', 'esophagus', 'headneck', 'gyn'
]
const PHASES: Phase[] = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']
const CONDS: PatientCondition[] = [
  '연하곤란', '구강점막염', '설사', '변비', '오심·구토', '식욕부진', '체중감소', '체중증가',
  '호중구감소증', '위절제후', '장루보유', '복수', '간성뇌증위험', '신기능저하', '당뇨', '고혈압', '와파린복용'
]
const MEDS = [
  'tamoxifen', 'ai', 'adt', 'capecitabine', 'tki-egfr', 'tki-alk', 'cdk46', 'sorafenib',
  'warfarin', 'doac', 'bortezomib', 'cisplatin', 'oxaliplatin', 'irinotecan',
  'methotrexate', 'steroid', 'ppi', 'levothyroxine'
]
const SUBS: Partial<Record<CancerId, CancerSubtype[]>> = {
  breast: ['호르몬수용체양성', 'HER2양성', '삼중음성'],
  prostate: ['안드로겐차단요법중'],
  stomach: ['위전절제', '위부분절제'],
  liver: ['간경변동반']
}

function randomPatient(): PatientContext {
  const cancer = pick(CANCERS)
  const subPool = SUBS[cancer] ?? []
  return {
    ...DEFAULT_PATIENT,
    cancer,
    phase: pick(PHASES),
    sex: rnd() < 0.5 ? 'M' : 'F',
    age: 20 + Math.floor(rnd() * 70),
    weightKg: 33 + Math.floor(rnd() * 95),
    heightCm: 145 + Math.floor(rnd() * 45),
    weightLossPct: rnd() < 0.25 ? Math.floor(rnd() * 20) : 0,
    conditions: some(CONDS, 0.12),
    medications: some(MEDS, 0.12),
    subtypes: subPool.length > 0 && rnd() < 0.6 ? [pick(subPool)] : [],
    onboarded: true
  } as PatientContext
}

const N = Number(process.env.N ?? 4000)
let daysBuilt = 0
let withMicro = 0
let withAdvice = 0

/*
 * 유제품은 칼슘과 인을 함께 갖고 있다. 100 g 당 칼슘 100 mg 이면 인도 90 mg 쯤 된다.
 * 그래서 "칼슘을 채우세요" 와 "인을 줄이세요" 를 한 사람에게 동시에 말하면,
 * 지키려 해도 지킬 수가 없다. 그런 조합이 나오는지 본다.
 */
const CA_RICH = CURATED_FOODS.filter((f) => (f.per100.ca ?? 0) >= 100)

for (let i = 0; i < N; i++) {
  const p = randomPatient()
  const targets = microTargets(p)
  const advice = adviseSupplements(p)
  if (targets.length > 0) withMicro++
  if (advice.length > 0) withAdvice++

  /* ── 세는 쪽 ────────────────────────────────────── */

  const byKey = new Map<string, number>()
  for (const m of targets) {
    byKey.set(m.key, (byKey.get(m.key) ?? 0) + 1)
    if (byKey.get(m.key)! > 1) bad('같은 영양소 기준이 두 번 나옴', `${p.cancer} ${m.label}`)

    if (m.min === undefined && m.max === undefined) bad('위아래가 다 없는 기준', m.label)
    if (m.min !== undefined && m.max !== undefined && m.min >= m.max)
      bad('하한이 상한보다 큼', `${m.label} ${m.min}~${m.max}`)
    if (m.refIds.length === 0) bad('문헌 없는 기준', m.label)
    for (const id of m.refIds) if (!REF_BY_ID[id]) bad('없는 문헌', `${m.label} → ${id}`)
    if (!m.why || m.why.length < 30) bad('설명이 너무 짧은 기준', m.label)
    if (!m.unit) bad('단위 없는 기준', m.label)
  }

  /* ── 말하는 쪽 ──────────────────────────────────── */

  for (const a of advice) {
    if (a.refIds.length === 0) bad('문헌 없는 영양제 권고', a.title)
    for (const id of a.refIds) if (!REF_BY_ID[id]) bad('없는 문헌', `${a.title} → ${id}`)
    if (!a.trigger) bad('사유 없는 권고', a.title)
    /*
     * 권하면서 보여 줄 제품이 하나도 없으면 화면이 빈 채로 남는다.
     * '피하세요' 는 제품이 없어도 말이 되지만 '드셔 보세요' 는 그렇지 않다.
     */
    if (a.level !== 'avoid' && a.level !== 'caution' && a.products.length === 0)
      bad('권했는데 보여 줄 제품이 없음', `${a.category} — ${a.title}`)
    /* 권한 제품 중에 앱이 스스로 '피하세요' 로 판정하는 것이 섞이면 안 된다 */
    for (const s of a.products) {
      if (evaluateSupplement(s, p).level === 'avoid')
        bad('권한 목록에 금기 제품이 섞임', `${a.category} → ${s.name}`)
    }
  }

  /*
   * 같은 분류를 권하면서 동시에 피하라고 하면 안 된다.
   *
   * '주의' 는 여기서 빼야 한다 — "칼슘을 챙기시되 갑상선호르몬제와 4시간 띄우세요" 는
   * 모순이 아니라 한 벌의 안내다. 처음에는 이것까지 잡아내서, 정작 진짜 모순을
   * 찾는 데 방해가 됐다. 금기와 권장이 겹치는 것만 본다.
   */
  const rec = new Set(
    advice.filter((a) => a.level === 'recommend' || a.level === 'consider').map((a) => a.category)
  )
  for (const a of advice) {
    /* 제품 하나를 지목한 금기는 분류 전체를 막는 것이 아니다 */
    if (a.product) continue
    if (a.level === 'avoid' && rec.has(a.category))
      bad('같은 분류를 권하면서 피하라고 함', `${a.category} — ${a.title}`)
  }

  /* ── 두 갈래가 부딪치는 자리 ──────────────────────── */

  const wantCa = targets.find((m) => m.key === 'ca' && m.min !== undefined)
  const capP = targets.find((m) => m.key === 'p' && m.max !== undefined)
  if (wantCa && capP) {
    /*
     * 이 조합 자체는 실제로 존재한다 — 신기능이 떨어진 분이 스테로이드나
     * 항호르몬 치료를 받는 경우다. 그러니 조합이 생겼다고 잘못은 아니다.
     * 문제는 앱이 그 사정을 말해 주느냐다. 아무 말 없이 두 숫자만 던지면
     * 지킬 수 없는 숙제를 내주는 셈이다.
     */
    const notes = dayNotes({ ca: wantCa.min! - 200, p: capP.max! + 400, protein: 80, kcal: 1800 }, {}, p)
    const said = notes.some((n) => /단백질 1 g 마다|인산염|인결합제/.test(n.text))
    if (!said) bad('칼슘과 인을 함께 요구하면서 사정을 말하지 않음', `${p.cancer} ${p.conditions.join(',')}`)
  }

  /* 인을 줄여야 하는 분께 유제품으로 칼슘을 채우라고만 말하면 안 된다 */
  if (wantCa && capP) {
    const caAdvice = advice.filter((a) => /칼슘/.test(a.title) && a.level !== 'avoid')
    for (const a of caAdvice) {
      if (/유제품|우유/.test(a.reason) && !/인|신장/.test(a.reason))
        bad('인 제한 중인데 유제품으로 칼슘을 채우라고 함', a.title)
    }
  }

  /* ── 하루를 실제로 짜 본다 ────────────────────────── */

  if (targets.length > 0 && i % 3 === 0) {
    daysBuilt++
    const day = buildDayMenu([], p, { day: `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}` })

    for (const m of targets) {
      const got = day.totals[m.key]
      if (got === undefined) continue
      if (!Number.isFinite(got) || got < -1e-9) bad('미량영양소 합계가 이상함', `${m.label}=${got}`)

      /*
       * 상한이 있는 것을 크게 넘기면 곤란하다.
       * 다만 인은 단백질과 애초에 부딪치므로 여기서 세지 않는다 —
       * 그건 아래에서 '사정을 말했는가' 로 따로 본다.
       */
      if (m.max !== undefined && m.tensionWith === undefined && got > m.max * 1.35)
        bad('상한을 크게 넘김', `${m.label} ${Math.round(got)} > ${m.max} (${p.cancer}/${p.phase})`)
    }

    /* 합계는 끼니별 소계를 더한 것과 같아야 한다 */
    for (const m of targets) {
      let sum = 0
      let any = false
      for (const slot of MEAL_SLOTS)
        for (const e of day.meals[slot]) {
          const v = foodContribution(e.food, e.servings)[m.key]
          if (v !== undefined) { sum += v; any = true }
        }
      if (!any) continue
      const total = day.totals[m.key] ?? 0
      if (Math.abs(total - sum) > 0.51)
        bad('합계와 끼니별 소계가 다름', `${m.label} 합계 ${Math.round(total)} vs 소계 ${Math.round(sum)}`)
    }

    /*
     * 값이 없는 음식이 섞였으면 그 사실을 밝혀야 한다.
     * "기준 안에 있습니다" 라고 안심시켜 놓고 사실이 아니면 가장 나쁘다.
     */
    const chosen = MEAL_SLOTS.flatMap((s) => day.meals[s])
      .map((e) => ({ foodId: e.food.id, servings: e.servings, meal: '아침' as const }))
    const blind = microUnknownNames(chosen, p)
    for (const m of targets) {
      if ((blind[m.key] ?? []).length === 0) continue
      const told = day.notes.some((n) => n.topic.startsWith(m.label) && /빠진 값|잡히지 않았/.test(n.text + n.topic))
      if (!told) bad('값이 빠진 것을 밝히지 않음', `${m.label} — ${(blind[m.key] ?? []).slice(0, 2).join('·')}`)
    }

    /* 미량영양소를 쫓느라 열량 상한을 뚫으면 안 된다 */
    const kcal = day.totals.kcal ?? 0
    if (kcal > day.target.kcal[1] * 1.25)
      bad('미량영양소를 쫓다 열량이 넘침', `${Math.round(kcal)} > ${day.target.kcal[1]} (${p.cancer}/${p.phase})`)
  }

  /* ── 해당 없는 분께 뜨지 않는가 ───────────────────── */

  const bare = {
    ...DEFAULT_PATIENT, cancer: p.cancer, phase: p.phase,
    conditions: [], medications: [], subtypes: [],
    weightKg: 62, heightCm: 165, weightLossPct: 0
  } as PatientContext
  const risk = nutritionRisk(bare)
  if (risk.bmi >= 18.5) {
    for (const a of adviseSupplements(bare)) {
      if (/티아민|묽은 변|위산분비억제제|스테로이드를 오래/.test(a.title))
        bad('해당 없는 분께 결핍 권고가 뜸', `${p.cancer}/${p.phase} — ${a.title}`)
    }
  }
}

/* ── 판정으로 영양제를 걸러 보기 ───────────────────── */

/*
 * 시판 제품 4만 5천 종에서 "나한테 괜찮은 것" 과 "피해야 할 것" 만 골라 보는 기능.
 *
 * 제품을 하나씩 판정해 거르지 않고, 원료를 먼저 판정한 뒤 그 원료가 든 제품을 찾는다.
 * 원료는 서른 몇 가지뿐이라 빠르기도 하고, 무엇보다 왜 나왔는지 말할 수 있다.
 *
 * 여기서 지켜야 할 것은 하나다 — 같은 원료가 권장 목록과 금기 목록에 동시에
 * 오르면 안 된다. 그러면 앱이 같은 화면에서 반대되는 말을 하게 된다.
 */
{
  let checked = 0
  for (let i = 0; i < 1500; i++) {
    const p = randomPatient()
    /*
     * 이름을 good/bad 로 두었더니 bad 가 위에서 만든 신고 함수 bad() 를 가려 버렸다.
     * 그래서 이 블록은 문제를 찾아도 신고하지 못하고 그 자리에서 죽었다 —
     * 검사가 통과했다는 것이 문제가 없다는 뜻이 아니었다.
     */
    const ok = ingredientKeywords(p, ['prefer'])
    const no = ingredientKeywords(p, ['caution', 'avoid'])
    checked++

    const overlap = ok.names.filter((n) => no.names.includes(n))
    if (overlap.length > 0)
      bad('같은 원료가 권장과 금기에 동시에 오름', `${p.cancer}/${p.phase} — ${overlap.join('·')}`)

    /* 검색어가 비면 아무것도 못 찾는다 — 이름만 있고 낱말이 없으면 화면이 빈다 */
    if (ok.names.length > 0 && ok.keywords.length === 0)
      bad('권장 원료에 검색 낱말이 없음', ok.names.join('·'))
    if (no.names.length > 0 && no.keywords.length === 0)
      bad('금기 원료에 검색 낱말이 없음', no.names.join('·'))

    /*
     * 원료 판정과 제품 판정이 어긋나면 안 된다.
     * 권장 원료 이름 그대로인 제품을 판정해 보면 '권장' 이 나와야 한다.
     */
    if (i % 50 === 0) {
      for (const name of ok.names.slice(0, 3)) {
        const v = judgeProduct(name, '', p)
        if (v.unknown) { bad('권장 원료인데 제품에서 못 알아봄', name); continue }
        if (v.level === 'avoid' || v.level === 'caution')
          bad('원료는 권장인데 제품 판정은 반대', `${name} → ${v.level} (${p.cancer}/${p.phase})`)
      }
      for (const name of no.names.slice(0, 3)) {
        const v = judgeProduct(name, '', p)
        if (v.unknown) { bad('금기 원료인데 제품에서 못 알아봄', name); continue }
        if (v.level === 'prefer')
          bad('원료는 금기인데 제품 판정은 권장', `${name} → ${v.level} (${p.cancer}/${p.phase})`)
      }
    }
  }

  /*
   * 한 제품에 원료가 여럿 들어 있는 것이 오히려 흔하다.
   *
   * 낱말만 보고 고르면 '오메가3 + 비타민 E' 제품이 오메가3 때문에 권장 목록에 오른다.
   * 그런데 치료 중이라면 그 제품의 판정은 비타민 E 때문에 '피하세요' 다.
   * "권장되는 것만" 이라고 써 놓고 피해야 할 것을 보여 주게 된다.
   * 실제로 화면에 그렇게 떠 있었다. 화면은 마지막 판정으로 한 번 더 거르고 있으니,
   * 그 판정이 정말 강한 쪽을 따르는지 여기서 못 박아 둔다.
   */
  for (let i = 0; i < 400; i++) {
    const p = randomPatient()
    /* 이름을 bad 로 두면 위에서 만든 신고 함수 bad() 를 가려 버린다 */
    const okNames = ingredientKeywords(p, ['prefer']).names
    const noNames = ingredientKeywords(p, ['caution', 'avoid']).names
    if (okNames.length === 0 || noNames.length === 0) continue
    const mixed = judgeProduct(`${okNames[0]} ${noNames[0]}`, '', p)
    if (mixed.level === 'prefer')
      bad('좋은 원료와 나쁜 원료가 섞였는데 권장으로 나옴', `${okNames[0]} + ${noNames[0]} (${p.cancer}/${p.phase})`)
    if (mixed.unknown)
      bad('원료 이름을 그대로 붙였는데 못 알아봄', `${okNames[0]} + ${noNames[0]}`)
  }

  /* 아무에게도 권장이 하나도 없으면 기능이 빈 껍데기가 된다 */
  const plain = { ...DEFAULT_PATIENT, conditions: [], medications: [], subtypes: [] } as PatientContext
  if (ingredientKeywords(plain, ['prefer']).names.length === 0)
    bad('권장으로 나오는 원료가 하나도 없음', '기능이 빈 채로 뜬다')
  if (ingredientKeywords(plain, ['caution', 'avoid']).names.length === 0)
    bad('주의·금기로 나오는 원료가 하나도 없음', '기능이 빈 채로 뜬다')

  console.log(`  원료 걸러 보기 ${checked.toLocaleString()}명 확인`)
}

/* ── 상태를 바꾸면 추천도 바뀌는가 ───────────────────── */

/*
 * 치료 시기·증상·복용 약은 자주 바뀐다. 방사선치료는 어느 날 끝나고,
 * 설사는 어제 없다가 오늘 있고, 약은 중간에 더해지거나 빠진다.
 * 그래서 내 식단 화면에서 바로 고칠 수 있게 했는데,
 * 고쳐도 추천이 그대로면 고칠 수 있게 한 뜻이 없다.
 *
 * 여기서 보는 것은 '무엇으로 바뀌는가' 가 아니라 '바뀌기는 하는가' 다.
 * 무엇으로 바뀌어야 하는지는 각 규칙이 정할 일이다.
 */
{
  const base = {
    ...DEFAULT_PATIENT, cancer: 'breast', phase: 'during_rt',
    sex: 'F', age: 55, weightKg: 70, heightCm: 163,
    weightLossPct: 0, conditions: [], medications: [], subtypes: []
  } as PatientContext
  const day = (p: PatientContext) => buildDayMenu([], p, { day: '2026-08-25' })
  const menuOf = (p: PatientContext) => {
    const m = day(p)
    return (MEAL_SLOTS)
      .flatMap((s) => m.meals[s].map((e) => e.food.id)).sort().join(',')
  }

  /* 치료가 끝나면 목표가 내려간다 — 체중이 지켜지고 있고 저체중이 아닐 때 */
  const beforeT = day(base).target.kcal
  const afterT = day({ ...base, phase: 'survivorship' }).target.kcal
  if (afterT[0] >= beforeT[0])
    bad('치료 시기를 바꿔도 목표가 그대로', `${beforeT[0]} → ${afterT[0]}`)

  /* 체중이 줄고 있으면 그 조정을 하지 않는다 — 굶리면 안 된다 */
  const losing = day({ ...base, phase: 'survivorship', weightLossPct: 8 }).target.kcal
  if (losing[0] !== beforeT[0])
    bad('체중이 줄고 있는데 치료 종료를 이유로 목표를 낮춤', `${beforeT[0]} → ${losing[0]}`)

  /* 증상을 켜면 목표든 식단이든 무언가 달라져야 한다 */
  const CHANGES: [string, Partial<PatientContext>][] = [
    ['설사', { conditions: ['설사'] }],
    ['연하곤란', { conditions: ['연하곤란'] }],
    ['신기능저하', { conditions: ['신기능저하'] }],
    ['호중구감소증', { phase: 'neutropenia' }],
    ['와파린', { medications: ['warfarin'] }],
    ['아로마타제 억제제', { medications: ['ai'] }]
  ]
  /*
   * '그날 식단이 바뀌었는가' 로만 보면 안 된다.
   *
   * 와파린을 더해도 그날 상에 시금치가 없으면 식단은 그대로다.
   * 그건 규칙이 잠든 것이 아니라 그날 걸릴 음식이 없었을 뿐이다.
   * 봐야 할 것은 '이 상태에서 판정이 달라지는 음식이 실제로 있는가' 다.
   */
  const verdictOf = (p: PatientContext) => {
    const cached = { rules: activeRules(p), interactions: activeInteractions(p) }
    return new Map(CURATED_FOODS.map((f) => [f.id, evaluateFood(f, p, 1, cached).level]))
  }
  const baseV = verdictOf(base)
  const baseMenu = menuOf(base)
  const baseNotes = day(base).notes.length

  for (const [label, patch] of CHANGES) {
    const p = { ...base, ...patch } as PatientContext
    const m = day(p)
    const v = verdictOf(p)
    let flipped = 0
    for (const [id, level] of v) if (baseV.get(id) !== level) flipped++

    const changed =
      flipped > 0 ||
      menuOf(p) !== baseMenu ||
      m.target.kcal[0] !== beforeT[0] ||
      m.notes.length !== baseNotes ||
      m.removed.length > 0
    if (!changed) bad('상태를 바꿨는데 아무것도 달라지지 않음', label)
  }
}

/* ── 모자란 것을 채우라는 말이 해로울 때 ───────────────── */

/*
 * 기록에서 모자란 것이 드러나면 그것을 채워 줄 영양제를 권한다.
 * 상황을 보고 짐작하는 것과 달리 이미 일어난 일이 근거라 훨씬 단단하다.
 *
 * 그런데 모자란다고 늘 채워야 하는 것은 아니다.
 * 설사 중에는 섬유를 줄이는 것이 목표이고, 신장이 걸리는 분께는 단백질이 부담이며,
 * 전립선암에서 칼슘 고섭취는 위험 증가와 연관되어 관찰되었다.
 * 그런 자리에서 "모자라니 채우세요" 라고 하면 앱이 스스로 반대되는 말을 하는 셈이다.
 */
{
  const ALL_LOW = [
    { label: '에너지', under: 12, days: 14, tone: 'low' },
    { label: '단백질', under: 12, days: 14, tone: 'low' },
    { label: '식이섬유', under: 12, days: 14, tone: 'low' },
    { label: '칼슘', under: 12, days: 14, tone: 'low' },
    { label: '철', under: 12, days: 14, tone: 'low' }
  ]
  const has = (rows: ReturnType<typeof adviseForShortfall>, n: string) => rows.some((r) => r.nutrient === n)

  const MUST_NOT: [string, Partial<PatientContext>, string][] = [
    ['설사 중에 섬유를 채우라고 함', { conditions: ['설사'] }, '식이섬유'],
    ['장루가 있는데 섬유를 채우라고 함', { conditions: ['장루보유'] }, '식이섬유'],
    ['신기능저하인데 단백질을 채우라고 함', { conditions: ['신기능저하'] }, '단백질'],
    ['간성뇌증 위험인데 단백질을 채우라고 함', { conditions: ['간성뇌증위험'] }, '단백질'],
    ['전립선암(ADT 아님)인데 칼슘을 채우라고 함', { cancer: 'prostate' }, '칼슘'],
    ['위를 자르지 않았는데 철분을 권함', { cancer: 'breast' }, '철']
  ]
  for (const [label, over, nutrient] of MUST_NOT) {
    const who = { ...DEFAULT_PATIENT, conditions: [], medications: [], subtypes: [], ...over } as PatientContext
    if (has(adviseForShortfall(ALL_LOW, who), nutrient)) bad('해로울 수 있는 보충을 권함', label)
  }

  const MUST: [string, Partial<PatientContext>, string][] = [
    ['ADT 중에는 칼슘을 권해야 한다', { cancer: 'prostate', medications: ['adt'] }, '칼슘'],
    ['위절제 후에는 철분을 권해야 한다', { cancer: 'stomach', conditions: ['위절제후'] }, '철'],
    ['열량이 모자라면 경구영양보충을 권해야 한다', { cancer: 'breast' }, '에너지'],
    ['단백질이 모자라면 단백질 보충을 권해야 한다', { cancer: 'breast' }, '단백질']
  ]
  for (const [label, over, nutrient] of MUST) {
    const who = { ...DEFAULT_PATIENT, conditions: [], medications: [], subtypes: [], ...over } as PatientContext
    if (!has(adviseForShortfall(ALL_LOW, who), nutrient)) bad('채워야 하는데 권하지 않음', label)
  }

  /* 권해 놓고 보여 줄 제품이 없으면 화면이 빈다 */
  for (const c of ['breast', 'stomach', 'colorectal', 'prostate'] as const) {
    const who = { ...DEFAULT_PATIENT, cancer: c, conditions: [], medications: [], subtypes: [] } as PatientContext
    for (const r of adviseForShortfall(ALL_LOW, who)) {
      if (r.products.length === 0) bad('권했는데 보여 줄 제품이 없음', `${c} ${r.nutrient}`)
      if (r.refIds.length === 0) bad('문헌 없는 보충 권고', `${c} ${r.nutrient}`)
      if (!r.byFood) bad('식품으로 채우는 길을 적지 않음', `${c} ${r.nutrient}`)
    }
  }
}

/* ── 한식 상차림이 상차림다운가 ───────────────── */

/*
 * 밥이 없었다.
 *
 * 자료의 form: 'ingredient' 를 그대로 '추천하면 안 되는 것' 으로 써 온 탓에
 * 쌀밥도 김치도 두부도 김도 후보에서 빠져 있었다 — 488종 중 148종이 그랬다.
 * 게다가 죽은 한 그릇에 단백질이 12 g 이라 밥(5~7 g)보다 점수가 높아서,
 * 치료를 마치고 잘 지내시는 분께도 아침에 녹두죽 점심에 흑임자죽이 매일 올라왔다.
 * 스무 날을 돌려도 밥이 한 번도 나오지 않았다.
 *
 * 한식 식단이라면 밥이 상에 올라야 하고, 죽은 아플 때 나와야 한다.
 */
{
  const wellPatient = {
    ...DEFAULT_PATIENT, cancer: 'breast', phase: 'survivorship',
    sex: 'F', age: 55, weightKg: 60, heightCm: 163,
    weightLossPct: 0, conditions: [], medications: [], subtypes: []
  } as PatientContext
  const softPatient = { ...wellPatient, conditions: ['연하곤란'] } as PatientContext

  const countIn = (who: PatientContext, match: (name: string, group: string) => boolean) => {
    let hit = 0
    let days = 0
    for (let d = 0; d < 20; d++) {
      const m = buildDayMenu([], who, { day: `2026-${String(1 + (d % 12)).padStart(2, '0')}-${String(1 + d).padStart(2, '0')}` })
      days++
      const names = (MEAL_SLOTS)
        .flatMap((s) => m.meals[s].map((e) => ({ n: e.food.name, g: e.food.group })))
      if (names.some((x) => match(x.n, x.g))) hit++
    }
    return { hit, days }
  }

  const isStaple = (n: string, g: string) => g === '곡류·전분' && /밥/.test(n)
  const isPorridge = (n: string, g: string) => g === '밥·면·죽 요리' && /죽$|미음/.test(n)

  const rice = countIn(wellPatient, isStaple)
  if (rice.hit < rice.days * 0.5)
    bad('한식인데 밥이 상에 잘 오르지 않음', `${rice.hit}/${rice.days}일`)

  const porridge = countIn(wellPatient, isPorridge)
  if (porridge.hit > porridge.days * 0.5)
    bad('잘 지내시는 분께 죽이 너무 잦음', `${porridge.hit}/${porridge.days}일`)

  /* 반대로 삼키기 어려운 분께는 죽이 나와야 한다 */
  const softPorridge = countIn(softPatient, isPorridge)
  if (softPorridge.hit === 0)
    bad('삼키기 어려운 분께 죽이 한 번도 안 나옴', `${softPorridge.hit}/${softPorridge.days}일`)

  /* 김치·나물 같은 반찬도 상에 올라야 한다 */
  const banchan = countIn(wellPatient, (_n, g) => g === '반찬·조림·볶음' || g === '채소' || g === '해조·버섯')
  if (banchan.hit < banchan.days * 0.4)
    bad('반찬이 상에 잘 오르지 않음', `${banchan.hit}/${banchan.days}일`)

  console.log(`  상차림 20일 · 밥 ${rice.hit}일 · 죽 ${porridge.hit}일 · 반찬 ${banchan.hit}일`)

  /*
   * 한 상이 한 상다운가.
   *
   * 영양만 맞추다 보니 억지스러운 조합이 나왔다 —
   * 아침에 흑미밥 한 공기만, 저녁에 찹쌀밥과 복숭아 두 가지.
   * 열량도 단백질도 맞았지만 그건 밥상이 아니다.
   *
   * 한국 상차림은 밥·국·반찬이 한 벌이다. 밥은 혼자 서지 못하고,
   * 과일은 아무리 놓아도 반찬 자리를 대신하지 못하며, 한 끼에 밥은 하나다.
   * 죽이나 국수 한 그릇은 그것만으로 한 끼이므로 여기서 따지지 않는다.
   */
  {
    const CANCER_LIST: CancerId[] = ['breast', 'stomach', 'colorectal', 'lung', 'pancreas', 'liver']
    let meals = 0
    let broken = 0
    let twoStaples = 0
    for (let i = 0; i < 180; i++) {
      const who = {
        ...DEFAULT_PATIENT,
        cancer: CANCER_LIST[i % CANCER_LIST.length],
        phase: (['during_rt', 'during_chemo', 'post_op', 'survivorship'] as Phase[])[i % 4],
        sex: i % 2 ? 'M' : 'F', age: 55,
        weightKg: 45 + ((i * 7) % 50), heightCm: 165,
        weightLossPct: 0, conditions: [], medications: [], subtypes: []
      } as PatientContext
      const m = buildDayMenu([], who, { day: `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}` })
      for (const slot of ['아침', '점심', '저녁'] as const) {
        const items = m.meals[slot]
        if (items.length === 0) continue
        meals++
        if (!mealIsComplete(items.map((e) => e.food))) broken++
        const staples = items.filter((e) => {
          const r = mealRole(e.food)
          return r === 'staple' || r === 'onedish'
        }).length
        if (staples >= 2) twoStaples++
      }
    }
    if (broken > meals * 0.03)
      bad('한 끼로 보기 어려운 상이 잦음', `${broken}/${meals} — 밥만 놓였거나 후식뿐인 끼니`)
    if (twoStaples > 0)
      bad('한 끼에 주식이 둘 이상', `${twoStaples}/${meals}`)
    console.log(`  한 상 ${meals}건 · 짜임새 어긋남 ${broken}건 · 주식 중복 ${twoStaples}건`)
  }
}

/* ── 곁들여 든 것으로 제품을 권하지 않는가 ───────────────── */

/*
 * "칼슘이 필요하시다" 고 유산균 한 통을 권할 수는 없다.
 *
 * 공개 자료에는 함량이 없다. 그래서 두 가지로 갈랐다.
 *  1) 기능성 '설명문' 의 낱말을 원료로 오인하지 않는다.
 *     비타민 D 의 표시 문구가 "칼슘과 인이 흡수되고 이용되는데 필요" 이고
 *     비타민 B6 는 "단백질 및 아미노산 이용에 필요" 라서,
 *     낱말만 훑으면 비타민 D 제품이 칼슘 제품이 되고 B6 제품이 단백질 보충제가 됐다.
 *  2) 권할 때는 그 원료가 이 제품의 주된 성분일 때만 권한다.
 *     말릴 때는 반대로 곁들여 든 것까지 본다 — 놓쳐서 생기는 손해가
 *     한쪽은 헛걸음이고 다른 쪽은 해가 되는 일이기 때문이다.
 */
{
  const p = {
    ...DEFAULT_PATIENT, cancer: 'breast', phase: 'survivorship',
    conditions: [], medications: ['ai'], subtypes: ['호르몬수용체양성']
  } as PatientContext

  /* 설명문을 원료로 읽으면 안 된다 */
  const CLAIM_ONLY: [string, string, string][] = [
    ['비타민 D 설명문의 칼슘', '비타민D 1000IU', '칼슘과 인이 흡수되고 이용되는데 필요'],
    ['비타민 B6 설명문의 단백질', '뉴 마그네슘350+B6', '[비타민B6] 단백질 및 아미노산 이용에 필요'],
    ['비타민 C 설명문의 철', '비타민C 1000', '결합조직 형성과 기능유지에 필요 철의 흡수에 필요']
  ]
  for (const [label, name, fn] of CLAIM_ONLY) {
    const v = judgeProduct(name, fn, p)
    const names = v.items.map((x) => x.ingredient)
    if (names.includes('칼슘') && !/칼슘/.test(name))
      bad('설명문을 원료로 잘못 읽음', `${label} — 칼슘으로 잡힘`)
    if (names.includes('단백질 보충') && !/단백질|프로틴/.test(name))
      bad('설명문을 원료로 잘못 읽음', `${label} — 단백질 보충으로 잡힘`)
    if (names.includes('철분') && !/철/.test(name))
      bad('설명문을 원료로 잘못 읽음', `${label} — 철분으로 잡힘`)
  }

  /* 곁들여 든 것으로 권하지 않는다 */
  const SIDE: [string, string][] = [
    ['100억 유산균 아연&비타민D', '[프로바이오틱스] 유산균 증식 및 유해균 억제 [아연] 정상적인 면역기능에 필요 [비타민D] 뼈의 형성과 유지에 필요'],
    ['100억 생 유산균 프리미엄', '* 비타민D 뼈의 형성과 유지에 필요 * 프로바이오틱스 유산균 증식']
  ]
  for (const [name, fn] of SIDE) {
    const v = judgeProduct(name, fn, p)
    if (v.primaryLevel === 'prefer')
      bad('곁들여 든 원료로 제품을 권함', `${name}`)
  }

  /* 반대로, 이름에 안 드러나도 신고된 기능성 원료면 권해야 한다 */
  const REAL: [string, string][] = [
    ['(구)본포뮬러젤리', '[칼슘] 뼈와 치아 형성에 필요 골다공증발생 위험 감소에 도움을 줌'],
    ['아스타·오메가', '[EPA 및 DHA 함유 유지] 혈중 중성지질 개선, 혈행 개선']
  ]
  for (const [name, fn] of REAL) {
    const v = judgeProduct(name, fn, p)
    if (v.primaryLevel !== 'prefer')
      bad('신고된 기능성 원료인데 권하지 않음', `${name} → ${v.primaryLevel}`)
  }

  /* 말리는 쪽은 곁들여 든 것도 잡아야 한다 */
  const rt = { ...p, phase: 'during_rt' } as PatientContext
  const mixed = judgeProduct('오메가3 골드', '[EPA 및 DHA 함유 유지] 혈행 개선 [비타민E] 유해산소로부터 세포를 보호', rt)
  if (mixed.level !== 'avoid' && mixed.level !== 'caution')
    bad('치료 중 피해야 할 것이 곁들여 들었는데 놓침', `오메가3+비타민E → ${mixed.level}`)

  /*
   * 좋은 것과 피할 것이 한 통에 담겨 오면 권하지 않는다.
   *
   * 화면이 쓰는 것과 같은 잣대를 여기서도 쓴다 —
   * 주된 성분이 권장이면서, 제품 어디에도 주의·금기 원료가 없어야 한다.
   * 앞의 조건만 두었더니 방사선치료 중인 분께 오메가3+비타민E 제품이 권장으로 나갔다.
   * 오메가3 는 권장이 맞지만 치료 중 고용량 비타민 E 는 재발을 늘린 성분이고,
   * 한 통에 담겨 오는 이상 따로 뗄 수가 없다.
   */
  const recommendable = (v: ReturnType<typeof judgeProduct>) =>
    v.primaryLevel === 'prefer' && v.level !== 'caution' && v.level !== 'avoid'

  const MIXED: [string, string, PatientContext][] = [
    ['알티지 오메가3 골드', '[EPA 및 DHA 함유 유지] 혈행 개선 [비타민E] 유해산소로부터 세포를 보호하는데 필요', rt],
    ['칼슘 마그네슘 비타민D 아연', '[칼슘] 뼈와 치아 형성에 필요 [셀레늄] 유해산소로부터 세포를 보호', rt]
  ]
  for (const [name, fn, who] of MIXED) {
    if (recommendable(judgeProduct(name, fn, who)))
      bad('주의 성분이 함께 든 제품을 권함', name)
  }

  /* 반대로 섞이지 않은 것은 그대로 권해야 한다 */
  const clean = judgeProduct('오메가3 프리미엄', '[EPA 및 DHA 함유 유지] 혈중 중성지질 개선', rt)
  if (!recommendable(clean)) bad('섞이지 않은 제품인데 권하지 않음', `오메가3 프리미엄 → ${clean.level}`)
}

/* ── '다시 구성' 이 실제로 다시 구성하는가 ───────────────── */

/*
 * 마음에 안 드셔서 다시 청하셨는데 곁들이 한둘만 바뀌면,
 * 사용자에게는 아무 일도 일어나지 않은 것과 같다. 실제로 그런 말을 들었다.
 *
 * 엔진은 처음부터 조금씩 바꾸고 있었다 — 96 % 에서 무언가 달라졌다.
 * 문제는 크기였다. 평균 36 % 만 바뀌었고 가장 흔한 것이 일곱 가지 중 둘이었으며,
 * 그 둘이 대개 곁들이라 저녁의 주요리는 그대로였다.
 * '바뀌었는가' 만 세었으면 통과했을 검사다. 그래서 크기를 센다.
 *
 * 동시에 영양이 무너지면 안 된다 — 다양하게 보여 드리자고
 * 목표를 못 맞추는 식단을 내놓을 수는 없다.
 */
{
  const CANCER_LIST: CancerId[] = ['breast', 'stomach', 'colorectal', 'lung', 'pancreas', 'liver']
  const COND_SETS: PatientCondition[][] = [[], ['설사'], ['신기능저하'], ['연하곤란'], ['호중구감소증']]
  let tried = 0
  let tooSimilar = 0
  let shortfall = 0
  let sameMain = 0
  let sumChanged = 0

  for (let i = 0; i < 240; i++) {
    const p = {
      ...DEFAULT_PATIENT,
      cancer: CANCER_LIST[i % CANCER_LIST.length],
      phase: (['during_rt', 'during_chemo', 'post_op', 'survivorship'] as Phase[])[i % 4],
      sex: i % 2 ? 'M' : 'F', age: 55,
      weightKg: 45 + ((i * 7) % 50), heightCm: 165,
      weightLossPct: 0, conditions: COND_SETS[i % COND_SETS.length], medications: [], subtypes: []
    } as PatientContext

    /*
     * 화면이 하는 것과 같은 방식으로 돌린다 —
     * 직전 안의 큰 두 가지를 피하고 다음 안을 받는다.
     * 화면만 그렇게 하고 검사는 그냥 nonce 만 올리면, 검사가 실제와 다른 것을 본다.
     */
    let prev: { id: string; kcal: number }[] = []
    const ids = (nonce: number) => {
      const avoid = new Map<string, number>()
      if (nonce > 0)
        for (const e of [...prev].sort((a, b) => b.kcal - a.kcal).slice(0, 2)) avoid.set(e.id, 0)
      const m = buildDayMenu([], p, { day: '2026-08-25', nonce, recent: avoid })
      const entries = (MEAL_SLOTS)
        .flatMap((s) => m.meals[s].map((e) => ({ id: e.food.id, kcal: foodContribution(e.food, e.servings).kcal ?? 0 })))
      prev = entries
      return { list: entries.map((e) => e.id), kcal: m.totals.kcal ?? 0, target: m.target.kcal }
    }
    const a = ids(0)
    if (a.list.length === 0) continue
    tried++

    const b = ids(1)
    const keep = new Set(b.list)
    const changed = a.list.filter((x) => !keep.has(x)).length / a.list.length
    sumChanged += changed
    /*
     * 절반 넘게 그대로면 '다시 구성' 이라고 부르기 어렵다.
     * 다만 고를 것이 몇 가지 없는 분(제한이 겹친 경우)은 어쩔 수 없으므로
     * 한 건씩이 아니라 전체 비율로 본다.
     */
    if (changed < 0.15) tooSimilar++

    /* 다시 구성한 안도 목표를 채워야 한다 */
    for (const r of [b, ids(2)]) {
      if (r.kcal < r.target[0] * 0.85) shortfall++
    }

    /*
     * 저녁의 주요리가 바뀌는가.
     *
     * 곁들이만 바뀌면 사용자에게는 아무 일도 없는 것과 같다.
     * 실제로 다섯 번을 눌러도 저녁 주요리가 그대로인 경우가 절반이었고,
     * 그때 나온 말이 "아무리 눌러도 변화가 없다" 였다.
     */
    const dinnerMain = (nonce: number) => {
      const m = buildDayMenu([], p, { day: '2026-08-25', nonce, recent: mainAvoid })
      const d = m.meals['저녁']
      if (d.length === 0) return '—'
      const big = d.reduce((x, y) =>
        (foodContribution(y.food, y.servings).kcal ?? 0) > (foodContribution(x.food, x.servings).kcal ?? 0) ? y : x)
      mainAvoid = new Map([[big.food.id, 0]])
      return big.food.id
    }
    let mainAvoid = new Map<string, number>()
    if (dinnerMain(0) === dinnerMain(1) && dinnerMain(2) === dinnerMain(3)) sameMain++
  }

  const avg = tried > 0 ? sumChanged / tried : 0
  /*
   * 눈금은 고쳐 본 결과에서 가져왔다.
   * 넓히기 전이 35 %, 넓힌 뒤가 47 % 였다. 그 사이에 선을 긋는다 —
   * 30 % 로 두었더니 예전 동작이 그대로 통과해서, 검사가 아무 일도 하지 않았다.
   */
  if (avg < 0.42) bad("'다시 구성' 이 너무 조금 바꿈", `평균 ${Math.round(avg * 100)} % 만 달라짐`)
  if (tooSimilar > tried * 0.15)
    bad("'다시 구성' 인데 거의 그대로인 경우가 잦음", `${tooSimilar}/${tried}`)
  if (shortfall > tried * 0.1)
    bad("다시 구성한 안이 목표를 못 채움", `${shortfall}/${tried * 2}`)
  if (sameMain > tried * 0.1)
    bad("다시 구성해도 저녁 주요리가 그대로", `${sameMain}/${tried}`)

  console.log(`  다시 구성 ${tried}건 · 평균 ${Math.round(avg * 100)} % 달라짐 · 거의 그대로 ${tooSimilar}건 · 주요리 고정 ${sameMain}건`)
}

/* ── 값이 있어야 셀 수 있다 ───────────────────────── */

{
  const probe: [string, Partial<PatientContext>][] = [
    ['신기능저하', { conditions: ['신기능저하'] }],
    ['위절제후', { conditions: ['위절제후'] }],
    ['아로마타제 억제제', { medications: ['ai'] }],
    ['ADT', { cancer: 'prostate', medications: ['adt'] }]
  ]
  for (const [label, setup] of probe) {
    const p = { ...DEFAULT_PATIENT, conditions: [], medications: [], subtypes: [], ...setup } as PatientContext
    const ts = microTargets(p)
    if (ts.length === 0) { bad('기준이 떠야 하는데 안 뜸', label); continue }
    for (const m of ts) {
      const have = CURATED_FOODS.filter((f) => typeof f.per100[m.key] === 'number').length
      const pct = Math.round((have / CURATED_FOODS.length) * 100)
      if (pct < 70) bad('값이 너무 적은 영양소를 셈', `${label} ${m.label} — ${pct} %`)
      /* 칼슘을 채우라고 하려면 칼슘이 실제로 든 음식이 있어야 한다 */
      if (m.min !== undefined && m.key === 'ca' && CA_RICH.length < 20)
        bad('채우라고 할 음식이 부족함', `${m.label} — ${CA_RICH.length}종`)
    }
  }
}

console.log(`\n무작위 ${N.toLocaleString()}명 · 미량영양소 기준이 뜬 분 ${withMicro.toLocaleString()}명 · 영양제 권고가 뜬 분 ${withAdvice.toLocaleString()}명 · 하루를 짜 본 것 ${daysBuilt.toLocaleString()}건`)
console.log(`\n미량영양소 검사 완료 — 문제 ${bugs.length}종`)
const grouped = new Map<string, string[]>()
for (const b of bugs) {
  const [k, d] = b.split(' :: ')
  grouped.set(k, [...(grouped.get(k) ?? []), d])
}
for (const [k, l] of grouped) {
  console.log(`■ ${k} (${l.length}종)`)
  l.slice(0, 5).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
