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
import { SUPPLEMENTS } from '../../src/data/supplements'
import { evaluateFood, activeRules, activeInteractions } from '../../src/engine/rules'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { NutritionRule, CancerSubtype } from '../../src/data/types'
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

console.log(`\n규칙 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 5).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
