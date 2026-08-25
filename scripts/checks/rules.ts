/**
 * 일곱 번째 검사 — 임상 규칙 데이터.
 *
 * 이 앱의 판단은 전부 규칙에서 나온다. 규칙에 근거가 없거나, 출처가 실재하지 않거나,
 * 같은 음식을 두고 서로 반대로 말하면 화면의 모든 판정이 흔들린다.
 * 규칙 자체를 검사한 적이 없어 새로 만든다.
 */
import { COMMON_RULES } from '../../src/data/commonRules'
import { CONDITION_RULES } from '../../src/data/conditionRules'
import { INTERACTIONS, MEDICATIONS } from '../../src/data/interactions'
import { INGREDIENT_RULES } from '../../src/data/ingredientRules'
import { CANCERS } from '../../src/data/cancers'
import { REF_BY_ID } from '../../src/data/references'
import { BASE_EXERCISE, BONE_METS_NOTE, EXERCISE_BY_CANCER } from '../../src/data/exercise'
import { CURATED_FOODS, FOOD_BY_ID } from '../../src/data/foods'
import { readFileSync } from 'node:fs'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { evaluateFood, activeRules, activeInteractions } from '../../src/engine/rules'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { microTargets } from '../../src/engine/nutrition'
import { adviseSupplements } from '../../src/engine/supplementAdvice'
import type { NutritionRule, CancerSubtype, PatientContext, Phase } from '../../src/data/types'
import { SUBTYPE_OPTIONS } from '../../src/data/types'

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

/* ── 1. 규칙 한 건 한 건이 성한가 ────────────────── */
const allTags = new Set(CURATED_FOODS.flatMap((f) => f.tags as string[]))
const allGroups = new Set(CURATED_FOODS.map((f) => f.group as string))
const suppCats = new Set(SUPPLEMENTS.map((s) => s.category as string))
const ids = new Set<string>()
let ruleCount = 0

function checkRule(r: NutritionRule, where: string) {
  ruleCount++
  if (!r.id) { bad('규칙에 id 없음', `${where} ${r.title}`); return }
  if (ids.has(r.id)) bad('규칙 id 중복', r.id)
  ids.add(r.id)
  if (!r.title?.trim()) bad('규칙에 제목 없음', r.id)
  if (!r.reason?.trim()) bad('규칙에 설명 없음', `${r.id} ${r.title}`)
  if (r.reason && r.reason.length < 30) bad('규칙 설명이 너무 짧음', `${r.id}`)
  if (!['avoid', 'caution', 'prefer', 'info'].includes(r.level)) bad('규칙 등급 이상', `${r.id} ${r.level}`)
  if (!['A', 'B', 'C', 'G'].includes(r.evidence)) bad('근거 수준 이상', `${r.id} ${r.evidence}`)
  if (!r.refIds?.length) bad('규칙에 출처 없음', `${r.id} ${r.title}`)
  for (const ref of r.refIds ?? []) if (!REF_BY_ID[ref]) bad('없는 출처를 가리킴', `${r.id} → ${ref}`)

  const m = r.match ?? {}
  if (!m.tags?.length && !m.foodIds?.length && !m.groups?.length &&
      !m.supplementCategories?.length && !m.supplementIds?.length && !m.nutrient)
    bad('무엇에 걸리는지 없는 규칙', `${r.id} ${r.title}`)
  for (const t of m.tags ?? []) if (!allTags.has(t as string)) bad('쓰이지 않는 태그를 가리킴', `${r.id} → ${t}`)
  for (const g of m.groups ?? []) if (!allGroups.has(g as string)) bad('없는 식품군을 가리킴', `${r.id} → ${g}`)
  for (const g of m.restrictGroups ?? []) if (!allGroups.has(g as string)) bad('없는 식품군으로 한정', `${r.id} → ${g}`)
  for (const fid of m.foodIds ?? []) if (!FOOD_BY_ID[fid]) bad('없는 식품을 가리킴', `${r.id} → ${fid}`)
  for (const c of m.supplementCategories ?? []) if (!suppCats.has(c as string)) bad('없는 영양제 분류를 가리킴', `${r.id} → ${c}`)
  for (const sid of m.supplementIds ?? []) if (!SUPPLEMENTS.some((s) => s.id === sid)) bad('없는 영양제를 가리킴', `${r.id} → ${sid}`)
  if (m.nutrient) {
    if (!['>', '<'].includes(m.nutrient.op)) bad('성분 조건 연산자 이상', r.id)
    if (!Number.isFinite(m.nutrient.value)) bad('성분 조건 값 이상', r.id)
    if (!['serving', 'per100', 'day'].includes(m.nutrient.basis)) bad('성분 조건 기준 이상', r.id)
  }
}

for (const r of COMMON_RULES) checkRule(r, '공통')
for (const [cond, rules] of Object.entries(CONDITION_RULES)) for (const r of rules) checkRule(r, cond)
for (const c of CANCERS) for (const r of c.rules ?? []) checkRule(r, c.id)

/* ── 2. 상호작용 ─────────────────────────────── */
const medIds = new Set(MEDICATIONS.map((m) => m.id))
for (const it of INTERACTIONS) {
  if (!medIds.has(it.agent)) bad('없는 약제를 가리키는 상호작용', `${it.title} → ${it.agent}`)
  if (!it.title?.trim()) bad('상호작용에 제목 없음', it.agent)
  if (!it.reason?.trim()) bad('상호작용에 설명 없음', it.title)
  if (!['avoid', 'caution', 'prefer', 'info'].includes(it.level)) bad('상호작용 등급 이상', it.title)
  for (const ref of it.refIds ?? []) if (!REF_BY_ID[ref]) bad('상호작용이 없는 출처를 가리킴', `${it.title} → ${ref}`)
}
for (const m of MEDICATIONS) {
  if (!m.name?.trim()) bad('약제 이름 없음', m.id)
  if (!INTERACTIONS.some((i) => i.agent === m.id))
    bad('상호작용이 하나도 없는 약제', `${m.id} ${m.name} — 골라도 아무 일이 없다`)
}

/* ── 3. 성분 규칙(영양제) ────────────────────── */
for (const r of INGREDIENT_RULES) {
  if (!r.name?.trim()) bad('성분 규칙 이름 없음', JSON.stringify(r).slice(0, 40))
  if (!r.match?.length) bad('성분 규칙에 찾을 말이 없음', r.name)
  if (!r.reason?.trim()) bad('성분 규칙에 사유 없음', r.name)
  if (!r.refIds?.length) bad('성분 규칙에 출처 없음', r.name)
  for (const ref of r.refIds ?? []) if (!REF_BY_ID[ref]) bad('성분 규칙이 없는 출처를 가리킴', `${r.name} → ${ref}`)
  if (!['avoid', 'caution', 'prefer', 'info'].includes(r.base)) bad('성분 규칙 등급 이상', r.name)
}

/* ── 4. 같은 음식을 두고 반대로 말하지 않는가 ──── */
let conflicts = 0
for (const prof of CANCERS) {
  for (const ph of ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const) {
    const patient = { ...DEFAULT_PATIENT, onboarded: true, cancer: prof.id, phase: ph }
    const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
    for (const f of CURATED_FOODS) {
      const v = evaluateFood(f, patient, 1, cached)
      const levels = new Set(v.hits.map((h) => h.rule.level))
      // 같은 음식에 '피하세요'와 '권장'이 함께 걸리면 화면에서 무엇을 믿어야 할지 알 수 없다
      if (levels.has('avoid') && levels.has('prefer')) {
        conflicts++
        if (conflicts <= 5) {
          const a = v.hits.filter((h) => h.rule.level === 'avoid').map((h) => h.rule.id)
          const p = v.hits.filter((h) => h.rule.level === 'prefer').map((h) => h.rule.id)
          bad('한 음식에 피하세요와 권장이 함께 걸림', `${prof.id}/${ph} ${f.name} — ${a} vs ${p}`)
        }
      }
      // 판정이 있으면 근거도 있어야 한다
      if (v.level && v.hits.length === 0 && v.interactions.length === 0)
        bad('판정은 있는데 근거 규칙이 없음', `${prof.id} ${f.name} ${v.level}`)
    }
  }
}

/* ── 5. 출처 ─────────────────────────────────── */
const used = new Set<string>()
for (const r of [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(), ...CANCERS.flatMap((c) => c.rules ?? [])])
  for (const ref of r.refIds ?? []) used.add(ref)
for (const it of INTERACTIONS) for (const ref of it.refIds ?? []) used.add(ref)
for (const r of INGREDIENT_RULES) for (const ref of r.refIds ?? []) used.add(ref)
/*
 * 운동 처방도 출처를 단다. 이걸 빼고 세었더니 멀쩡히 쓰이는 문헌 일곱 건이
 * '쓰이지 않는 출처' 로 나왔다 — 데이터가 아니라 검사가 틀린 것이었다.
 */
for (const list of [BASE_EXERCISE, ...Object.values(EXERCISE_BY_CANCER).map((p) => p.items)])
  for (const e of list) for (const ref of e.refIds ?? []) used.add(ref)
for (const ref of BONE_METS_NOTE.refIds) used.add(ref)
/*
 * 미량영양소 기준도 문헌을 인용한다.
 * 규칙 목록에만 없다는 이유로 '안 쓰는 문헌' 이 되어서는 안 된다.
 * 조건이 걸려 있어 환자를 만들어 봐야 나온다.
 */
/*
 * 영양제 권고도 문헌을 인용한다. 조건이 맞는 분에게만 뜨므로
 * 환자를 만들어 봐야 어떤 문헌을 쓰는지 알 수 있다.
 */
for (const setup of [
  { conditions: ['위절제후'] },
  { medications: ['ppi'] },
  { medications: ['steroid'] },
  { medications: ['ai'] },
  { medications: ['cisplatin'], phase: 'during_chemo' },
  { medications: ['methotrexate'], phase: 'during_chemo' },
  { conditions: ['장루보유'] },
  { conditions: ['설사'] },
  { conditions: ['식욕부진'], phase: 'during_chemo' },
  { cancer: 'headneck', phase: 'during_rt' },
  { cancer: 'liver', subtypes: ['간경변동반'] },
  { weightKg: 38, heightCm: 160 },
  { conditions: ['체중감소'], weightLossPct: 12 }
] as any[]) {
  const p = { ...DEFAULT_PATIENT, conditions: [], medications: [], subtypes: [], ...setup } as PatientContext
  for (const a of adviseSupplements(p)) for (const ref of a.refIds) used.add(ref)
}

for (const setup of [
  { conditions: ['신기능저하'] },
  { conditions: ['위절제후'] },
  { conditions: [], medications: ['ai'] },
  { conditions: [], medications: ['adt'], cancer: 'prostate' }
] as any[]) {
  const p = { ...DEFAULT_PATIENT, ...setup } as PatientContext
  for (const m of microTargets(p)) for (const ref of m.refIds) used.add(ref)
}
for (const [id, ref] of Object.entries(REF_BY_ID)) {
  if (!ref.citation?.trim()) bad('출처에 인용 문구 없음', id)
  if (ref.url && !/^https?:\/\//.test(ref.url)) bad('출처 주소 형식 이상', `${id} ${ref.url}`)
}
/*
 * 성분값 출처(kind: 'db')는 규칙이 인용하는 것이 아니라
 * 이 앱에 실린 숫자가 어디서 왔는지를 밝히는 것이다. 화면에 나오면 된다.
 */
const orphan = Object.keys(REF_BY_ID).filter((id) => !used.has(id) && REF_BY_ID[id].kind !== 'db')
const dbRefs = Object.values(REF_BY_ID).filter((r) => r.kind === 'db')
if (dbRefs.length === 0) bad('성분값 출처가 하나도 없음', '숫자가 어디서 왔는지 밝힐 곳이 없다')

console.log(`  규칙 ${ruleCount}건 · 상호작용 ${INTERACTIONS.length}건 · 성분규칙 ${INGREDIENT_RULES.length}건 · 출처 ${Object.keys(REF_BY_ID).length}건`)
console.log(`  쓰이지 않는 출처 ${orphan.length}건${orphan.length ? ` (${orphan.slice(0, 4).join(', ')}…)` : ''}`)
/*
 * 인용되지 않는 문헌이 남아 있으면, 넣어 두고 화면에 쓰지 않은 내용이 있다는 뜻이다.
 * 실제로 뼈 전이 운동 권고가 그랬다 — 문헌만 있고 안내가 없어,
 * 가장 조심해야 할 분들이 아무 말도 듣지 못하고 있었다.
 */
for (const id of orphan) bad('아무 데서도 인용하지 않는 문헌', `${id} — 넣어 두고 안 쓰는 내용이 있다는 뜻이다`)

/* ─────────────────── 암종 세부 변수 ───────────────────
 *
 * 세부 변수로 갈리는 규칙이 엉뚱한 분께 뜨는지 본다.
 * 삼중음성 환자에게 "아로마타제 억제제를 쓰는 동안 칼슘을 챙기세요" 가 뜨던 것이
 * 이 검사를 만든 이유다. 해당 없는 말이 섞이면 나머지 말의 무게까지 같이 떨어진다.
 */
{
  const declared = new Set<string>()
  for (const opts of Object.values(SUBTYPE_OPTIONS)) for (const o of opts ?? []) declared.add(o.id)

  for (const c of CANCERS) {
    const opts = SUBTYPE_OPTIONS[c.id] ?? []
    for (const r of c.rules) {
      for (const t of r.subtypes ?? []) {
        if (!declared.has(t)) bad('없는 세부 변수를 가리키는 규칙', `${c.id}/${r.id} → ${t}`)
        else if (!opts.some((o) => o.id === t))
          bad('다른 암종의 세부 변수를 쓰는 규칙', `${c.id}/${r.id} → ${t} (${c.id}에서 고를 수 없음)`)
      }
    }
    // 고를 수 있게 해 놓고 아무 규칙도 안 바뀌면, 물어볼 이유가 없는 질문이다
    for (const o of opts) {
      const used = c.rules.some((r) => (r.subtypes ?? []).includes(o.id))
      if (!used) bad('묻기만 하고 쓰이지 않는 세부 변수', `${c.id} → ${o.id}`)
    }
  }

  // 실제로 걸러지는지 — 골라 봤을 때와 안 골랐을 때를 견준다
  const idsFor = (cancer: any, subtypes: CancerSubtype[]) =>
    new Set(
      activeRules({ ...DEFAULT_PATIENT, cancer, subtypes, onboarded: true } as any).map(
        (h) => h.rule.id
      )
    )
  const none = idsFor('breast', [])
  const tnbc = idsFor('breast', ['삼중음성'])
  const hr = idsFor('breast', ['호르몬수용체양성'])
  if (tnbc.has('breast-calcium-vitd'))
    bad('세부 변수가 걸러지지 않음', '삼중음성인데 아로마타제 억제제 골밀도 안내가 뜬다')
  if (!hr.has('breast-calcium-vitd'))
    bad('세부 변수가 지나치게 걸러짐', '호르몬 수용체 양성인데 골밀도 안내가 빠졌다')
  if (!none.has('breast-calcium-vitd'))
    bad('안 고르면 빠져 버림', '세부 사항을 안 고르셨는데 안내가 사라졌다 — 보여 주는 쪽이 맞다')
  if (!tnbc.has('breast-tnbc-focus'))
    bad('세부 변수 전용 규칙이 안 뜸', '삼중음성 전용 안내가 뜨지 않는다')
  if (hr.has('breast-tnbc-focus'))
    bad('세부 변수가 걸러지지 않음', '호르몬 수용체 양성인데 삼중음성 전용 안내가 뜬다')

  const adtOff = idsFor('prostate', [])
  const stomachTotal = idsFor('stomach', ['위전절제'])
  const stomachPart = idsFor('stomach', ['위부분절제'])
  if (!adtOff.has('prostate-adt-bone')) bad('안 고르면 빠져 버림', '전립선암 ADT 골밀도 안내가 사라졌다')
  if (stomachPart.has('stomach-b12')) bad('세부 변수가 걸러지지 않음', '위 부분절제인데 전절제용 B12 안내가 뜬다')
  if (stomachTotal.has('stomach-b12-partial'))
    bad('세부 변수가 걸러지지 않음', '위 전절제인데 부분절제용 B12 안내가 뜬다')

  console.log(`  세부 변수 ${declared.size}종 · 이를 쓰는 규칙 ${CANCERS.reduce((n, c) => n + c.rules.filter((r) => r.subtypes).length, 0)}건`)
}

/* ─────────────────── 미량영양소 기준 ─────────────────── */

/*
 * 열량·단백질·식이섬유·나트륨 밖의 기준은 조건이 맞는 분에게만 뜬다.
 * 여기서 보는 것은 세 가지다.
 *  1) 해당 사항이 없는 분께 괜히 뜨지 않는가 — 늘 넷만 보던 화면이 갑자기 길어지면 안 된다
 *  2) 각 기준이 문헌을 달고 있는가
 *  3) 세겠다고 한 영양소를 음식이 실제로 갖고 있는가 — 값이 없으면 세는 시늉만 하게 된다
 */
{
  const plain = { ...DEFAULT_PATIENT, conditions: [], medications: [] } as PatientContext
  if (microTargets(plain).length > 0)
    bad('해당 없는 분께 미량영양소 기준이 뜸', microTargets(plain).map((m) => m.label).join('·'))

  const setups: [string, Partial<PatientContext>][] = [
    ['신기능저하', { conditions: ['신기능저하'] }],
    ['위절제후', { conditions: ['위절제후'] }],
    ['아로마타제 억제제', { medications: ['ai'] }],
    ['ADT', { cancer: 'prostate', medications: ['adt'] }]
  ]
  for (const [label, setup] of setups) {
    const p = { ...DEFAULT_PATIENT, conditions: [], medications: [], ...setup } as PatientContext
    const ts = microTargets(p)
    if (ts.length === 0) { bad('기준이 떠야 하는데 안 뜸', label); continue }
    for (const m of ts) {
      if (m.min === undefined && m.max === undefined) bad('위아래가 다 없는 기준', `${label} ${m.label}`)
      if (m.min !== undefined && m.max !== undefined && m.min >= m.max)
        bad('하한이 상한보다 큰 기준', `${label} ${m.label} ${m.min}~${m.max}`)
      if (m.refIds.length === 0) bad('문헌 없는 미량영양소 기준', `${label} ${m.label}`)
      for (const id of m.refIds) if (!REF_BY_ID[id]) bad('없는 문헌을 가리킴', `${label} ${m.label} → ${id}`)

      /*
       * 값이 있는 음식이 너무 적으면 합계가 늘 실제보다 적게 나온다.
       * "기준 안에 있습니다" 라고 안심시켜 놓고 사실이 아닌 것이 가장 나쁘다.
       */
      const have = CURATED_FOODS.filter((f) => typeof f.per100[m.key] === 'number').length
      const pct = Math.round((have / CURATED_FOODS.length) * 100)
      if (pct < 70) bad('값이 너무 적은 영양소를 셈', `${label} ${m.label} — 음식의 ${pct} % 만 값이 있다`)
    }
  }
}

/* ─────────────────── 문장이 전제하는 시기 ─────────────────── */

/*
 * "치료 중에는 단백질을 평소보다 더 챙겨야 합니다" 가 치료를 마치신 분께 떴다.
 *
 * 규칙은 언제 뜰지를 phases 로 정하는데, 문장은 그와 따로 놀 수 있다.
 * 어느 시기에나 뜨는 규칙이 제목에서 "치료 중" 이라고 못박으면,
 * 그 시기가 아닌 분께는 사실이 아닌 말이 된다.
 * 체중 관리처럼 시기에 따라 권고가 뒤집히는 주제에서는 정반대로 읽히기까지 한다 —
 * 치료를 마치고 감량이 권고인 분께 "무리한 감량은 근육부터 빠진다" 고 하던 것이 그랬다.
 *
 * 고치는 길은 둘이다. phases 로 그 시기에만 뜨게 하거나,
 * 문장에서 다른 시기도 함께 말하거나. 둘 중 아무것도 하지 않은 것을 찾는다.
 */
{
  const PREMISE: { re: RegExp; label: string; ok: Phase[] }[] = [
    { re: /치료\s*중(에|에는|이라면|이면|인)/, label: '치료 중', ok: ['during_rt', 'during_chemo', 'neutropenia'] },
    { re: /방사선치료\s*중/, label: '방사선치료 중', ok: ['during_rt'] },
    { re: /항암(치료|화학요법)\s*중/, label: '항암 중', ok: ['during_chemo', 'neutropenia'] },
    { re: /수술\s*직후/, label: '수술 직후', ok: ['post_op'] },
    { re: /치료(가|를)?\s*(끝난|마친|마치신|종료)/, label: '치료 종료 후', ok: ['survivorship'] }
  ]
  /*
   * 두 시기를 함께 적어 두었으면 어느 쪽에도 맞는다 —
   * "치료 기간과 그 이후 모두", "치료 중이라면 …, 치료를 마치셨더라도 …" 같은 것.
   */
  const SPANS_BOTH = [
    /치료\s*기간과\s*그\s*이후/,
    /치료\s*중[\s\S]{0,220}(마친|마치셨|끝난|종료)/,
    /(마친|마치신|끝난|종료)[\s\S]{0,220}치료\s*중/,
    /받는\s*동안에도[\s\S]{0,120}(마친|뒤)/,
    /어느\s*시기/
  ]

  const everyRule: { r: NutritionRule; src: string }[] = [
    ...COMMON_RULES.map((r) => ({ r, src: '공통' })),
    ...CANCERS.flatMap((c) => c.rules.map((r) => ({ r, src: c.name }))),
    ...Object.entries(CONDITION_RULES).flatMap(([k, v]) => (v ?? []).map((r) => ({ r, src: `증상:${k}` })))
  ]

  for (const { r, src } of everyRule) {
    const text = `${r.title} ${r.reason}`
    if (SPANS_BOTH.some((re) => re.test(text))) continue
    const phases = (r.phases ?? []).filter((p) => p !== 'all')
    for (const p of PREMISE) {
      if (!p.re.test(text)) continue
      const covered = phases.length > 0 && phases.every((ph) => p.ok.includes(ph))
      if (covered) continue
      bad('문장은 시기를 못박는데 그 시기로 제한하지 않음', `${src} ${r.id} — '${p.label}' · ${r.title}`)
    }
  }
}

/* ─────────────────── 결핍이 예상되는 상황 ─────────────────── */

/*
 * 식품 자료에 값이 없는 영양소가 많다 — 비타민 D 9 %, B12 13 %, 아연 25 %.
 * 값이 없다고 아무 말도 하지 않는 것과, 셀 수 없으니 상황을 보고 말하는 것은 다르다.
 * 검사 수치로 나타나는 결핍은 대개 드시는 것이 아니라 약과 잘라 낸 장기에서 온다.
 *
 * 여기 적힌 상황에서 아무 말도 나오지 않으면, 그건 앱이 침묵하기로 한 것이 아니라
 * 잊어버린 것이다. 나중에 규칙을 고치다 조용히 사라지는 일이 없도록 못 박아 둔다.
 */
{
  const SHOULD: [string, Partial<PatientContext>, RegExp][] = [
    ['위 절제 후 · B12', { conditions: ['위절제후'] }, /B12/],
    ['위 절제 후 · 철분', { conditions: ['위절제후'] }, /철분/],
    ['위산분비억제제 · B12', { medications: ['ppi'] }, /B12/],
    ['위산분비억제제 · 마그네슘', { medications: ['ppi'] }, /마그네슘/],
    ['스테로이드 · 칼슘', { medications: ['steroid'] }, /칼슘/],
    ['스테로이드 · 비타민 D', { medications: ['steroid'] }, /비타민 D/],
    ['항호르몬 · 칼슘', { medications: ['ai'] }, /칼슘/],
    ['장루 · 마그네슘아연', { conditions: ['장루보유'] }, /마그네슘·아연/],
    ['두경부 방사선 · 아연', { cancer: 'headneck', phase: 'during_rt' }, /아연/],
    ['간경변 · 비타민 D', { cancer: 'liver', subtypes: ['간경변동반'] }, /비타민 D/],
    ['심한 저체중 · 티아민', { weightKg: 38, heightCm: 160 }, /티아민/]
  ]
  for (const [label, setup, want] of SHOULD) {
    const p = {
      ...DEFAULT_PATIENT, conditions: [], medications: [], subtypes: [], ...setup
    } as PatientContext
    const hits = adviseSupplements(p).filter((a) => want.test(a.title))
    if (hits.length === 0) { bad('결핍이 예상되는데 아무 말도 없음', label); continue }
    for (const h of hits) {
      if (h.refIds.length === 0) bad('문헌 없는 영양제 권고', `${label} — ${h.title}`)
      for (const id of h.refIds) if (!REF_BY_ID[id]) bad('없는 문헌을 가리킴', `${label} → ${id}`)
      /*
       * 권하면서 그 분류에 내놓을 제품이 하나도 없으면 화면이 빈 채로 남는다.
       * 실제로 셀레늄이 걸러지면서 '아연·미네랄' 이 통째로 비던 적이 있다.
       */
      if (h.products.length === 0) bad('권했는데 보여 줄 제품이 없음', `${label} — ${h.category}`)
    }
  }

  /* 해당 사항이 없는 분께 이것들이 뜨면 안 된다 */
  const plain = {
    ...DEFAULT_PATIENT, cancer: 'breast', phase: 'survivorship',
    conditions: [], medications: [], subtypes: [], weightKg: 60, heightCm: 165, weightLossPct: 0
  } as PatientContext
  for (const a of adviseSupplements(plain)) {
    if (/티아민|마그네슘·아연/.test(a.title))
      bad('해당 없는 분께 결핍 권고가 뜸', `${a.title}`)
  }
}

/* ─────────────────── 약제·증상 id 오타 ─────────────────── */

/*
 * 약은 화면에 보이는 이름이 아니라 id 로 저장된다('ai', 'cisplatin').
 * 코드에서 실수로 표시 이름을 적으면 그 가지는 영원히 실행되지 않는다.
 * 조용히 아무 일도 일어나지 않으므로 눈으로는 찾기 어렵다.
 *
 * 실제로 microTargets 에서 '아로마타제 억제제' 라고 적어 두어,
 * 아로마타제 억제제를 드시는 분께 칼슘 기준이 한 번도 뜨지 않았다.
 * 게다가 내가 만든 시험도 같은 이름을 넣어 통과했다 —
 * 시험이 통과했다는 것이 동작한다는 뜻은 아니었다.
 */
{
  /*
   * import.meta.url 은 jiti 가 CJS 로 바꾸면서 엉뚱한 곳을 가리킨다.
   * 검사가 빈 문자열을 읽고 조용히 통과했다 — 검사도 검사받아야 한다.
   * 실행 위치(저장소 뿌리)에서 곧장 찾는다.
   */
  const FILES = [
    'src/engine/supplementAdvice.ts',
    'src/engine/nutrition.ts',
    'src/engine/menu.ts',
    'src/engine/rules.ts'
  ]
  const src = FILES.map((f) => [f, readFileSync(f, 'utf8')] as const)
  for (const [f, text] of src) if (text.length === 0) bad('검사가 원본을 읽지 못함', f)

  for (const [file, text] of src) {
    for (const m of MEDICATIONS) {
      /*
       * 주석에는 약 이름이 나와도 된다. includes 로 견주는 것만 본다.
       *
       * 처음에는 'medications' 라는 낱말이 앞에 있는 경우만 찾았는데,
       * 정작 문제였던 코드는 `meds.includes(...)` 라 그물에 걸리지 않았다.
       * 받는 쪽 이름은 무엇이든 될 수 있으니 이름 쪽만 본다.
       * 증상·세부 사항은 실제로 한국어로 저장되지만 약 이름과 겹치는 것이 없다.
       */
      const re = new RegExp(`includes\\(\\s*'${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g')
      if (re.test(text)) bad('약을 id 가 아니라 이름으로 견줌', `${file} — '${m.name}' 은 id '${m.id}' 로 저장된다`)
    }
  }
}

console.log(`\n규칙 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 5).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')