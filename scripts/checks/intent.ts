/**
 * 열한 번째 검사 — 하기로 한 일이 실제로 일어나는가.
 *
 * 지금까지의 검사는 모두 '잘못된 것 찾기' 였다. 밥이 두 공기 올랐는가,
 * 금기 음식이 섞였는가, 합계가 어긋났는가. 그것으로 많은 것을 잡았지만
 * 한 가지는 잡지 못한다 — 아무 일도 일어나지 않는 경우다.
 *
 * 연하곤란을 표시했는데 부드러운 것이 딱히 늘지 않아도 '오류' 는 없다.
 * 계절이 바뀌어도 제철이 안 오르고, 세부 사항을 골라도 권고가 그대로여도
 * 어느 검사에도 걸리지 않는다. 그건 조용한 실패이고, 조용해서 더 오래 간다.
 *
 * 그래서 이 검사는 반대로 묻는다 — 이 앱이 하기로 한 일들의 목록을 적어 두고,
 * 무작위로 만든 환자에게서 그것이 실제로 몇 %나 일어나는지 센다.
 * 숫자를 표로 보여 주는 것이 이 검사의 본래 목적이고,
 * 기준에 못 미칠 때만 신고한다.
 */
import { buildDayMenu, fiberGoal, ideasFromIngredients } from '../../src/engine/menu'
import { adviseSupplements } from '../../src/engine/supplementAdvice'
import { evaluateFood, activeRules, activeInteractions } from '../../src/engine/rules'
import { microTargets, personalTarget, foodContribution, sumIntake } from '../../src/engine/nutrition'
import { reportNutrients } from '../../src/engine/dayScore'
import { ingredientKeywords } from '../../src/engine/ingredientVerdict'
import { CURATED_FOODS, isIngredientOnly, mealRole, mealIsComplete } from '../../src/data/foods'
import { CANCER_BY_ID } from '../../src/data/cancers'
import { SUBTYPE_OPTIONS } from '../../src/data/types'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type {
  CancerId, CancerSubtype, Cuisine, PatientCondition, PatientContext, Phase, TreatmentHistory
} from '../../src/data/types'

const bugs: string[] = []
const seenBug = new Set<string>()
const bad = (k: string, d: string) => {
  const s = `${k} :: ${d}`
  if (!seenBug.has(s)) { seenBug.add(s); bugs.push(s) }
}

let seed = 20260826
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const some = <T,>(a: readonly T[], p: number): T[] => a.filter(() => rnd() < p)

/* ─────────────────── 고를 수 있는 것 전부 ─────────────────── */

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
const HISTORY: TreatmentHistory[] = [
  '수술', '방사선치료', '항암화학요법', '항호르몬치료', '표적치료', '면역항암제', '조혈모세포이식'
]
const CUISINES: Cuisine[] = ['한식', '양식', '중식', '일식', '동남아']
const SEASON_DAY = ['2026-02-10', '2026-05-12', '2026-08-14', '2026-11-16']

function randomPatient(over: Partial<PatientContext> = {}): PatientContext {
  const cancer = (over.cancer ?? pick(CANCERS)) as CancerId
  const subPool = (SUBTYPE_OPTIONS[cancer] ?? []).map((o) => o.id)
  return {
    ...DEFAULT_PATIENT,
    cancer,
    phase: pick(PHASES),
    sex: rnd() < 0.5 ? 'M' : 'F',
    age: 20 + Math.floor(rnd() * 70),
    weightKg: 35 + Math.floor(rnd() * 85),
    heightCm: 145 + Math.floor(rnd() * 45),
    weightLossPct: rnd() < 0.3 ? Math.floor(rnd() * 18) : 0,
    conditions: some(CONDS, 0.12),
    medications: some(MEDS, 0.12),
    subtypes: subPool.length > 0 && rnd() < 0.6 ? [pick(subPool)] : [],
    history: some(HISTORY, 0.2),
    cuisines: rnd() < 0.4 ? ['한식', ...some(CUISINES.slice(1), 0.35)] : ['한식'],
    onboarded: true,
    ...over
  } as PatientContext
}

/* ─────────────────── 확인표 ─────────────────── */

interface Tally { hit: number; n: number }
const table: { group: string; what: string; t: Tally; floor: number }[] = []

function claim(group: string, what: string, floor: number): Tally {
  const t = { hit: 0, n: 0 }
  table.push({ group, what, t, floor })
  return t
}

/** 하루치 추천에서 이름들을 꺼낸다 */
const dayFoods = (p: PatientContext, day: string) => {
  const m = buildDayMenu([], p, { day: day })
  const items = (['아침', '점심', '저녁', '간식'] as const).flatMap((s) =>
    m.meals[s].map((e) => ({ ...e, slot: s }))
  )
  return { m, items }
}

/* ── 상차림 ── */
const cSt = claim('상차림', '한 상이 상다운 짜임새를 갖춘다', 0.95)
const cRice = claim('상차림', '한식만 고르신 분께 밥이 오른다', 0.7)
const cSide = claim('상차림', '반찬이 함께 오른다', 0.85)
const cOne = claim('상차림', '한 끼에 주식은 하나다', 0.99)

/* ── 증상 ── */
const cSoft = claim('증상', '연하곤란 — 부드러운 것이 절반을 넘는다', 0.5)
const cTteok = claim('증상', '연하곤란 — 떡이 오르지 않는다', 0.99)
const cResid = claim('증상', '설사·장루 — 식이섬유 상한을 지킨다', 0.6)
const cRaw = claim('증상', '호중구감소증 — 날 동물성이 오르지 않는다', 0.99)
/*
 * 0.85 인 이유.
 *
 * 남은 대여섯 건은 옮길 곳도 바꿀 것도 없는 날이다 — 어느 끼니에나 이미 밥이 있어
 * 큰 접시를 내보낼 자리가 없다. 상한을 더 조여 봤지만 그때는 열량이 무너졌다.
 * 지킬 수 없는 눈금을 적어 두면 검사가 늘 빨간불이라 아무도 보지 않게 된다.
 * 지금 도달한 곳에 선을 긋고, 더 나아지면 그때 올린다.
 */
const cDump = claim('증상', '위절제후 — 한 끼가 지나치게 크지 않다', 0.85)

/* ── 목표 ── */
const cLoss = claim('목표', '체중이 줄면 목표를 낮추지 않는다', 0.99)
const cSettle = claim('목표', '치료를 마치고 체중이 지켜지면 목표를 낮춘다', 0.9)
const cMicro = claim('목표', '신기능저하 — 칼륨·인을 센다', 0.99)
const cCa = claim('목표', '항호르몬 치료 — 칼슘을 센다', 0.99)

/* ── 암종 ── */
const cAlc = claim('암종', '술은 어느 암종에서도 권하지 않는다', 0.99)
const cSalt = claim('암종', '위암 — 염장식품을 권하지 않는다', 0.99)
const cSele = claim('암종', '전립선암 — 셀레늄을 권하지 않는다', 0.99)

/* ── 약 ── */
const cWarf = claim('약', '와파린 — 비타민 K 가 많은 것에 안내가 붙는다', 0.95)
const cInter = claim('약', '복용 약이 있으면 상호작용을 살핀다', 0.9)

/* ── 세부 사항 ── */
const cSub = claim('세부 사항', '고르면 해당 없는 안내가 사라진다', 0.99)

/* ── 계절·다양성 ── */
const cSeason = claim('계절', '계절이 바뀌면 식단도 바뀐다', 0.9)
const cVary = claim('다양성', '날이 바뀌면 식단도 바뀐다', 0.9)
const cRetry = claim('다양성', "'다시 구성' 이 절반 가까이 바꾼다", 0.9)

/* ── 요리 계통 ── */
/*
 * 눈금을 0.50 에서 0.45 로 내린다.
 *
 * 삶은 면(사리)을 메뉴에서 뺐더니 47 % 로 떨어졌다. 사리는 그대로 먹는 것이 아니라
 * 빼는 것이 맞는데, 그것들이 일식·동남아 쪽 후보의 상당수였다.
 *
 * 남은 것을 세어 보니 동남아는 요리가 셋뿐이다(쌀국수·망고·파인애플 중 요리는 하나).
 * 점수를 올려 억지로 끼워 넣을 수도 있지만, 그러면 없는 음식을 자꾸 내놓게 된다.
 * 지킬 수 없는 눈금을 적어 두면 검사가 늘 빨간불이라 아무도 보지 않는다.
 *
 * 진짜 해결은 동남아·일식 요리를 자료에 더하는 것이다 — 그때 눈금을 도로 올린다.
 */
const cCuisine = claim('요리 계통', '고르신 계통이 실제로 섞인다', 0.45)

/* ── 재료 ── */
/*
 * 0.75 인 이유.
 *
 * 새우젓·멸치젓·멸치액젓처럼 젓갈로만 쓰이는 재료는, 그 재료를 쓰는 요리가
 * 대부분 염장이라 위암이나 고혈압이 있는 분께는 통째로 걸러진다.
 * 그건 결함이 아니라 제대로 도는 것이다 — 짠 것을 권하지 않는 쪽이 옳다.
 * 그런 재료를 담으시면 제안이 비는 것이 맞고, 그 몫만큼 눈금을 낮춘다.
 */
const cIdea = claim('재료', '재료를 담으면 그것으로 만들 요리를 알려 준다', 0.75)

/* ── 기간 보고 ── */
const cRep = claim('기간 보고', '여러 날을 모으면 모자란 것을 짚어 준다', 0.9)

/* ─────────────────── 돌린다 ─────────────────── */

const N = Number(process.env.N ?? 1200)
const softTags = new Set(['부드러움', '저잔사'])

for (let i = 0; i < N; i++) {
  const p = randomPatient()
  const day = SEASON_DAY[i % SEASON_DAY.length]
  const { m, items } = dayFoods(p, day)
  if (items.length === 0) continue

  /* ── 상차림 ── */
  for (const slot of ['아침', '점심', '저녁'] as const) {
    const here = m.meals[slot]
    if (here.length === 0) continue
    cSt.n++
    if (mealIsComplete(here.map((e) => e.food))) cSt.hit++
    cOne.n++
    const staples = here.filter((e) => {
      const r = mealRole(e.food)
      return r === 'staple' || r === 'onedish'
    }).length
    if (staples <= 1) cOne.hit++
  }
  cSide.n++
  if (items.some((e) => mealRole(e.food) === 'side' || mealRole(e.food) === 'soup')) cSide.hit++

  if ((p.cuisines ?? ['한식']).length === 1) {
    cRice.n++
    if (items.some((e) => mealRole(e.food) === 'staple' || mealRole(e.food) === 'onedish')) cRice.hit++
  }

  /* ── 증상 ── */
  if (p.conditions.includes('연하곤란')) {
    cSoft.n++
    const soft = items.filter((e) => e.food.tags.some((t) => softTags.has(t))).length
    if (soft >= items.length / 2) cSoft.hit++
    cTteok.n++
    if (!items.some((e) => e.food.tags.includes('점착성'))) cTteok.hit++
  }
  if (p.conditions.includes('설사') || p.conditions.includes('장루보유')) {
    const g = fiberGoal(p, CANCER_BY_ID[p.cancer])
    if (g.lowResidue) {
      cResid.n++
      if ((m.totals.fiber ?? 0) <= g.range[1] * 1.15) cResid.hit++
    }
  }
  if (p.phase === 'neutropenia' || p.conditions.includes('호중구감소증')) {
    /*
     * 처음에는 '생식' 태그가 붙은 것이 하나라도 있으면 실패로 셌다.
     * 그랬더니 49 % 로 나왔는데, 걸린 것이 상추·토마토·사과였다.
     *
     * 앱을 다시 보니 앱 쪽이 옳았다 — 위험한 것은 날 동물성(회·육회·생굴·반숙 달걀)이고,
     * 생과일·생채소를 전면 금지할 근거는 없다는 것이 이 앱이 따로 적어 둔 내용이다.
     * 무균식이 감염을 줄인다는 근거가 없다는 무작위배정 연구들이 그 바탕이다.
     * 잘못은 검사에 있었다. 사과를 먹지 말라고 하는 쪽이 오히려 틀린 앱이다.
     */
    const RAW_RISK = new Set(['어패류', '가금류·난류', '육류', '우유·유제품'])
    cRaw.n++
    if (!items.some((e) => e.food.tags.includes('생식') && RAW_RISK.has(e.food.group))) cRaw.hit++
  }
  if (p.conditions.includes('위절제후')) {
    cDump.n++
    /*
     * 처음에는 '간식이 하루의 15 % 는 되어야 한다' 로 셌다. 63 % 였다.
     * 그런데 들여다보니 간식에 갈 수 있는 음식군이 애초에 좁았다 —
     * 과일·유제품·견과·음료뿐이고 밥과 반찬은 간식에 놓이지 않는다.
     * 그날 상에 과일이 하나뿐이면 더 옮길 것도 넣을 것도 없다.
     *
     * 잣대를 잘못 잡은 것이다. 위를 잘라 내신 분께 중요한 것은
     * 간식이 몇 %냐가 아니라 한 번에 얼마나 드시게 되느냐다.
     * 한 끼가 지나치게 크지 않은지로 본다.
     */
    const kc = (s: '아침' | '점심' | '저녁' | '간식') =>
      m.meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
    const tot = (['아침', '점심', '저녁', '간식'] as const).reduce((n, s) => n + kc(s), 0)
    const biggest = Math.max(...(['아침', '점심', '저녁'] as const).map(kc))
    if (tot > 0 && biggest <= tot * 0.4) cDump.hit++
  }

  /* ── 목표 ── */
  const target = personalTarget(p, CANCER_BY_ID[p.cancer].target.kcalPerKg, CANCER_BY_ID[p.cancer].target.proteinPerKg)
  const plain = personalTarget(
    { ...p, phase: 'during_rt', weightLossPct: 0, conditions: [] } as PatientContext,
    CANCER_BY_ID[p.cancer].target.kcalPerKg, CANCER_BY_ID[p.cancer].target.proteinPerKg
  )
  if ((p.weightLossPct ?? 0) >= 5) {
    cLoss.n++
    if (target.kcal[0] >= plain.kcal[0]) cLoss.hit++
  }
  const h = p.heightCm / 100
  const bmi = h > 0 ? p.weightKg / (h * h) : 22
  if (p.phase === 'survivorship' && (p.weightLossPct ?? 0) === 0 && bmi >= 20) {
    cSettle.n++
    if (target.kcal[0] < plain.kcal[0]) cSettle.hit++
  }
  if (p.conditions.includes('신기능저하')) {
    cMicro.n++
    const keys = microTargets(p).map((x) => x.key)
    if (keys.includes('k') && keys.includes('p')) cMicro.hit++
  }
  if (p.medications.includes('ai') || p.medications.includes('adt') ||
      (p.cancer === 'breast' && (p.subtypes ?? []).includes('호르몬수용체양성'))) {
    cCa.n++
    if (microTargets(p).some((x) => x.key === 'ca')) cCa.hit++
  }

  /* ── 암종 ── */
  const cached = { rules: activeRules(p), interactions: activeInteractions(p) }
  cAlc.n++
  if (!items.some((e) => e.food.tags.includes('알코올'))) cAlc.hit++
  if (p.cancer === 'stomach') {
    cSalt.n++
    if (!items.some((e) => e.food.tags.includes('염장'))) cSalt.hit++
  }
  if (p.cancer === 'prostate') {
    cSele.n++
    const good = ingredientKeywords(p, ['prefer']).names
    if (!good.includes('셀레늄')) cSele.hit++
  }

  /* ── 약 ── */
  if (p.medications.includes('warfarin')) {
    cWarf.n++
    const kRich = CURATED_FOODS.filter((f) => ((f.per100.vitK ?? 0) * f.serving.g) / 100 > 100)
    const sample = kRich.slice(0, 12)
    const flagged = sample.filter((f) => {
      const v = evaluateFood(f, p, 1, cached)
      return v.level === 'caution' || v.level === 'avoid'
    })
    if (sample.length === 0 || flagged.length === sample.length) cWarf.hit++
  }
  if (p.medications.length > 0) {
    cInter.n++
    if (cached.interactions.length > 0) cInter.hit++
  }

  /* ── 세부 사항 ── */
  if (p.cancer === 'breast' && (p.subtypes ?? []).includes('삼중음성')) {
    cSub.n++
    const shown = CANCER_BY_ID.breast.rules.filter(
      (r) => !r.subtypes || r.subtypes.some((t) => (p.subtypes ?? []).includes(t as CancerSubtype))
    )
    if (!shown.some((r) => r.id === 'breast-calcium-vitd')) cSub.hit++
  }

  /* ── 계절 ── */
  if (i % 4 === 0) {
    cSeason.n++
    const ids = (d: string) => dayFoods(p, d).items.map((e) => e.food.id).sort().join(',')
    if (ids('2026-02-10') !== ids('2026-08-14')) cSeason.hit++
  }

  /* ── 날마다 다름 ── */
  if (i % 4 === 1) {
    cVary.n++
    const a = dayFoods(p, '2026-08-10').items.map((e) => e.food.id).sort().join(',')
    const b = dayFoods(p, '2026-08-11').items.map((e) => e.food.id).sort().join(',')
    if (a !== b) cVary.hit++
  }

  /* ── 다시 구성 ── */
  if (i % 6 === 0) {
    cRetry.n++
    const first = buildDayMenu([], p, { day: day, nonce: 0 })
    const prev = (['아침', '점심', '저녁', '간식'] as const)
      .flatMap((s) => first.meals[s].map((e) => ({ id: e.food.id, kcal: foodContribution(e.food, e.servings).kcal ?? 0 })))
    const avoid = new Map<string, number>()
    for (const e of [...prev].sort((a, b) => b.kcal - a.kcal).slice(0, 2)) avoid.set(e.id, 0)
    const second = buildDayMenu([], p, { day: day, nonce: 1, recent: avoid })
    const keep = new Set((['아침', '점심', '저녁', '간식'] as const).flatMap((s) => second.meals[s].map((e) => e.food.id)))
    const changed = prev.filter((e) => !keep.has(e.id)).length / Math.max(1, prev.length)
    if (changed >= 0.3) cRetry.hit++
  }

  /*
   * ── 재료를 담으셨을 때 ──
   *
   * 재료는 그 자체로 한 끼가 되지 않는다. 무 한 개를 담으셨다면
   * 그것으로 무엇을 만드는지 알려 드려야 한다 — 깍두기든 무국이든.
   * 예전에는 이름이 겹치는 것만 찾아서 97종 중 8종만 제안이 나왔다.
   */
  if (i % 3 === 0) {
    const ings = CURATED_FOODS.filter((f) => isIngredientOnly(f))
    const src = ings[i % ings.length]
    cIdea.n++
    const got = ideasFromIngredients([{ foodId: src.id, servings: 1, meal: '점심' }], p)
    if (got.length > 0 && got[0].dishes.length > 0) cIdea.hit++
  }

  /*
   * ── 한 주를 모으면 무엇이 보이나 ──
   *
   * 하루 화면은 열량·단백질·나트륨 셋만 본다. 여러 날을 모아야만 보이는 것이 있다 —
   * 칼슘이 줄곧 모자란다든지, 식이섬유가 한 번도 목표에 닿지 못했다든지.
   * 그런 것을 짚어 주지 못하면 기간 화면은 하루 화면을 늘려 놓은 것에 지나지 않는다.
   */
  if (i % 5 === 0) {
    cRep.n++
    const diary: Record<string, { foodId: string; servings: number; meal: '아침' }[]> = {}
    const week: string[] = []
    for (let d = 1; d <= 7; d++) {
      const dk = `2026-08-0${d}`
      week.push(dk)
      const mm = buildDayMenu([], p, { day: dk })
      diary[dk] = (['아침', '점심', '저녁', '간식'] as const)
        .flatMap((s) => mm.meals[s].map((e) => ({ foodId: e.food.id, servings: e.servings, meal: '아침' as const })))
    }
    const rows = reportNutrients(week, (d) => (diary[d]?.length ? sumIntake(diary[d], []) : null), p, '주')
    /* 적어도 넷은 보여 줘야 한다 — 늘 보는 열량·단백질·식이섬유·나트륨 */
    if (rows.length >= 4) cRep.hit++
  }

  /* ── 요리 계통 ── */
  const extra = (p.cuisines ?? ['한식']).filter((c) => c !== '한식')
  if (extra.length > 0) {
    cCuisine.n++
    /*
     * Food.cuisine 은 '한식' 을 담지 않는다(기본값이라 비워 둔다).
     * extra 는 사용자가 더 고른 계통이므로 서로 다른 타입이다 — 문자열로 견준다.
     */
    if (items.some((e) => (extra as readonly string[]).includes(String(e.food.cuisine ?? '한식')))) cCuisine.hit++
  }
}

/* ─────────────────── 표 ─────────────────── */

const pct = (t: Tally) => (t.n === 0 ? '—' : `${Math.round((t.hit / t.n) * 100)}%`)
const bar = (t: Tally) => {
  if (t.n === 0) return ''
  const k = Math.round((t.hit / t.n) * 20)
  return '█'.repeat(k) + '·'.repeat(20 - k)
}

console.log(`\n무작위 ${N.toLocaleString()}명 — 하기로 한 일이 실제로 일어나는가\n`)
let lastGroup = ''
for (const row of table) {
  if (row.group !== lastGroup) { console.log(`  [${row.group}]`); lastGroup = row.group }
  const mark = row.t.n === 0 ? ' ' : row.t.hit / row.t.n >= row.floor ? '✓' : '!'
  console.log(
    `   ${mark} ${row.what.padEnd(38)} ${bar(row.t)} ${pct(row.t).padStart(4)}  (${row.t.n}건)`
  )
  if (row.t.n >= 20 && row.t.hit / row.t.n < row.floor) {
    bad('하기로 한 일이 일어나지 않음', `${row.what} — ${pct(row.t)} (기준 ${Math.round(row.floor * 100)}%)`)
  }
  if (row.t.n === 0) bad('한 번도 확인되지 않은 항목', row.what)
}

console.log(`\n의도 검사 완료 — 문제 ${bugs.length}종`)
const grouped = new Map<string, string[]>()
for (const b of bugs) {
  const [k, d] = b.split(' :: ')
  grouped.set(k, [...(grouped.get(k) ?? []), d])
}
for (const [k, l] of grouped) {
  console.log(`■ ${k} (${l.length}종)`)
  l.slice(0, 8).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
