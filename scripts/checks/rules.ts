/**
 * 일곱 번째 검사 — 임상 규칙 데이터.
 *
 * 이 앱의 판단은 전부 규칙에서 나온다. 규칙에 근거가 없거나, 출처가 실재하지 않거나,
 * 같은 음식을 두고 서로 반대로 말하면 화면의 모든 판정이 흔들린다.
 * 규칙 자체를 검사한 적이 없어 새로 만든다.
 */
import { COMMON_RULES } from '../../src/data/commonRules'
import { CONDITION_RULES } from '../../src/data/conditionRules'
import { INTERACTIONS, MEAL_TIMING, MEDICATIONS, mealTimingFor, normalizeMedications, toggleMedication, visibleMedications } from '../../src/data/interactions'
import { INGREDIENT_RULES } from '../../src/data/ingredientRules'
import { CANCERS } from '../../src/data/cancers'
import { ALL_REFERENCES, REF_BY_ID } from '../../src/data/references'
import { BASE_EXERCISE, BONE_METS_NOTE, EXERCISE_BY_CANCER, INTAKE_EXERCISE_ADVICE } from '../../src/data/exercise'
import { CURATED_FOODS, FOOD_BY_ID } from '../../src/data/foods'
import { GENERATED_CORE } from '../../src/data/foods/generated'
import { readFileSync, readdirSync } from 'node:fs'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { evaluateFood, activeRules, activeInteractions, howToLines } from '../../src/engine/rules'
import { buildDayMenu, dayNotes } from '../../src/engine/menu'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { microTargets } from '../../src/engine/nutrition'
import { adviseSupplements } from '../../src/engine/supplementAdvice'
import type { NutritionRule, CancerSubtype, PatientContext, Phase } from '../../src/data/types'
import { SUBTYPE_OPTIONS, SOURCE_PER_SERVING } from '../../src/data/types'
import ts from 'typescript'

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

/* ── 1. 규칙 한 건 한 건이 성한가 ────────────────── */
/*
 * 태그는 손으로 등록한 음식에만 있는 것이 아니다.
 * 받아 온 자료에는 이름을 보고 붙이는 것이 있고(data/foods/autoTag.ts),
 * '생식동물성' 처럼 거기에만 있는 태그도 있다.
 * 손으로 등록한 것만 세면 그런 태그를 "아무 데도 안 쓰는 태그" 로 잘못 본다.
 */
const allTags = new Set([
  ...CURATED_FOODS.flatMap((f) => f.tags as string[]),
  ...GENERATED_CORE.flatMap((f) => f.tags as string[])
])
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
  /*
   * 골랐을 때 달라지는 것이 하나는 있어야 한다. 음식 상호작용만 세면 엑스탄디·자이티가·뉴베카가 걸린다 —
   * 이 약들은 자몽이 아니라 복용 시점(빈속·음식과 함께)과 세인트존스워트가 문제인 약이다.
   */
  const does = INTERACTIONS.some((i) => i.agent === m.id) ||
    MEAL_TIMING.some((t) => t.med === m.id) ||
    INGREDIENT_RULES.some((r) => r.byMedication && m.id in r.byMedication)
  if (!does) bad('상호작용이 하나도 없는 약제', `${m.id} ${m.name} — 골라도 아무 일이 없다`)
  if (m.parent && !MEDICATIONS.some((x) => x.id === m.parent && !x.parent)) bad('윗칸이 없는 아랫칸 약', `${m.id} → ${m.parent}`)
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

/* ── 4-b. 근거 등급이 인용한 것과 맞는가 ────────────────
 *
 * 원문 대조에서 두 가지가 드러났다.
 *
 * 하나, 환자 5명의 교차설계를 인용하면서 등급을 'B'(대규모 전향적 코호트) 로 매겨 두었다.
 * 둘, 셀레늄 규칙이 SELECT 본 논문에만 출처를 달고, 정작 그 논문에 없는 사후 분석 결과를 말하고 있었다.
 *
 * 사람 눈으로 다시 훑는 대신 여기서 붙잡는다. 잣대는 출처에 적어 둔 연구 종류(kind) 다 —
 * 규칙이 스스로 매긴 등급이 아니라 **인용한 것** 을 본다.
 */
const KIND_MAX: Record<string, string[]> = {
  /* 무작위배정 시험·메타분석이면 A 까지, 코호트면 B 까지 */
  rct: ['A', 'B', 'C', 'G'],
  meta: ['A', 'B', 'C', 'G'],
  cohort: ['B', 'C', 'G'],
  /*
   * 종설은 'G' 를 달 수 없다. G 는 '주요 학회 지침 합의' 를 뜻하는데,
   * 단독저자 초청 종설을 그 자리에 놓으면 없는 권위를 만들어 낸다 —
   * 실제로 위절제 규칙 여섯 건이 그렇게 올라가 있었다.
   */
  review: ['C'],
  /* 증례 보고·세포·동물 실험 — 사람 집단의 근거가 아니다 */
  case: ['C'],
  preclinical: ['C'],
  guideline: ['G', 'A', 'B', 'C'],
  db: ['C', 'G']
}
for (const r of [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(),
                 ...CANCERS.flatMap((c) => c.rules ?? []), ...INTERACTIONS] as {
                   id: string; evidence: string; refIds?: string[] }[]) {
  const kinds = (r.refIds ?? []).map((id) => REF_BY_ID[id]?.kind).filter(Boolean) as string[]
  if (kinds.length === 0) continue
  /* 인용한 것 가운데 가장 센 종류가 이 등급을 허용하는가 */
  const ok = kinds.some((k) => (KIND_MAX[k] ?? ['A', 'B', 'C', 'G']).includes(r.evidence))
  if (!ok) {
    bad('근거 등급이 인용한 연구 종류와 맞지 않음',
        `${r.id} — 등급 ${r.evidence} 인데 인용은 ${kinds.join('/')} 뿐이다`)
  }
}

/* ── 4-c. 인용이 주장을 뒷받침하는가 (손으로 확인한 것만) ──
 *
 * 원문 대조에서 같은 실수가 세 번 나왔다 — 셀레늄, 비브리오, 칼슘, 식도염 시점,
 * 그리고 ESPEN 인용 다섯 건. 모두 "그 문헌이 그 말을 하지 않는" 경우였다.
 *
 * 이것은 자동으로 잡을 수 없다. 문헌을 읽어야 알 수 있기 때문이다.
 * 대신 **이미 읽고 확인한 것** 을 여기에 못 박아, 나중에 누가 되돌리면 걸리게 한다.
 * 아래 짝은 사람이 원문을 읽고 손으로 적은 것이다.
 */
const MUST_NOT_CITE: [string, string, string][] = [
  ['crc-lowresidue', 'espen2021', "ESPEN 두 판 전문에 '섬유' 가 0건이다"],
  ['cond-stoma-fiber', 'espen2021', "ESPEN 두 판 전문에 '섬유' 가 0건이다"],
  ['stomach-small-meals', 'espen2021', 'ESPEN 에 소량 다회 권고가 없다'],
  ['stomach-b12', 'espen2021', "ESPEN 두 판 전문에 'B12' 가 0건이다"],
  ['panc-fat-symptom', 'espen2021', 'ESPEN 에 췌장 효소·지방 분할 권고가 없다'],
  ['liver-raw-seafood', 'easl-nutrition', 'EASL 영양 지침에 비브리오·생식 언급이 0건이다'],
  ['prostate-selenium', 'select2011-only', '기저 셀레늄 사후분석은 Kristal 2014 다'],
  /*
   * ASCO 2022(Ligibel) 전문 대조. 제목 그대로 '치료 중' 지침이고,
   * 보충제·악액질·영양실조는 범위에서 명시적으로 뺐으며, 내분비요법 중 유방암 환자도 대상이 아니다.
   * 식이 중재와 체중 개입에는 둘 다 '근거 불충분' 을 냈다.
   */
  ['common-antioxidant-rt', 'asco2022', 'ASCO 2022 는 보충제를 범위에서 뺐다'],
  ['common-vegetables', 'asco2022', "ASCO 2022 는 치료 중 식이 중재에 '근거 불충분' 을 냈다"],
  ['common-protein', 'asco2022', 'ASCO 2022 는 단백질 목표를 제시하지 않는다'],
  ['breast-weight', 'asco2022', "ASCO 2022 는 '치료 중' 지침이고 내분비요법 중 유방암을 대상에서 뺐다"],
  ['gyn-obesity', 'asco2022', "ASCO 2022 는 '치료 중' 지침이라 생존기 체중 권고의 출처가 아니다"],
  ['crc-fiber', 'vanblarigan2018', 'CALGB 89803 은 섬유의 용량-반응을 보고하지 않는다'],
  /* ERAS 지침에 장루 식이·섬유 이야기는 없다 — 그 지침이 다루는 것은 수술 전후 관리 항목이다 */
  ['cond-stoma-fiber', 'eras-colorectal', 'ERAS 대장수술 지침에 장루 식이 내용이 없다'],
  /*
   * ACCP 2012 전문 대조. 이 지침은 비타민 K 길항제 관리 지침이다 —
   * omega·fish oil·ginseng 이 0건이고 DOAC 은 다루지 않는다.
   * 그리고 카페시타빈 증례 보고와 서로 뒤바뀌어 달려 있었다.
   */
  ['int-warfarin-vitk', 'capecitabine-warfarin', '비타민 K 규칙에 카페시타빈 증례가 달려 있었다'],
  ['int-warfarin-omega3', 'warfarin-vitk', 'ACCP 2012 전문에 omega·fish oil 이 0건이다'],
  ['int-doac-omega3', 'warfarin-vitk', 'ACCP 2012 는 DOAC 을 다루지 않는다'],
  /* ESPEN 두 판에 'B12' 는 0건이다 — 전절제 쪽에서 뗐는데 부분절제 쪽에 남아 있었다 */
  ['stomach-b12-partial', 'espen2021', "ESPEN 두 판 전문에 'B12' 가 0건이다"],
  /*
   * MASCC/ISOO 2020 전문 대조. 이 지침은 중재만 다룬다 —
   * spicy·acidic·citrus·food·texture·soft·temperature·caffeine·alcohol 이 모두 0건이다.
   * 식이 중재는 검토했으나 "근거 불충분·상충으로 권고를 낼 수 없었다"고 적는다.
   */
  ['eso-rough', 'mascc-mucositis', 'MASCC 전문에 음식 질감 언급이 0건이다'],
  ['hn-soft-moist', 'mascc-mucositis', 'MASCC 전문에 soft·texture·temperature 가 0건이다'],
  ['hn-dry-mouth', 'mascc-mucositis', 'MASCC 전문에 caffeine·alcohol·xerostomia 가 0건이다']
]
/*
 * 읽지 못한 문헌은 근거가 아니다.
 * NCCN Survivorship 은 구독자용 문서라 이 작업에서 원문을 열어 대조할 수 없었다.
 * 여덟 자리를 공개 문헌으로 갈아 끼웠으니, 다시 들어오지 못하게 막아 둔다.
 */
{
  const src = [
    'src/data/commonRules.ts', 'src/data/conditionRules.ts', 'src/data/interactions.ts',
    'src/data/references.ts', 'src/engine/supplementAdvice.ts', 'src/engine/nutrition.ts'
  ]
  const dir = 'src/data/cancers'
  const files = [...src, ...readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => `${dir}/${f}`)]
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    if (/'nccn-survivorship'/.test(text)) {
      bad('원문을 읽을 수 없는 문헌이 다시 인용됨', `${f} — NCCN Survivorship 은 구독자용이라 대조할 수 없다`)
    }
  }
}

const ALL_RULES = [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(),
                   ...CANCERS.flatMap((c) => c.rules ?? []), ...INTERACTIONS] as {
                     id: string; refIds?: string[] }[]
for (const [rid, refId, why] of MUST_NOT_CITE) {
  if (refId.endsWith('-only')) continue
  const r = ALL_RULES.find((x) => x.id === rid)
  if (!r) { bad('확인해 둔 규칙이 사라짐', rid); continue }
  if ((r.refIds ?? []).includes(refId)) {
    bad('원문이 그 말을 하지 않는 문헌을 다시 인용함', `${rid} → ${refId} (${why})`)
  }
}
/* 반대로, 원문을 읽고 붙인 출처가 빠지지 않았는가 */
const MUST_CITE: [string, string][] = [
  ['prostate-selenium', 'kristal2014'],
  ['liver-raw-seafood', 'vibrio-meta2019'],
  /* Fearon 2011 정의(구독제·초록만) → 그 기준 표를 옮긴 원문 공개 종설 Tan 2014(2026-10-14 전수 대조) */
  ['lung-cachexia', 'tan2014-panc-cachexia'],
  ['panc-fat-symptom', 'ueg-pei2025'],
  /* 알코올 수치의 실제 출처 — IARC·WCRF 는 분류와 권고를 말하지 이 숫자를 말하지 않는다 */
  ['breast-alcohol', 'hamajima2002'],
  ['eso-alcohol', 'brooks2009aldh2'],
  ['prostate-adt-bone', 'smith2001adt'],
  ['common-antioxidant-rt', 'meyer2008smoking'],
  ['hn-antioxidant', 'meyer2008smoking'],
  /* ASCO 2022 권고 2.2 는 호중구감소증 식단을 정면으로 권고하지 않는다 — 지침급 뒷받침이라 붙여 둔다 */
  ['common-neutropenic-diet-myth', 'asco2022'],
  /* ADT 중 단백질 목표는 ESPEN 몫, 저항운동 근거는 Galvão 무작위배정 시험이었다 —
     Galvão(구독제·초록만)를 포함한 원문 공개 메타분석 Shao 2022 로 바꿨다(2026-10-14 전수 대조) */
  ['prostate-adt-protein', 'espen2021'],
  ['prostate-adt-protein', 'shao2022-adt-exercise'],
  /* 카페시타빈 증례를 실제로 보고한 문헌이 그 규칙에 없었다 — Copur 2001(구독제·초록만) 대신
     Copur 두 증례를 포함해 6건을 표로 정리한 원문 공개 증례·문헌고찰과 허가사항으로 못 박는다(2026-10-14 전수 대조) */
  ['int-capecitabine-warfarin', 'althiab2021-cape-warf'],
  ['int-capecitabine-warfarin', 'fda-label-capecitabine'],
  ['int-warfarin-ginger', 'warfarin-vitk'],
  ['cond-nau-ginger', 'warfarin-vitk'],
  /* 확인되지 않는 출처를 뺀 자리에 실제 한국 자료를 넣었다 */
  ['stomach-salted', 'yoo2020pickled'],
  ['stomach-kimchi', 'kimhj2010veg'],
  ['stomach-kimchi', 'kim2010saltpref'],
  /* VITAL 을 인용해 두고 본문에서 말하지 않고 있었다 */
  ['crc-vitd', 'manson2019'],
  ['liver-coffee', 'iarc116'],
  ['cond-stoma-fiber', 'ileostomy-diet-review'],
  /* 위절제 후 B12 결핍의 빈도를 실제로 말하는 것은 이 메타분석뿐이다 — 원 메타분석(구독제·초록만)의 2,627명·48.8 % 를
     옮긴 원문 공개 종설 Tan 2024 로 바꿨다(2026-10-14 전수 대조) */
  ['stomach-b12', 'tan2024-ugi-micro'],
  /* 부분절제는 이 메타분석(전절제 위주)이 아니라 부분절제 수치를 직접 적은 원문(park2023b12)으로 — 2026-10-14 전수 대조 */
  ['stomach-b12-partial', 'park2023b12'],
  ['cond-gx-b12', 'tan2024-ugi-micro'],
  /* 두경부 항산화 시험(Bairati 2005, 구독제·초록만)의 숫자를 옮긴 원문 공개 종설 — 2026-10-14 전수 대조 */
  ['common-antioxidant-rt', 'meliante2023-hnc-antiox'],
  ['hn-antioxidant', 'meliante2023-hnc-antiox'],
  /* 호중구감소증 식단 메타분석 — Sonbol 2019(구독제·초록만) 대신 원문 공개 Ma 2022 */
  ['common-neutropenic-diet-myth', 'ma2022-neutropenic-diet']
]
for (const [rid, refId] of MUST_CITE) {
  const r = ALL_RULES.find((x) => x.id === rid)
  if (!r) { bad('못 박아 둔 규칙이 사라졌거나 이름이 바뀜', `${rid} → ${refId}`); continue }
  if (!(r.refIds ?? []).includes(refId)) {
    bad('원문 대조로 붙여 둔 출처가 빠짐', `${rid} 에 ${refId} 가 없다`)
  }
}

/*
 * 원문을 읽고 고친 수치는 되돌아가지 못하게 문장으로도 못 박는다.
 * 숫자 하나가 바뀌면 임상 판단이 바뀐다.
 */
const MUST_SAY: [string, RegExp, string][] = [
  ['breast-alcohol', /7\.1 %/, '집단 재분석의 값은 7.1 %(95 % CI 5.5~8.7)다. 7~10 % 는 상한이 신뢰구간을 넘었다'],
  ['eso-alcohol', /3\.7~18\.1/, '오즈비 범위를 밝힌다. 수 배~수십 배는 뭉뚱그린 말이었다'],
  ['prostate-selenium', /91 %/, '사후 분석의 값은 91 % 증가·P=0.007 이다'],
  ['liver-raw-seafood', /53\.9 %/, '간질환군의 값과 전체 값을 나누어 적는다'],
  ['prostate-adt-bone', /3\.3 %/, '무작위 시험의 값은 요추 3.3 %·고관절 1.8 % 다. 연 2~5 % 는 상한이 근거를 넘었다'],
  ['common-sodium', /3,255 mg/, '국민건강영양조사 2018년 값이다. 1.5배는 어림이었다'],
  /*
   * FDA 는 생 새싹채소를 '생채소는 씻으면 된다' 의 예외로 못 박는다.
   * 이 예외가 없어서 호중구가 낮은 분께 브로콜리 새싹이 권장으로 나가고 있었다.
   */
  ['cond-neut-raw', /새싹채소/, '생 새싹은 씻어서 해결되지 않는다는 FDA 예외를 적는다'],
  ['cond-neut-raw', /2시간/, 'FDA 의 시간 기준이다. "오래" 로는 실행할 수 없다'],
  /*
   * 항산화제 규칙의 핵심은 '흡연자에서만' 이다. 비흡연자의 위험비는 1에 가까웠다.
   * 뭉뚱그리면 끊으신 분께는 겁만 주고 피우시는 분께는 경고가 약해진다.
   */
  ['common-antioxidant-rt', /담배를 피우신 분/, 'Meyer 2008 의 핵심은 흡연자에 몰렸다는 것이다'],
  ['common-antioxidant-rt', /2\.9배/, '이차암 HR 2.88(95 % CI 1.56~5.31)이다'],
  /*
   * 호중구감소증 식단은 '이득 없음' 을 넘어 이식군에서 일반식 쪽 감염이 더 적었다.
   * 2026-10-14 전수 대조로 출처를 Sonbol 2019(구독제, 이식군 RR 1.25) → Ma 2022(감염 RR 1.13)·Pedretti 2024(Trifilio 726명)로 바꿔
   * 고정 문구도 바꿨다.
   */
  ['common-neutropenic-diet-myth', /1\.13/, '원문 공개 메타분석(Ma 2022, 6편·1,114명)의 감염 RR 1.13(0.97~1.31)이다'],
  ['common-neutropenic-diet-myth', /726명/, '조혈모세포이식 성인 726명에서 일반식 쪽 확진 감염이 더 적었다(Trifilio 2012 — Pedretti 2024 2차 인용)'],
  /*
   * IDDSI 는 두 문서를 받아 대조했다. 환자가 집에서 확인할 수 있는 숫자는 이 둘뿐이다 —
   * 어른 한 조각 1.5 cm(포크 폭), 다진 단계 4 mm(포크 살 사이). 말로만 '작게' 는 실행할 수 없다.
   */
  ['eso-texture', /1\.5 cm/, 'IDDSI Level 6 의 어른 기준이다(15 mm = 1.5 cm)'],
  ['eso-texture', /4 mm/, 'IDDSI Level 5 의 어른 기준이다(폭 4 mm 이하)'],
  ['eso-texture', /0~7/, 'IDDSI 는 0~7 의 8단계다. 단계 수를 적어야 "단계로 나눈다" 가 확인된다'],
  ['cond-dys-soft', /4 mm/, 'IDDSI Level 5 의 어른 기준이다'],
  ['cond-dys-soft', /따라 내/, "IDDSI 는 '묽은 액체가 음식과 분리되면 안 된다·남는 물기는 따라 낸다' 를 못 박는다"],
  ['hn-soft-moist', /따라 내/, "'국물로 촉촉하게' 는 IDDSI 가 금하는 분리 액체를 부른다"],
  ['cond-dys-rough', /마른 빵/, "IDDSI 는 Level 5·6 에서 마른 빵·토스트·샌드위치를 모두 뺀다"],
  /*
   * 되기 단계는 IDDSI 가 정하지 않는다 — 원문은 임상가가 종합 평가로 정한다고 못 박는다.
   * 앱이 '걸쭉하게 드세요' 를 권고로 적으면 근거를 넘는다.
   */
  ['cond-dys-thin', /연하 평가/, 'IDDSI 는 단계 결정을 임상가에게 맡긴다'],
  ['hn-aspiration', /연하 평가/, 'IDDSI 는 단계 결정을 임상가에게 맡긴다'],
  /*
   * ACS 2022 생존자 지침 전문 대조. 이 지침의 핵심은 '무엇이 연결되고 무엇이 아직 아닌가' 를 갈라 둔 것이다.
   * 뭉뚱그리면 환자는 하지 않아도 될 일을 하고, 해야 할 일을 놓친다.
   */
  ['common-alcohol', /새로운 암/, "ACS 는 생존자 금주의 이유를 재발이 아니라 이차암 예방으로 못 박는다"],
  ['breast-weight', /분명하지 않/, "ACS 는 '진단 후 감량과 생존의 관계는 불확실' 이라고 적었다"],
  ['breast-fiber-veg', /유방암 이외의 원인/, 'ACS 에서 식물성 식사의 이득은 전체 사망·비유방암 사망 쪽이었다'],
  ['breast-soy', /사망률까지 낮춘다는 근거는 아니/, 'ACS 는 대두의 이득을 재발에 한정했다'],
  ['prostate-veg-fat', /결론이 나지 않/, 'ACS 는 비만과 전립선암 사망·진행의 관계를 결론 없음으로 두었다'],
  ['gyn-obesity', /무진행 생존/, 'ACS 는 비만이 자궁내막암 자체의 사망·재발과는 연관되지 않았다고 적었다'],
  /* ASCO 2022 원문 대조로 넣은 문장들 */
  ['common-neutropenic-diet-myth', /이득보다 해가 클/, 'ASCO 권고 2.2 의 판정(harms likely to outweigh benefits)이다'],
  ['cond-gain-dense', /권고를 내지 않았습니다/, "ASCO 권고 3 은 치료 중 체중 개입에 '근거 불충분' 을 냈다"],
  ['prostate-adt-protein', /1 g 을 넘겨/, 'ESPEN 원문은 1.0~1.5 가 아니라 1 g 초과·1.5 까지다'],
  /*
   * Rogers 2011 의 결론은 '표준 위절제 후 식단을 뒷받침할 문헌이 충분하지 않다' 이다.
   * 환자들이 받아 드는 빡빡한 식단표가 근거에서 나온 것이 아니라는 뜻이라, 그 말을 화면에 남긴다.
   * 2026-10-14 전수 대조: Rogers(구독제)를 떼고, 같은 취지를 덤핑 합의문 원문('Controlled data … are not available')으로 받친다.
   */
  ['stomach-dumping', /표준 식단이 아닙니다/, '덤핑 합의문은 물 미루기·단백질 늘리기의 대조 연구가 없다고 적는다'],
  ['stomach-dumping', /대조 연구는 아직 없다/, "Scarpellini 2020 원문: 'Controlled data … are not available in the literature'"],
  ['cond-gx-dumping', /증상을 보아 가며 맞추는 것이 원칙/, '같은 결론을 증상 규칙 쪽에도 남긴다'],
  ['stomach-b12', /48\.8 %/, '메타분석(14편·2,627명)의 값이다'],
  ['cond-gx-b12', /48\.8 %/, '메타분석(14편·2,627명)의 값이다'],
  /*
   * MASCC 가 실제로 권고하는 것은 구강 냉각 하나뿐이고, 조건이 붙어 있다.
   * '5-FU 계열' 로 뭉뚱그리면 지속주입·경구 약을 드시는 분이 헛되이 얼음을 무신다.
   */
  ['cond-muc-cold', /볼루스/, 'MASCC 권고는 bolus 5-FU 주입 중에 한정된다'],
  ['cond-muc-cold', /30분/, 'MASCC 권고의 시간이다'],
  ['cond-muc-cold', /멜팔란/, '두 번째 권고 상황(고용량 멜팔란 자가이식)이 빠지면 절반만 전한 것이다'],
  /*
   * 지침이 어떤 음식을 뺄지 정하지 않았다는 사실은 환자가 알아야 할 근거의 무게다.
   * 2026-10-14 전수 대조로 고정 문구를 바꿨다: MASCC/ISOO 2020 전문에 spicy·acidic 은 0건이고, '권고를 내지 못했다' 는
   * 하부 위장관의 지방 조절 식이·섬유에 쓴 말이었다. 음식 목록은 '다루지 않았다' 가 맞다.
   */
  ['cond-muc-avoid', /다루지 않았습니다/, 'MASCC 는 어떤 음식을 뺄지 다루지 않았다'],
  ['hn-mucositis-avoid', /다루지 않았습니다/, 'MASCC 는 어떤 음식을 뺄지 다루지 않았다'],
  /*
   * IARC 114 공개 Q&A 대조. 등급을 위험의 크기로 읽는 오해가 이 항목의 가장 큰 문제라
   * IARC 자신의 해명을 그대로 싣는다.
   */
  ['common-processed-meat', /근거가 얼마나 확실한가/, 'IARC 는 분류가 위험의 크기가 아니라 근거의 확실성이라고 못 박는다'],
  ['crc-processed-meat', /10편/, '50 g·18 % 는 10편을 모은 추정이다'],
  ['crc-red-meat', /Group 2A/, '적색육은 가공육과 등급이 다르다 — 근거도 "제한적" 이다'],
  ['crc-red-meat', /17 %/, 'IARC 의 적색육 추정치는 하루 100 g 당 17 % 다'],
  /*
   * Bailey 2013 대조. 라임·포멜로·세비야 오렌지가 같고, 단맛 오렌지는 아니며,
   * 정맥주사는 영향을 받지 않는다 — 셋 다 환자가 실제로 헷갈리는 지점이다.
   */
  ['common-grapefruit', /200 mL/, '임상적으로 의미 있는 최소량이다'],
  ['common-grapefruit', /라임/, '원문은 라임·포멜로·세비야 오렌지를 함께 든다'],
  ['common-grapefruit', /정맥으로 맞는/, '정맥 투여 약물은 이 상호작용을 받지 않는다'],
  /* Song 2018 은 이 규칙을 뒷받침하지만 Van Blarigan 은 섬유의 용량-반응을 보고하지 않는다 */
  ['common-grapefruit', /네이블|발렌시아/, '단맛 오렌지는 해당되지 않는다는 안심도 함께 전한다'],
  /*
   * WCRF 제3차 보고서 원문. 400 g 은 '채소만' 이 아니라 '비전분 채소와 과일을 합쳐서' 다.
   * 채소만으로 읽으면 목표가 두 배가 되어 아무도 지킬 수 없다.
   */
  ['common-vegetables', /합쳐/, 'WCRF 의 400 g 은 비전분 채소와 과일의 합계다'],
  ['common-vegetables', /80 g/, '1회분 약 80 g × 5회 이상이 원문의 표현이다'],
  ['crc-fiber', /30 g 이상/, 'WCRF 목표는 하루 30 g 이상이다 — 25~35 g 은 원문에 없다'],
  ['crc-fiber', /과일 섬유는 연관이 확인되지 않았/, 'Song 2018 은 과일 섬유에서 연관을 찾지 못했다'],
  ['crc-red-meat', /700~750 g/, '조리 후 500 g 의 생고기 환산값이 원문에 있다'],
  /* 대두 세 편 — 어느 연구가 무엇을 말했는지 갈라 둔다 */
  ['breast-soy', /0\.75/, 'Nechuta 2012 의 재발 위험비다'],
  ['breast-soy', /상하이 코호트 5,042명/, '수용체·타목시펜 소집단 결과는 Shu 2009 의 것이다'],
  ['crc-lifestyle', /992명/, 'CALGB 89803 의 분석 대상 수다'],
  ['crc-lifestyle', /42 %/, '가장 잘 따른 군의 사망 위험 감소(위험비 0.58)다'],
  /*
   * 생강은 오심 규칙이 '권장' 으로 내보내는데 항응고 지침 표에는 출혈 위험 증가로 올라 있었다.
   * 권장과 주의가 만나는 자리라 양쪽에 못을 박는다.
   */
  ['int-warfarin-ginger', /3\.2배/, 'ACCP 표의 생강 오즈비 3.20(2.42~4.24)이다'],
  ['cond-nau-ginger', /항응고제/, '오심에 생강을 권하면서 항응고제 예외를 빠뜨리면 안 된다'],
  ['int-warfarin-coq10', /3\.7배/, 'ACCP 표의 코엔자임Q10 오즈비 3.69(1.88~7.24)다'],
  ['int-warfarin-coq10', /반대쪽/, '이론(비타민 K 유사)과 관찰(출혈 증가)이 반대라는 것이 핵심이다'],
  ['int-capecitabine-warfarin', /INR 이 10을 넘/, '증례 보고의 실제 경과다'],
  /* ESPEN 2017 원문 — 오메가-3 는 '약한 권고' 이고 대상이 정해져 있다 */
  ['lung-omega3', /약하고/, 'ESPEN 권고 강도는 WEAK·근거 수준 Low 다'],
  ['lung-omega3', /1\.8 g/, 'EFSA 의 EPA 단독 안전 상한이다'],
  ['int-warfarin-omega3', /5 g/, 'EFSA 는 EPA·DHA 합쳐 하루 5 g 까지 자발 출혈이 늘지 않는다고 정리했다'],
  /*
   * KDRI 2020 공식 개정본 대조. 2015 판의 '목표섭취량 2,000 mg' 은 2020 판에 없는 용어·값이고,
   * 2020 판은 만성질환위험감소섭취량 2,300 mg 을 새로 두었다(65세 이상은 더 낮다).
   */
  ['common-sodium', /2,300 mg/, 'KDRI 의 나트륨 만성질환위험감소섭취량이다(2020·2025 판 같음)'],
  ['common-sodium', /1,900 mg/, '2025 판의 65~74세 값이다(2020 판 2,100)'],
  ['common-sodium', /1,500 mg/, '충분섭취량도 함께 보여야 3,255 mg 의 무게를 안다'],
  ['common-sodium', /65세를 넘으면/, '65세 이상은 기준이 더 낮다 — 환자군이 여기에 몰려 있다'],
  ['cond-htn-na', /2,300 mg/, 'KDRI 의 기준값이다(2020·2025 판 같음)'],
  ['cond-htn-na', /1,800 mg/, '2025 판의 75세 이상 값이다(2020 판 1,700)'],
  ['cond-htn-na', /그 아래로 반드시 내려가라/, 'CDRR 의 뜻을 원문대로 적는다'],
  ['cond-ckd-k', /3,500 mg/, '건강한 성인의 칼륨 충분섭취량이다'],
  ['cond-ckd-p', /650 mg/, '인 권장섭취량이다(2025 판 — 2020 판은 700 mg)'],
  ['int-warfarin-vitk', /75 µg/, '비타민 K 충분섭취량(남)이다 — 가늠자가 없으면 실행할 수 없다'],
  /* 위암 염장 규칙 — 아시아 하위군 값과 한국 코호트의 용량-반응 */
  ['stomach-salted', /1\.27배/, '메타분석의 아시아 하위군 값이다. 전체 2.05배만 적으면 과장이 된다'],
  ['stomach-salted', /40 g/, '한국 코호트 메타분석의 용량 단위다'],
  ['stomach-kimchi', /0\.62/, '신선 채소의 오즈비다 — 절임과 갈라야 뜻이 산다'],
  ['stomach-kimchi', /1\.28/, '절임 채소의 오즈비다'],
  /*
   * 단건 출처 대조. 베타카로틴 두 시험은 '효과 없음' 이 아니라 '더 나빴다' 이고,
   * 사망까지 늘었다는 것이 핵심이라 그 숫자를 남긴다.
   */
  ['lung-betacarotene', /전체 사망도 8 %/, 'ATBC 는 총사망도 8 % 높았다(1~16 %)'],
  ['lung-betacarotene', /폐암 사망은 46 %/, 'CARET 의 폐암 사망 위험비 1.46 이다'],
  ['lung-betacarotene', /21개월 일찍/, 'CARET 은 예정보다 21개월 일찍 중단되었다'],
  /* 비타민 D — 전체 생존이 똑같았다는 것이 환자에게 가장 결정적인 사실이다 */
  ['crc-vitd', /24\.3개월로 똑같/, 'SUNSHINE 의 전체 생존은 양군 모두 24.3개월이었다'],
  ['crc-vitd', /25,871명/, 'VITAL 의 규모다 — 예방 근거는 이쪽이 결정적이다'],
  /* 커피 — 디카페인은 방향만 같고 크기가 다르며 신뢰구간이 1에 걸친다 */
  ['liver-coffee', /1\.00 에 걸쳐/, '디카페인은 신뢰구간 상한이 1.00 이었다'],
  ['liver-coffee', /간질환이 이미 있는 분/, '간질환이 있어도 연관이 유지된 것이 이 규칙의 요점이다'],
  /* 뜨거운 음료 — 커피 자체는 Group 3 이라는 안심을 함께 전한다 */
  ['eso-hot', /Group 3/, '커피는 1991년 2B 에서 분류 불가로 내려갔다'],
  /* 아플라톡신 — '수십 배' 는 원문에 없다. IARC 의 표현과 기여위험을 쓴다 */
  ['liver-aflatoxin', /곱셈보다 더 크게/, "IARC 원문은 'greater than multiplicative interaction' 이다"],
  ['liver-aflatoxin', /80 %/, '아플라톡신+HBsAg 양성의 기여위험도다'],
  /* 심장독성 — 다섯 요인 중 첫째가 금연이고, 지침 스스로 근거가 부족하다고 적었다 */
  ['breast-her2-cardiac', /흡연·고혈압·당뇨·이상지질혈증·비만/, 'ASCO 권고 3.1 이 든 다섯 가지다'],
  ['breast-her2-cardiac', /30 Gy/, '심장이 조사야에 들어간 고위험 기준이다'],
  /* 운동 시험의 대상 제한 — 뼈 전이가 있으면 처방이 달라진다 */
  /* 2026-10-14 전수 대조: Galvão(구독제·초록만) 문장을 Shao 2022 메타분석으로 바꾸면서, 뼈 전이 안전 경고는 골전이 운동 합의(PMC)로 받쳐 남긴다 */
  ['prostate-adt-protein', /뼈 전이가 있으시면/, '뼈 전이가 있으면 병변 위치·상태에 따라 운동 처방이 달라진다(골전이 운동 국제 합의)'],
  /* 녹차-보르테조밉은 사람 대상 시험이 아니다 */
  ['int-bortezomib-greentea', /세포와 동물 실험/, 'Golden 2009(Jia 2013 종설이 옮김)는 in vitro·in vivo 연구다'],
  /*
   * ERAS 대장수술 지침은 오히려 반대쪽을 말한다 —
   * 정상 식사 재개가 늦어지면 감염이 늘고 회복이 느려지므로 수술 당일부터 시작하라(강한 권고).
   * '4~6주에 걸쳐' 라고 적어 두면 지침이 막으려는 바로 그 일을 권하게 된다.
   */
  ['crc-lowresidue', /수술 당일부터/, 'ERAS 의 권고는 당일 시작이다'],
  ['crc-lowresidue', /며칠 동안의 출발점/, '저잔사식은 몇 주씩 이어 갈 식단이 아니다'],
  /* WCRF 전립선 보고서는 자기 등급의 한계를 스스로 적어 두었다 */
  ['prostate-dairy', /권고를 만들 근거가 되기에는/, 'WCRF 는 제한적-시사적 등급의 한계를 명시한다'],
  ['prostate-dairy', /칼슘 보충제만 따로 본 판정은 아예 "결론 없음"/, '보충제는 별도 판정이며 결론 없음이다'],
  ['prostate-lycopene', /2014년 재평가/, '리코펜은 2007년 판정에서 하향되었다 — 그 사실이 요점이다'],
  /* ADT 골 지침이 실제로 말하는 것은 골밀도 검사이고, 칼슘 수치는 다른 맥락이다 */
  ['prostate-adt-bone', /골밀도 검사를 받아/, 'CCO·ASCO 지침의 권고는 ADT 시작 전 골밀도 검사다'],
  ['prostate-adt-bone', /500 mg 이상/, '지침에 나오는 칼슘 값은 500 mg 이상이고 맥락이 다르다'],
  /* 장루 식이는 근거가 얇다는 사실을 함께 전한다 */
  ['cond-stoma-fiber', /서로 엇갈리고 불충분/, '장루 식이 종설의 결론이다'],
  /*
   * NCCN Survivorship 을 걷어 낸 자리에 넣은 공개 문헌들.
   * 읽지 못한 문헌을 근거로 두지 않는다는 원칙이 지켜지는지 여기서 지킨다.
   */
  ['breast-calcium-vitd', /1,200 mg/, '국제골다공증재단 권고값이다'],
  ['breast-calcium-vitd', /T값이 −2\.0/, '골표적 약물치료로 넘어가는 기준이다'],
  ['gyn-bone', /골절을 줄인다는 것까지는 아직 입증되지 않았/, '체중부하 운동의 근거 한계를 원문대로 적는다'],
  ['int-ai-calcium', /25-OH/, '골절 고위험군에서는 혈중 농도 측정이 권장된다'],
  /* 2026-10-14 전수 대조: 합의문 원문은 '완하제' 가 아니라 '변비 치료를 계속 유지' 다 */
  ['cond-const-opioid', /계속 유지/, '합의문은 오피오이드를 쓰는 동안 변비 치료 유지를 권한다'],
  ['hn-caries', /3개월/, '방사선 우식증은 치료 후 3개월 안에 시작될 수 있다'],
  ['hn-caries', /턱뼈 괴사/, '치료 후 발치를 따로 판단하는 이유다']
]
/*
 * 반대 방향의 못. 원문이 하지 않는 말을 우리가 하지 않았는지 본다.
 * MUST_SAY 는 지워진 것을 잡고, 이쪽은 되살아난 것을 잡는다.
 */
const MUST_NOT_SAY: [string, RegExp, string][] = [
  ['cond-dys-thin', /흡인이 줄어듭니다|걸쭉하게 만들어 드시는 것을 권/, 'IDDSI 는 되기를 권고하지 않고 임상가 판단에 맡긴다'],
  ['hn-aspiration', /흡인이 줄어듭니다/, 'IDDSI 에 걸쭉하게 하면 흡인이 준다는 효과 문장이 없다'],
  ['cond-dys-thin', /가장 사레들기 쉽|가장 빠르게/, 'IDDSI 는 단계를 나눌 뿐 위험 순위를 매기지 않는다'],
  ['hn-aspiration', /가장 빠르게/, 'IDDSI 는 단계를 나눌 뿐 위험 순위를 매기지 않는다'],
  /* ACS 는 진단 후 감량의 이득을 확인하지 못했다 — '가장 확실한' 이 되살아나면 근거를 넘는다 */
  ['breast-weight', /가장 확실한/, 'ACS 는 진단 후 감량과 생존의 관계를 불확실로 두었다'],
  ['prostate-veg-fat', /재발 위험 모두와 연관/, 'ACS 는 비만과 전립선암 진행·사망을 결론 없음으로 두었다'],
  /* 채소만 400 g 은 원문이 아니다 — 되살아나면 지킬 수 없는 목표가 된다 */
  ['common-vegetables', /채소는 하루 400 g/, 'WCRF 의 400 g 은 채소와 과일의 합계다'],
  /* IARC 원문에 없는 배수 표현이 되살아나면 근거를 넘는다 */
  ['liver-aflatoxin', /수십 배/, 'IARC 는 배수를 말하지 않는다'],
  ['liver-coffee', /카페인만의 효과는 아닌 것으로 보입니다/, '디카페인은 크기가 절반이고 신뢰구간이 1에 걸친다'],
  /* ERAS 가 막으려는 바로 그 지시가 되살아나면 안 된다 */
  ['crc-lowresidue', /4~6주에 걸쳐 서서히 섬유를 늘립니다/, 'ERAS 는 정상 식사 재개를 늦추지 말라고 한다'],
  ['prostate-adt-bone', /칼슘 하루 1,000~1,200 mg, 비타민 D 400~1,000 IU 보충과 정기적인 골밀도 검사입니다/, '그 수치는 이 지침에 없다'],
  /* ASCO 2022 는 이 말을 하지 않는다 — 생존자 체중 권고를 낸 적이 없다 */
  ['breast-weight', /미국임상종양학회는 생존자에게 체중 관리/, "ASCO 2022 는 체중 개입에 '근거 불충분' 을 냈다"],
  ['prostate-adt-protein', /1\.0~1\.5 g/, 'ESPEN 원문 표현이 아니다'],
  /* 이론만 적고 관찰 자료를 빼면 방향이 거꾸로 전달된다 */
  ['int-warfarin-coq10', /와파린 효과를 줄일 수 있고/, 'ACCP 가 인용한 자료는 출혈 증가 쪽이다'],
  /* 2015 판 용어가 되살아나면 기준이 300 mg 어긋난다 */
  ['common-sodium', /목표섭취량 2,000 mg/, 'KDRI 2020 에 없는 용어·값이다'],
  ['cond-htn-na', /하루 2,000 mg 이하로/, 'KDRI 2020 의 기준은 2,300 mg 이다'],
  /* 뭉뚱그린 표현이 되살아나면 해당하지 않는 분이 따라 하신다 */
  ['cond-muc-cold', /5-FU 계열 항암제 투여 중/, 'MASCC 권고는 bolus 주입 중으로 한정된다']
]
for (const [rid, pat, why] of MUST_NOT_SAY) {
  const r = ALL_RULES.find((x) => x.id === rid) as { id: string; title?: string; reason?: string } | undefined
  if (!r) { bad('못 박아 둔 규칙이 사라졌거나 이름이 바뀜', `${rid} (${why})`); continue }
  /* 제목에 적힌 주장도 화면에 보이는 주장이다 — reason 만 보면 제목으로 되돌아가도 지나간다 */
  if (pat.test(`${r.title ?? ''} ${r.reason ?? ''}`)) {
    bad('원문이 하지 않는 말이 되살아남', `${rid} — ${why}`)
  }
}

for (const [rid, pat, why] of MUST_SAY) {
  const r = ALL_RULES.find((x) => x.id === rid) as { id: string; title?: string; reason?: string } | undefined
  /*
   * 없는 id 를 적어 두면 조용히 지나간다 — 훑지 않는 길은 지켜지지 않는다.
   * 규칙 이름이 바뀌거나 사라지면 여기서 먼저 걸리게 한다.
   */
  if (!r) { bad('못 박아 둔 규칙이 사라졌거나 이름이 바뀜', `${rid} (${why})`); continue }
  if (!pat.test(`${r.title ?? ''} ${r.reason ?? ''}`)) {
    bad('원문 대조로 고친 수치가 사라짐', `${rid} — ${why}`)
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
 * 섭취량에 따른 운동 조언도 마찬가지다.
 * 이 문장들은 한동안 화면에 직접 박혀 있어 이 그물 밖에 있었고,
 * 그래서 출처 없이 근거보다 센 말이 섞여 있었다. 자료로 옮겨 여기서 함께 센다.
 */
/*
 * 화면에 근거보다 센 말이 다시 들어오지 않는가.
 *
 * 예전에는 "부족한 상태에서 운동을 늘리면 근육부터 빠집니다. 가벼운 걷기 정도로 유지하세요"
 * 라고 단정했다. 찾아보니 이 상황을 직접 다룬 시험이 없고, Cochrane 갱신판은
 * 악액질에서 운동의 효과도 안전성도 불확실하다고 결론짓는다(GRADE very low).
 * 근거가 없는데 방향을 정해 말하면, 규칙마다 출처를 붙여 온 이 앱의 원칙이 무너진다.
 *
 * ESPEN 2021 원문을 받아 보니 방향이 더 분명해졌다. 권고 12 는
 * "maintenance or an increased level of physical activity" 를 강도 strong·근거수준 high 로 권하고,
 * 권고 35 는 항암치료 중 활동 유지와 충분한 섭취를 **함께** 권한다.
 * 곧 '줄이세요' 는 지침과 어긋나고, '늘리세요' 도 섭취가 모자란 분께 앱이 정해 드릴 일은 아니다.
 *
 * 그래서 운동 조언 화면에 '줄이세요/늘리세요' 류의 단정이 있는지 본다.
 * 문장을 외우지 않고 뜻으로 본다 — 운동을 목적어로 삼은 명령형만 잡는다.
 */
const todayScreen = readFileSync('src/components/TodayMeals.tsx', 'utf-8')
const exerciseBlock = todayScreen.slice(todayScreen.indexOf('function ExerciseAdvice'))
const PRESCRIPTIVE = /(운동을?|운동량을?|강도를?)\s*(줄이|늘리)(세요|십시오|시기 바랍|셔야)/g
for (const m of exerciseBlock.match(PRESCRIPTIVE) ?? []) {
  bad('운동을 늘리라거나 줄이라고 단정함', `"${m}" — 이 상황을 직접 다룬 시험이 없다`)
}
/*
 * 출처가 화면에 실제로 **불리는가**.
 *
 * 처음에는 'AdviceRefs' 라는 글자가 있는지만 봤는데, 그러면 함수 정의만 남아 있어도 통과한다.
 * 호출을 지워 보았더니 검사가 그냥 넘어갔다 — 있는지가 아니라 쓰이는지를 봐야 한다.
 */
if (!/<AdviceRefs[\s>]/.test(exerciseBlock)) {
  bad('운동 조언에 출처를 보여 주지 않음', '<AdviceRefs …/> 를 부르지 않는다')
}

for (const a of Object.values(INTAKE_EXERCISE_ADVICE)) {
  for (const ref of a.refIds) used.add(ref)
  if (a.refIds.length === 0) bad('섭취량 조언에 출처 없음', a.id)
  if (!['A', 'B', 'C', 'G'].includes(a.evidence)) bad('섭취량 조언의 근거 수준 이상', `${a.id} ${a.evidence}`)
  for (const ref of a.refIds) if (!REF_BY_ID[ref]) bad('없는 출처를 가리킴', `운동 조언 ${a.id} → ${ref}`)
}
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
  /*
   * 칼슘은 조건과 무관하게 모든 분께 뜬다.
   *
   * 처음에는 항호르몬 치료나 안드로겐 차단요법을 받는 분께만 보았는데,
   * 실제로 만들어지는 식단의 하위 10 % 가 하루 383 mg 이었다 —
   * 권장섭취량의 절반이 조용히 지나가고 있었다.
   * 칼슘은 성분 자료가 93 % 채워져 있어 합계를 믿을 만하므로 상시 항목으로 두었다.
   * 나머지(칼륨·인·철)는 여전히 해당하는 분께만 떠야 한다.
   */
  const ALWAYS_ON = ['칼슘']
  const plain = { ...DEFAULT_PATIENT, conditions: [], medications: [] } as PatientContext
  const extra = microTargets(plain).filter((m) => !ALWAYS_ON.includes(m.label))
  if (extra.length > 0)
    bad('해당 없는 분께 미량영양소 기준이 뜸', extra.map((m) => m.label).join('·'))
  /* 상시 항목은 반대로, 조건이 없어도 반드시 떠야 한다 */
  for (const label of ALWAYS_ON)
    if (!microTargets(plain).some((m) => m.label === label))
      bad('모든 분께 떠야 할 기준이 빠짐', label)

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

/* ── 자몽은 항암제를 쓰는 동안에만 '피하세요' ──────────────────
 *
 * 한동안 자몽은 약을 하나도 고르지 않은 분, 치료를 마친 분께도 "항암제 농도를 예측할 수 없게
 * 바꿉니다" 라며 '피하세요' 로 떴다. 감수하신 선생님이 "항암제 복용 중에만" 으로 정하셨다(2026-10).
 *
 * 잣대를 엔진에서 빌리지 않는다. 약마다 '항암제인가' 를 여기에 따로 적어 두고 견준다.
 * 약이 하나 늘면 이 표에 없어서 검사가 멈춘다 — 그때 누군가 판단을 내려야 넘어간다.
 */
{
  const IS_ANTICANCER: Record<string, boolean> = {
    /* 항호르몬제 — 수년씩 드시는 약이라 넣지 않았다. 넣을지는 임상 판단이다 */
    tamoxifen: false, ai: false, adt: false,
    /* 2026-10-13 에 생긴 아랫칸 — 모두 항호르몬제다. 자몽은 약마다 따로 정했다(아래 '항호르몬제와 자몽') */
    'ai-letrozole': false, 'ai-anastrozole': false, 'ai-exemestane': false,
    'adt-abiraterone': false, 'adt-enzalutamide': false, 'adt-apalutamide': false, 'adt-darolutamide': false,
    capecitabine: true,
    'tki-egfr': true, 'tki-alk': true, cdk46: true, sorafenib: true,
    warfarin: false, doac: false,
    bortezomib: true, cisplatin: true, oxaliplatin: true, irinotecan: true, methotrexate: true,
    steroid: false, ppi: false, levothyroxine: false
  }
  for (const m of MEDICATIONS) {
    if (!(m.id in IS_ANTICANCER)) bad('항암제인지 정하지 않은 약', `${m.name}(${m.id}) — 자몽 경고가 걸릴지 말지 정해야 한다`)
  }
  const grape = [...CURATED_FOODS, ...GENERATED_CORE].filter((f) => (f.tags ?? []).includes('자몽계' as never))
  if (grape.length < 20) bad('자몽 검사가 헛돎', `자몽계 음식이 ${grape.length}종뿐`)
  const sample = [grape[0], grape[Math.floor(grape.length / 2)], grape[grape.length - 1]]

  const fires = (p: PatientContext) =>
    sample.every((f) => evaluateFood(f, p, 1).hits.some((h) => h.rule.id === 'common-grapefruit'))
  const silent = (p: PatientContext) =>
    sample.every((f) => !evaluateFood(f, p, 1).hits.some((h) => h.rule.id === 'common-grapefruit'))
  const who = (phase: Phase, meds: string[]): PatientContext =>
    ({ ...DEFAULT_PATIENT, cancer: 'breast', phase, medications: meds, conditions: [], subtypes: [], onboarded: true })

  /* 시기만으로 */
  const CHEMO_PHASES: Phase[] = ['during_chemo', 'neutropenia']
  const OTHER_PHASES: Phase[] = ['during_rt', 'post_op', 'survivorship']
  for (const ph of CHEMO_PHASES) {
    if (!fires(who(ph, []))) bad('항암제를 쓰는 시기인데 자몽 경고가 안 뜸', ph)
  }
  for (const ph of OTHER_PHASES) {
    if (!silent(who(ph, []))) bad('항암제를 안 쓰는데 자몽이 피하세요로 뜸', `${ph} · 약 없음`)
  }
  /* 약으로 — 시기가 무엇이든 */
  for (const m of MEDICATIONS) {
    for (const ph of OTHER_PHASES) {
      const p = who(ph, [m.id])
      if (IS_ANTICANCER[m.id] && !fires(p)) bad('항암제를 드시는데 자몽 경고가 안 뜸', `${ph} · ${m.name}`)
      if (IS_ANTICANCER[m.id] === false && !silent(p)) bad('항암제가 아닌 약인데 자몽이 피하세요로 뜸', `${ph} · ${m.name}`)
    }
  }
  /* 판정까지 — 경고가 뜨는 분께는 실제로 '피하세요' 여야 한다 */
  if (evaluateFood(sample[0], who('during_chemo', []), 1).level !== 'avoid') bad('자몽 경고의 등급이 피하세요가 아님', sample[0].name)
}

/* ── 항호르몬제와 자몽 — 2026-10-13 전문의 결정 ─────────────────
 *
 * 타목시펜·레트로졸은 '피하세요', 아나스트로졸·엑스메스탄·ADT 는 '주의'. 근거가 약하다는 것을 숨기지 않기로 했다 —
 * 그래서 등급은 'C' 이고 이유 글에 "함께 써 본 연구는 없다" 는 말이 있어야 한다. 그 문장이 빠지면 근거를 부풀린 것이 된다.
 */
{
  const grapes = [...CURATED_FOODS, ...GENERATED_CORE].filter((f) => (f.tags as string[]).includes('자몽계'))
  const orange = [...CURATED_FOODS].filter((f) => /^(귤|오렌지|한라봉)$/.test(f.name))
  const who = (meds: string[], over: Partial<PatientContext> = {}): PatientContext =>
    ({ ...DEFAULT_PATIENT, cancer: 'breast', phase: 'survivorship', medications: meds, conditions: [], subtypes: [], onboarded: true, ...over })
  const WANT: [string, string[], string][] = [
    ['타목시펜', ['tamoxifen'], 'avoid'],
    ['레트로졸', ['ai', 'ai-letrozole'], 'avoid'],
    ['아나스트로졸', ['ai', 'ai-anastrozole'], 'caution'],
    ['엑스메스탄', ['ai', 'ai-exemestane'], 'caution'],
    ['아로마타제 억제제(종류 모름)', ['ai'], 'caution'],
    ['ADT', ['adt'], 'caution'],
    ['ADT + 자이티가', ['adt', 'adt-abiraterone'], 'caution'],
    ['ADT + 엑스탄디', ['adt', 'adt-enzalutamide'], 'caution'],
    ['ADT + 얼리다', ['adt', 'adt-apalutamide'], 'caution'],
    ['ADT + 뉴베카', ['adt', 'adt-darolutamide'], 'caution']
  ]
  if (grapes.length < 20 || orange.length < 2) bad('항호르몬제 자몽 검사가 헛돎', `자몽계 ${grapes.length} · 오렌지류 ${orange.length}`)
  for (const [label, meds, want] of WANT) {
    const p = who(meds)
    for (const f of [grapes[0], grapes[Math.floor(grapes.length / 2)], grapes[grapes.length - 1]]) {
      const v = evaluateFood(f, p, 1)
      const lv = v.interactions.length ? (v.interactions.some((h) => h.interaction.level === 'avoid') ? 'avoid' : 'caution') : 'none'
      if (lv !== want) bad('항호르몬제의 자몽 표기가 정해진 것과 다름', `${label} · ${f.name} → ${lv} (정해진 것: ${want})`)
    }
    /* 귤과 단맛 오렌지는 푸라노쿠마린이 없다 — 자몽 경고가 번지면 안 된다 */
    for (const f of orange) if (evaluateFood(f, p, 1).interactions.some((h) => /자몽/.test(h.interaction.title))) bad('자몽 경고가 귤·오렌지에 붙음', `${label} · ${f.name}`)
  }
  /* 종류를 고르셨으면 "어느 약인지에 따라 다릅니다" 는 나오지 않는다 */
  for (const child of ['ai-letrozole', 'ai-anastrozole', 'ai-exemestane']) {
    if (evaluateFood(grapes[0], who(['ai', child]), 1).interactions.some((h) => h.interaction.id === 'int-grapefruit-ai')) bad('약 이름을 골랐는데 "어느 약인지에 따라" 가 함께 나옴', child)
  }
  /* 근거를 부풀리지 않는다 */
  for (const it of INTERACTIONS.filter((i) => /^int-grapefruit-(tamoxifen|letrozole|anastrozole|exemestane|ai|adt|apalutamide)$/.test(i.id))) {
    if (it.evidence !== 'C') bad('항호르몬제 자몽 규칙의 등급이 C 가 아님', `${it.id} — ${it.evidence}. 함께 써 본 임상 연구가 없다`)
    if (!/연구는 없|연구도 없/.test(it.reason)) bad('항호르몬제 자몽 규칙이 "함께 써 본 연구는 없다" 를 밝히지 않음', it.id)
    if (!it.refIds.some((r) => r === 'cdi-liverpool' || r.startsWith('fda-label-'))) bad('항호르몬제 자몽 규칙에 허가사항·상호작용 자료 인용이 없음', it.id)
  }
  if (INTERACTIONS.filter((i) => /^int-grapefruit-(tamoxifen|letrozole|anastrozole|exemestane|ai|adt|apalutamide)$/.test(i.id)).length !== 7) bad('항호르몬제 자몽 규칙 수가 다름', '일곱 건이어야 한다')
}

/* ── 약 고르기 — 윗칸과 아랫칸 ───────────────────────────────
 *
 * 아랫칸(레트로졸·자이티가…)은 윗칸을 고르셨을 때만 보이고, 윗칸을 끄면 함께 꺼져야 한다.
 * 아무렇게나 눌러 본다. 어떤 순서로 눌러도 "윗칸 없는 아랫칸", "한 윗칸에 아랫칸 둘" 이 생기면 안 된다.
 */
{
  let seed = 20261013
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  const all = MEDICATIONS.map((m) => m.id)
  const parentOf = Object.fromEntries(MEDICATIONS.map((m) => [m.id, m.parent]))
  let sel: string[] = []
  for (let i = 0; i < 20000; i++) {
    const id = all[Math.floor(rnd() * all.length)]
    const before = sel
    sel = toggleMedication(sel, id)
    const orphan = sel.find((m) => parentOf[m] && !sel.includes(parentOf[m]!))
    if (orphan) { bad('윗칸 없이 아랫칸만 남음', `${before.join(',')} + ${id} → ${sel.join(',')}`); break }
    const perParent = new Map<string, number>()
    for (const m of sel) if (parentOf[m]) perParent.set(parentOf[m]!, (perParent.get(parentOf[m]!) ?? 0) + 1)
    if ([...perParent.values()].some((n) => n > 1)) { bad('한 윗칸 아래에서 약이 둘 골라짐', sel.join(',')); break }
    if (new Set(sel).size !== sel.length) { bad('같은 약이 두 번 들어감', sel.join(',')); break }
    /* 고른 것은 모두 화면에 보여야 끌 수 있다 */
    const vis = new Set(visibleMedications(sel).map((m) => m.id))
    const hidden = sel.find((m) => !vis.has(m))
    if (hidden) { bad('골라 둔 약이 화면에서 사라짐 — 끌 길이 없다', `${hidden} · ${sel.join(',')}`); break }
    /* 저장했다가 다시 읽어도 같아야 한다 */
    const back = normalizeMedications(sel)
    if (back.slice().sort().join() !== sel.slice().sort().join()) { bad('약 목록이 저장·복원에서 달라짐', `${sel.join(',')} → ${back.join(',')}`); break }
  }
  if (normalizeMedications(['ai-letrozole']).join() !== 'ai,ai-letrozole') bad('아랫칸만 저장된 자료에 윗칸을 채우지 않음', normalizeMedications(['ai-letrozole']).join())
  if (normalizeMedications(['없는약', 3, null, 'warfarin']).join() !== 'warfarin') bad('모르는 약을 버리지 않음', normalizeMedications(['없는약', 3, null, 'warfarin']).join())
  /* 식사와 얽힌 복용법 — 자이티가를 고르시면 식단 화면에 '빈속' 이 떠야 한다 */
  for (const t of MEAL_TIMING) {
    if (!MEDICATIONS.some((m) => m.id === t.med)) bad('복용법이 없는 약을 가리킴', t.med)
    for (const r of t.refIds) if (!REF_BY_ID[r]) bad('복용법이 없는 출처를 가리킴', `${t.med} → ${r}`)
    if (!/허가사항/.test(t.text)) bad('복용법에 출처(허가사항)를 밝히지 않음', t.med)
  }
  if (!mealTimingFor(['adt', 'adt-abiraterone']).some((t) => /빈속/.test(t.text))) bad('자이티가에 빈속 복용 안내가 없음', '')
  if (mealTimingFor(['adt']).length) bad('고르지 않은 약의 복용법이 나옴', 'adt')
}

/* ── 섭취 방법 — 2026-10-13 전문의 지시 ────────────────────────
 *
 * "생과일·생채소가 포함될 경우 섭취 방법을 반드시 함께 표기." 호중구가 낮은 분께(시기로 고르든 증상으로 고르든)
 * 날로 먹는 과일·채소가 나오면 '씻어서' 가 그 음식 옆에 붙어야 한다. 잣대는 태그가 아니라 이름과 군이다 —
 * 태그가 빠진 음식을 잡으려는 것이다.
 */
{
  const byPhase: PatientContext = { ...DEFAULT_PATIENT, cancer: 'colorectal', phase: 'neutropenia', conditions: [], medications: [], onboarded: true }
  const byCond: PatientContext = { ...byPhase, phase: 'during_rt', conditions: ['호중구감소증'] }
  const well: PatientContext = { ...byPhase, phase: 'survivorship' }
  /* 손으로 등록한 과일 가운데 말리거나 통조림·청이 아닌 것, 그리고 이름으로 보아 날로 먹는 채소 */
  const DRIED = /곶감|건자두|건포도|건망고|건조|통조림|\(청\)|말린/
  const RAW_VEG = /^(상추|깻잎|오이|토마토|방울토마토|셀러리|치커리|파프리카\(.+\)|풋고추|적양배추|물냉이|무생채|쌈밥)$/
  const fresh = CURATED_FOODS.filter((f) => (f.group === '과일' && !DRIED.test(f.name)) || RAW_VEG.test(f.name))
  if (fresh.length < 40) bad('섭취 방법 검사가 헛돎', `날로 먹는 과일·채소 ${fresh.length}종`)
  for (const f of fresh) {
    for (const [label, p] of [['시기', byPhase], ['증상', byCond]] as const) {
      const v = evaluateFood(f, p, 1)
      if (v.level === 'avoid') continue
      if (!howToLines(v).some((t) => /씻/.test(t))) bad('호중구가 낮은 분께 생과일·생채소의 섭취 방법이 안 붙음', `${f.name} (${label}으로 고름)`)
    }
    if (howToLines(evaluateFood(f, well, 1)).some((t) => /씻/.test(t))) bad('호중구가 낮지 않은 분께 씻는 방법이 붙음', f.name)
  }
  /* 익힌 것·말린 것에는 붙지 않는다 */
  for (const f of CURATED_FOODS.filter((x) => /데친|삶은|나물$|곶감|건포도|통조림/.test(x.name) && (x.group === '채소' || x.group === '과일'))) {
    if (howToLines(evaluateFood(f, byPhase, 1)).some((t) => /씻/.test(t))) bad('익히거나 말린 것에 "씻어서 드세요" 가 붙음', f.name)
  }
  /* 차려 드린 식단 — 날로 먹는 과일·채소가 오르면 그 줄에 방법이 있어야 한다 */
  let shown = 0
  for (let i = 0; i < 120; i++) {
    const p = i % 2 ? byPhase : byCond
    const menu = buildDayMenu([], { ...p, cancer: CANCERS[i % CANCERS.length].id, sex: CANCERS[i % CANCERS.length].id === 'prostate' ? 'M' : 'F' }, { nonce: i })
    for (const slot of Object.keys(menu.meals) as (keyof typeof menu.meals)[]) for (const e of menu.meals[slot]) {
      const isFresh = (e.food.group === '과일' && !DRIED.test(e.food.name)) || RAW_VEG.test(e.food.name)
      if (!isFresh) continue
      shown++
      if (!howToLines(evaluateFood(e.food, p, e.servings)).some((t) => /씻/.test(t))) bad('식단에 오른 생과일·생채소에 섭취 방법이 없음', `${e.food.name} · ${p.phase}`)
    }
  }
  if (shown < 30) bad('식단의 섭취 방법 검사가 헛돎', `식단에 오른 생과일·생채소 ${shown}건`)
  /* 방법은 FDA 문장 그대로 — "껍질을 벗겨 드시면 된다" 는 원문에 없다(원문은 벗길 것도 씻으라고 한다) */
  for (const r of [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(), ...CANCERS.flatMap((c) => c.rules)]) {
    if (/씻거나 껍질을 벗겨/.test(r.reason + (r.howTo ?? ''))) bad('"씻거나 껍질을 벗겨" — FDA 원문에 없는 말', r.id)
    if (r.howTo && r.howTo.length > 60) bad('한 줄 안내가 너무 김', `${r.id} — ${r.howTo.length}자`)
  }
  /* 햄·소시지·살라미·훈제오리 — 호중구가 낮은 동안 '주의' 와 "데워서" */
  const deli = [...CURATED_FOODS, ...GENERATED_CORE].filter((f) => /살라미|훈제\s*오리|소시지|비엔나|^햄$|런천미트/.test(f.name) && !/향|맛$|비건|식물성|스낵|과자|칩|커피|콜드브루|라떼/.test(f.name))  /* 비엔나커피는 소시지가 아니다(2026-10-14) */
  if (deli.length < 60) bad('데워 먹기 검사가 헛돎', `${deli.length}종`)
  /*
   * 볶음·피자·떡볶이처럼 뜨겁게 익혀 내는 요리는 "데워서" 가 필요 없다 — 규칙 문장 스스로 "익힌 요리는 해당하지 않는다" 고 한다.
   * 2026-10-14 전수 대조에서 이 모순(부대찌개·피자에 "데워서")을 고쳤다. 잣대는 엔진(익힌요리 태그)과 따로 둔다.
   */
  const cookedDish = /볶음|구이|피자|떡볶이|찌개|솥밥|덮밥|파스타|스파게티|국밥|탕$/
  const deliCold = deli.filter((f) => !cookedDish.test(f.name) || /샐러드|냉/.test(f.name))
  let warm = 0
  /* 대장암에서는 가공육이 아예 '피하세요' 라 "데워서" 가 나올 자리가 없다 — 폐암으로 본다 */
  const lungNeut: PatientContext = { ...byPhase, cancer: 'lung' }
  for (const f of deli) {
    const v = evaluateFood(f, lungNeut, 1)
    if (v.level !== 'caution' && v.level !== 'avoid') { bad('호중구가 낮은데 햄·소시지·훈제오리에 주의가 없음', `${f.name} → ${v.level}`); continue }
    if (!deliCold.includes(f)) continue
    if (v.level === 'caution' && howToLines(v).some((t) => /데워/.test(t))) warm++
    if (howToLines(evaluateFood(f, well, 1)).some((t) => /데워/.test(t))) bad('호중구가 낮지 않은 분께 "데워서" 가 붙음', f.name)
  }
  if (warm / deliCold.length < 0.9) bad('햄·소시지·훈제오리에 "데워서 드세요" 가 안 붙은 것이 많음', `${warm}/${deliCold.length}`)
}

/* ── 호중구감소 — 고르는 자리가 둘이어도 답은 하나 ─────────────
 *
 * 호중구가 낮다는 것은 두 군데서 고를 수 있다 — 치료 시기('호중구감소 시기')와 증상('호중구감소증').
 * 한동안 두 길의 답이 달랐다. 증상으로만 고르신 분께는 회덮밥이 아무 말 없이 지나갔고 모듬회는 '권장' 이었으며,
 * 거꾸로 사과·상추는 '피하세요' 였다(시기로 고르신 분께는 권장). 2026-10-13 에 맞췄다.
 * 잣대는 "두 길이 같은가" 하나뿐이라 엔진의 규칙을 빌리지 않는다.
 */
{
  const NEUT_RULES = new Set(['common-raw-neutropenia', 'common-raw-sprouts-neutropenia', 'common-raw-animal-neutropenia', 'cond-neut-raw'])
  const byPhase: PatientContext = { ...DEFAULT_PATIENT, cancer: 'lung', phase: 'neutropenia', conditions: [], medications: [], onboarded: true }
  const byCond: PatientContext = { ...DEFAULT_PATIENT, cancer: 'lung', phase: 'during_chemo', conditions: ['호중구감소증'], medications: [], onboarded: true }
  const both: PatientContext = { ...byPhase, conditions: ['호중구감소증'] }
  const raw = (v: ReturnType<typeof evaluateFood>) => v.hits.filter((h) => NEUT_RULES.has(h.rule.id))
  let warned = 0
  for (const f of [...CURATED_FOODS, ...GENERATED_CORE]) {
    const a = raw(evaluateFood(f, byPhase, 1)), b = raw(evaluateFood(f, byCond, 1)), c = raw(evaluateFood(f, both, 1))
    if (a.length) warned++
    if ((a.length > 0) !== (b.length > 0)) bad('호중구감소 — 시기로 고를 때와 증상으로 고를 때 답이 다름', `${f.name} [${f.group}] 시기 ${a.length ? '피하세요' : '없음'} · 증상 ${b.length ? '피하세요' : '없음'}`)
    /* 같은 말을 두 번 하지 않는다 — 공통 규칙과 증상 규칙이 한 음식에 나란히 붙지 않게 */
    for (const hits of [b, c]) {
      const ids = hits.map((h) => h.rule.id)
      if (ids.includes('cond-neut-raw') && ids.includes('common-raw-neutropenia')) bad('호중구감소 — 같은 말이 두 번 붙음', `${f.name} (${ids.join(' + ')})`)
    }
  }
  if (warned < 50) bad('호중구감소 검사가 헛돎', `경고된 음식 ${warned}종`)
  /* 씻어 드시면 되는 것 — 증상으로 골라도 '피하세요' 가 아니어야 한다 */
  for (const id of ['apple', 'lettuce', 'strawberry', 'cucumber']) {
    const f = FOOD_BY_ID[id]
    if (!f) continue
    if (evaluateFood(f, byCond, 1).level === 'avoid') bad('호중구감소증을 고르면 생과일·생채소가 피하세요가 됨', f.name)
  }
  const fresh = CURATED_FOODS.filter((f) => (f.group === '과일' || f.group === '채소') && (f.tags as string[]).includes('생식') && !(f.tags as string[]).includes('생새싹'))
  if (fresh.length < 10) bad('생과일·생채소 검사가 헛돎', `${fresh.length}종`)
  for (const f of fresh) if (raw(evaluateFood(f, byCond, 1)).length) bad('호중구감소증을 고르면 생과일·생채소가 피하세요가 됨', f.name)
}

/* ── 덜 익힌 것 — 2026-10-13 전문의 결정으로 '피하세요' ──────────
 *
 * 훈제연어 · 반숙/수란 · 프로슈토·하몽(생햄) · 전복장. 이름을 여기 적어 못 박는다.
 * 익혀 먹는 것(훈제연어 스테이크), 삶은 햄(코시도·꼬또), 과자는 반대쪽으로 못 박는다 —
 * 아무 데나 붙으면 진짜 경고를 믿지 않게 된다.
 */
{
  const neut: PatientContext = { ...DEFAULT_PATIENT, cancer: 'breast', phase: 'neutropenia', conditions: [], medications: [], onboarded: true }
  const well: PatientContext = { ...neut, phase: 'survivorship' }
  const pool = [...CURATED_FOODS, ...GENERATED_CORE]
  const MUST = [/^훈제연어$/, /훈제연어\s*샐러드/, /반숙란/, /반숙\s*계란장/, /수란/, /프로슈토/, /하몽/, /전복장/]
  const MUST_NOT = [/훈제연어\s*스테이크/, /반숙\s*카스테라/, /하몽.*크래커/]
  let seen = 0
  for (const re of MUST) {
    const fs = pool.filter((f) => re.test(f.name) && !MUST_NOT.some((x) => x.test(f.name)) && !/코시도|꼬시도|꼬또|감자칩|비스킷|생강청|베지|레토르트|전복장어|전복장아찌|향$/.test(f.name))
    seen += fs.length
    for (const f of fs) {
      if (evaluateFood(f, neut, 1).level !== 'avoid') bad('호중구감소 시기에 덜 익힌 것이 피하세요가 아님', `${f.name} → ${evaluateFood(f, neut, 1).level}`)
      /* 호중구가 낮지 않은 분께까지 '날것' 규칙으로 막지는 않는다 */
      if (evaluateFood(f, well, 1).hits.some((h) => h.rule.id === 'common-raw-animal-neutropenia')) bad('호중구가 낮지 않은데 날것 규칙이 뜸', f.name)
    }
  }
  /* 내장 자료에는 몇 종뿐이다(훈제연어·반숙란샌드위치…). 내려받는 27만 종은 sense.ts 가 이름으로 훑는다 */
  if (seen < 2) bad('덜 익힌 것 검사가 헛돎', `내장 자료에서 찾은 것 ${seen}종`)
  for (const re of MUST_NOT) for (const f of pool.filter((x) => re.test(x.name))) {
    if ((f.tags as string[]).includes('덜익힘')) bad('익혀 먹는 것·과자에 덜익힘 태그', f.name)
  }
}

/* ── 권장의 문턱은 한 자리에서 ───────────────────────────────
 *
 * "1회 분량에 이만큼은 들어 있어야 권장" 의 숫자는 식약처 고시에서 온다(types.ts 의 SOURCE_PER_SERVING).
 * 규칙에 숫자를 직접 적으면 출처 없는 숫자가 다시 생긴다 — 처음의 5 g · 80 mg 이 그랬다.
 */
{
  const official = Object.values(SOURCE_PER_SERVING) as readonly { key: string; value: number; liquidPer100: number }[]
  const all = [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(), ...CANCERS.flatMap((c) => c.rules)]
  let n = 0
  for (const r of all) {
    const ms = r.match.minServing
    if (!ms) continue
    n++
    if (!official.some((o) => o === ms)) bad('권장의 문턱을 규칙에 직접 적음', `${r.id} — ${ms.key} ${ms.value}. SOURCE_PER_SERVING 에서 가져올 것`)
  }
  if (n < 5) bad('문턱 검사가 헛돎', `minServing 을 쓰는 규칙 ${n}건`)
  /* 고시의 셈 그대로인가 — 기준치 55 g · 700 mg 의 10 % · 15 %, 마시는 것은 그 절반 */
  const want = { protein: [55 * 0.10, 55 * 0.05], ca: [700 * 0.15, 700 * 0.075] } as Record<string, number[]>
  for (const o of official) {
    const w = want[o.key]
    if (!w || Math.abs(o.value - w[0]) > 1e-9 || Math.abs(o.liquidPer100 - w[1]) > 1e-9) bad('문턱이 고시의 셈과 다름', `${o.key} ${o.value}/${o.liquidPer100} — 기준 ${w?.join('/')}`)
  }
}

/* ── "범위 안에 있습니다" 라고 했으면 정말 안에 있어야 한다 ─────────
 *
 * 2026-10-13 에 화면을 눈으로 보다 찾았다 — 1,701 kcal 을 두고 "목표 범위(1,416~1,616 kcal)에 들어옵니다".
 * 15 % 까지는 맞춘 것으로 치는 것이 문구에까지 번진 것이다. 식이섬유도 같았다.
 * 무작위 합계를 넣어, 문구가 댄 범위와 문구가 댄 숫자를 다시 견준다.
 */
{
  let seed = 4242
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  let seen = 0
  for (let i = 0; i < 4000; i++) {
    const c = CANCERS[i % CANCERS.length]
    const p: PatientContext = { ...DEFAULT_PATIENT, cancer: c.id, sex: c.id === 'prostate' ? 'M' : 'F', phase: (['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as Phase[])[i % 5],
      weightKg: 40 + Math.floor(rnd() * 60), heightCm: 150 + Math.floor(rnd() * 30), conditions: rnd() < 0.2 ? ['설사'] : [], medications: [], onboarded: true }
    const totals = { kcal: 700 + rnd() * 2600, protein: 20 + rnd() * 140, na: 500 + rnd() * 4000, fiber: rnd() * 60, carb: 200, fat: 50 }
    for (const n of dayNotes(totals as never, {} as never, p)) {
      const m = n.text.match(/^([\d,]+) (kcal|g|mg) — [^(]*\(([\d,]+)~([\d,]+) [^)]*\)\s*(안에 있습니다|에 들어옵니다)/)
      if (!m) continue
      seen++
      const [v, lo, hi] = [m[1], m[3], m[4]].map((x) => Number(x.replace(/,/g, '')))
      if (v < lo || v > hi) bad('"범위 안" 이라고 했는데 범위 밖', `${n.topic}: ${n.text.slice(0, 70)}`)
    }
  }
  if (seen < 1000) bad('"범위 안" 검사가 헛돎', `견준 문구 ${seen}건`)
}

/* ── 화면에 '금기' 라는 말을 쓰지 않는다 ───────────────────────
 *
 * 2026-10-13 에 '피하세요' 로 통일했다(전문의 결정). 주석은 보지 않고 화면에 나갈 글자만 본다 —
 * 문자열과 JSX 글자를 TypeScript 로 읽어 낸다. 정규식으로 주석을 걷으면 문자열 속 '//' 에서 틀린다.
 */
{
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`
      if (e.isDirectory()) walk(p, out)
      else if (/\.tsx?$/.test(e.name)) out.push(p)
    }
    return out
  }
  const files = walk('src')
  let strings = 0
  for (const file of files) {
    const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const visit = (n: ts.Node) => {
      if (ts.isStringLiteralLike(n) || ts.isJsxText(n) || n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle || n.kind === ts.SyntaxKind.TemplateTail) {
        strings++
        const text = (n as ts.StringLiteralLike).text ?? n.getText()
        if (text.includes('금기')) bad("화면 글에 '금기' 가 남음", `${file}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1} — ${text.trim().slice(0, 60)}`)
      }
      ts.forEachChild(n, visit)
    }
    visit(src)
  }
  if (files.length < 60 || strings < 5000) bad("'금기' 검사가 헛돎", `파일 ${files.length}개 · 문자열 ${strings}개`)
}

/* ── 콩 근거는 콩에만 — 2026-10-14 전문의 확인 ────────────────────
 *
 * '식물성에스트로겐' 태그 하나에 콩 규칙 셋(유방암 권장·타목시펜·자궁내막암)이 걸려 있었다.
 * 석류와 아마씨에도 그 태그가 있어, 석류를 열면 "두부·두유·된장은 피하지 않아도 됩니다" 와
 * 상하이 코호트 숫자가 근거로 떴다. 그 논문들은 석류를 다루지 않는다.
 *
 * 잣대는 엔진이 아니라 이름이다 — 콩으로 만든 음식인지는 이름을 보면 안다.
 */
{
  const SOY_NAME = /두부|두유|대두|검은콩|콩나물|된장|청국장|낫토|유바|유부|비지|콩자반|콩국수|미소/
  const SOY_TAG = '대두이소플라본'
  const soyRules = [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(), ...CANCERS.flatMap((c) => c.rules ?? []), ...INTERACTIONS]
    .filter((r) => (r.refIds ?? []).some((id) => ['shu2009', 'nechuta2012', 'chi2013'].includes(id)))
  if (soyRules.length < 3) bad('콩 근거 검사가 헛돎', `콩 코호트를 인용한 규칙이 ${soyRules.length}개뿐`)
  for (const r of soyRules) {
    const tags = r.match.tags ?? []
    if (tags.length !== 1 || tags[0] !== SOY_TAG) bad('콩 근거 규칙이 콩 아닌 것에도 걸릴 수 있음', `${r.id} — match.tags ${JSON.stringify(tags)}`)
  }
  /* '식물성에스트로겐' 은 보여 드리는 이름일 뿐 — 거기에 규칙을 걸면 다시 석류가 끌려 들어온다 */
  for (const r of [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(), ...CANCERS.flatMap((c) => c.rules ?? []), ...INTERACTIONS]) {
    if ((r.match.tags ?? []).includes('식물성에스트로겐') || (r.match.excludeTags ?? []).includes('식물성에스트로겐')) {
      bad("'식물성에스트로겐' 에 규칙이 걸림", r.id)
    }
  }
  let soyFoods = 0
  for (const f of [...CURATED_FOODS, ...GENERATED_CORE]) {
    if (!f.tags.includes(SOY_TAG)) continue
    soyFoods++
    if (!SOY_NAME.test(f.name)) bad("콩이 아닌데 '대두이소플라본'", `${f.id} ${f.name}`)
    if (!f.tags.includes('식물성에스트로겐')) bad("'대두이소플라본' 인데 '식물성에스트로겐' 표시가 빠짐", `${f.id} ${f.name}`)
  }
  if (soyFoods < 25) bad('콩 근거 검사가 헛돎', `'대두이소플라본' 음식이 ${soyFoods}종뿐`)
  /*
   * 석류·아마씨는 이름(식물성에스트로겐)은 남기되 콩 근거는 받지 않는다.
   * 각자의 근거 규칙(breast-pomegranate · breast-flax)이 실제로 붙는지까지 본다.
   */
  const OWN_RULE: Record<string, string | undefined> = { pomegranate: 'breast-pomegranate', flaxseed: 'breast-flax' }
  for (const [id, rule] of Object.entries(OWN_RULE)) {
    const f = FOOD_BY_ID[id]
    if (!f) { bad('석류·아마씨 검사 대상이 없음', id); continue }
    if (!f.tags.includes('식물성에스트로겐')) bad("'식물성에스트로겐' 표시가 사라짐", f.name)
    if (f.tags.includes(SOY_TAG)) bad('콩이 아닌데 콩 근거를 받음', f.name)
    const p = { ...DEFAULT_PATIENT, cancer: 'breast', sex: 'F', subtypes: ['호르몬수용체양성'], onboarded: true, phase: 'survivorship', medications: ['tamoxifen'] } as PatientContext
    const v = evaluateFood(f, p, 1)
    const ids = [...v.hits.map((h) => h.rule.id), ...v.interactions.map((i) => i.interaction.id)]
    for (const s of soyRules) if (ids.includes(s.id)) bad('콩 근거가 석류·아마씨에 붙음', `${f.name} ← ${s.id}`)
    if (rule && !ids.includes(rule)) bad('석류·아마씨 자기 근거가 안 붙음', `${f.name} — ${rule} 없음 (${ids.join(',')})`)
  }
}

/* ── 참고 문헌은 전부 원문 대조 — 2026-10-14 전수 대조로 못 박음 ─────────────────
 *
 * 홍보·스토어·지침서에 "참고 문헌 N종 전부 원문 대조" 라고 적었다. 그런데 출처마다 원문을 정말 봤는지는
 * 어디에도 적혀 있지 않았고, 전수 대조에서 초록만 볼 수 있는(구독제) 출처가 13종 나왔다.
 * 이제 출처마다 access(pmc|open|abstract)를 적는다. 적지 않았거나 abstract 이면 실패 —
 * 원문이 공개된 대체 문헌을 찾거나, 그 출처에 기대는 문장을 줄인다.
 */
{
  for (const r of ALL_REFERENCES) {
    if (!r.access) bad('원문 대조 기록이 없는 출처', `${r.id} — access(pmc|open|abstract) 를 적을 것`)
    else if (r.access === 'abstract') bad('초록만 본 출처 — "전부 원문 대조" 와 어긋남', `${r.id} — 원문 공개 대체 문헌으로 바꿀 것`)
    if (r.access === 'pmc' && !/^PMC\d+$/.test(r.fulltext ?? '')) bad('PMC 출처인데 PMCID 가 없음', r.id)
    if (!r.url && !r.fulltext) bad('출처에 주소가 없음 — 화면에서 원문으로 갈 수 없다', r.id)
  }
}

console.log(`\n규칙 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 5).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')