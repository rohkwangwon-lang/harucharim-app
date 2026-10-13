import type {
  Food, NutritionRule, PatientContext, RuleLevel, RuleMatch,
  SelectedItem, Supplement, Interaction
} from '../data/types'
import { FOOD_BY_ID } from '../data/foods'
import { CANCER_BY_ID } from '../data/cancers'
import { COMMON_RULES } from '../data/commonRules'
import { CONDITION_RULES } from '../data/conditionRules'
import { INTERACTIONS, MEDICATIONS } from '../data/interactions'
import { foodContribution } from './nutrition'

/** 규칙의 강도 — 여러 규칙이 같은 식품에 걸리면 강한 쪽을 대표로 쓴다 */
const LEVEL_RANK: Record<RuleLevel, number> = { avoid: 3, caution: 2, prefer: 1, info: 0 }

/** 이 태그가 붙은 음식은 권할 음식으로 내세우지 않는다 — evaluateFood 참조 */
const NO_PRAISE_TAGS = new Set<string>(['염장', '가공육', '훈제'])

export interface RuleHit {
  rule: NutritionRule
  /** 어디서 온 규칙인지 — 화면에 출처를 표시한다 */
  source: '공통' | '암종' | '증상'
  /** 증상 규칙이면 어떤 증상인지 */
  sourceLabel?: string
}

export interface InteractionHit {
  interaction: Interaction
  /** 어떤 약제 때문에 걸렸는지 */
  medicationName: string
}

/** 한 식품에 대한 종합 평가 결과 */
export interface FoodVerdict {
  food: Food
  /** 가장 강한 수준 */
  level: RuleLevel | null
  hits: RuleHit[]
  interactions: InteractionHit[]
}

/* ────────────────────────── 매칭 ────────────────────────── */

function matchesFood(match: RuleMatch, food: Food, servings = 1): boolean {
  // restrictGroups 는 AND 조건 — 여기서 걸러지면 나머지는 볼 필요가 없다
  if (match.restrictGroups && !match.restrictGroups.includes(food.group)) return false
  // excludeTags 도 AND 조건. 하나라도 걸리면 이 규칙은 이 음식에 해당하지 않는다.
  if (match.excludeTags?.some((t) => food.tags.includes(t))) return false
  // minServing 도 AND 조건. 1회 분량에 그만큼 들어 있지 않으면 해당하지 않는다(모르면 통과).
  if (match.minServing) {
    /*
     * 한 성분만 곱해 본다. foodContribution 은 성분 스물아홉 개를 모두 계산해 새 객체를 만드는데,
     * 이 자리는 음식 하나를 볼 때마다 규칙 수만큼 불린다 — 그대로 불렀더니 29만 종 훑기가 여섯 배 느려졌다.
     */
    const per100 = food.per100[match.minServing.key]
    if (typeof per100 === 'number' && (per100 * food.serving.g) / 100 < match.minServing.value) return false
  }

  if (match.foodIds?.includes(food.id)) return true
  if (match.groups?.includes(food.group)) return true
  if (match.tags?.some((t) => food.tags.includes(t))) return true

  if (match.nutrient) {
    const { key, op, value, basis } = match.nutrient
    let v: number | undefined
    if (basis === 'per100') v = food.per100[key]
    else if (basis === 'serving') v = foodContribution(food, servings)[key]
    // basis === 'day' 는 개별 식품이 아니라 하루 합계에 대한 규칙이므로 여기서는 매칭하지 않는다
    if (typeof v === 'number') {
      if (op === '>' && v > value) return true
      if (op === '<' && v < value) return true
    }
  }
  return false
}

function matchesSupplement(match: RuleMatch, s: Supplement): boolean {
  if (match.supplementIds?.includes(s.id)) return true
  if (match.supplementCategories?.includes(s.category)) return true
  return false
}

/** 규칙이 현재 치료 시기에 적용되는지 */
function appliesToPhase(rule: NutritionRule, patient: PatientContext): boolean {
  if (!rule.phases || rule.phases.length === 0) return true
  if (rule.phases.includes('all')) return true
  return rule.phases.includes(patient.phase)
}

/**
 * 세부 변수가 맞는지.
 *
 * 아직 고르지 않았으면(빈 목록) 통과시킨다 — 자세히 적어 주신 분에게만
 * 더 정확해지는 것이지, 안 적으면 아무 말도 안 해 주는 식이면 곤란하다.
 */
function appliesToSubtype(rule: NutritionRule, patient: PatientContext): boolean {
  if (!rule.subtypes || rule.subtypes.length === 0) return true
  const mine = patient.subtypes ?? []
  if (mine.length === 0) return true
  return rule.subtypes.some((t) => mine.includes(t))
}

/**
 * 항암제로 치는 약의 계열.
 *
 * 항호르몬제(타목시펜·아로마타제 억제제·ADT)는 넣지 않았다. 수년씩 드시는 약이라
 * 여기에 넣으면 그 기간 내내 '항암제를 쓰는 중' 이 된다. 넣을지는 임상 판단이다.
 * 항응고제·보조약제는 항암제가 아니다.
 */
const ANTICANCER_CLASSES = new Set(['경구 항암제', '표적치료제', '항암제'])
const MED_CLASS: Record<string, string> = Object.fromEntries(MEDICATIONS.map((m) => [m.id, m.cls]))

/**
 * 지금 항암제를 쓰고 계신가.
 *
 * 두 길 가운데 하나면 그렇다고 본다.
 *  · 치료 시기가 '항암치료 중' 이거나 '호중구감소증' — 약을 고르지 않으셨어도 항암제를 쓰는 시기다
 *  · 복용 약에 항암제 계열이 있다 — 시기를 무엇으로 고르셨든 (방사선과 함께 드시는 카페시타빈,
 *    치료를 마쳤다고 고르고 유지요법으로 드시는 표적치료제)
 */
export function onAnticancerDrug(patient: PatientContext): boolean {
  if (patient.phase === 'during_chemo' || patient.phase === 'neutropenia') return true
  return (patient.medications ?? []).some((id) => ANTICANCER_CLASSES.has(MED_CLASS[id]))
}

function applies(rule: NutritionRule, patient: PatientContext): boolean {
  if (rule.onAnticancer && !onAnticancerDrug(patient)) return false
  return appliesToPhase(rule, patient) && appliesToSubtype(rule, patient)
}

/* ────────────────────────── 규칙 수집 ────────────────────────── */

/** 현재 환자 맥락에서 유효한 모든 규칙 */
export function activeRules(patient: PatientContext): RuleHit[] {
  const hits: RuleHit[] = []

  for (const r of COMMON_RULES) {
    if (applies(r, patient)) hits.push({ rule: r, source: '공통' })
  }

  const profile = CANCER_BY_ID[patient.cancer]
  for (const r of profile.rules) {
    if (applies(r, patient)) hits.push({ rule: r, source: '암종' })
  }

  for (const cond of patient.conditions) {
    for (const r of CONDITION_RULES[cond] ?? []) {
      if (applies(r, patient)) hits.push({ rule: r, source: '증상', sourceLabel: cond })
    }
  }

  return hits
}

/** 환자가 복용 중인 약제에 해당하는 상호작용만 추린다 */
export function activeInteractions(patient: PatientContext): InteractionHit[] {
  const also = (i: (typeof INTERACTIONS)[number]) => {
    if (!i.alsoTaking) return true
    const meds = i.alsoTaking.medications ?? [], conds = i.alsoTaking.conditions ?? []
    return meds.some((m) => patient.medications.includes(m)) || conds.some((c) => patient.conditions.includes(c))
  }
  return INTERACTIONS.filter((i) => patient.medications.includes(i.agent) && also(i)).map((i) => ({
    interaction: i,
    medicationName: i.agent
  }))
}

/* ────────────────────────── 평가 ────────────────────────── */

function strongestLevel(levels: RuleLevel[]): RuleLevel | null {
  if (levels.length === 0) return null
  return levels.reduce((a, b) => (LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a))
}

/** 식품 1건을 환자 맥락에서 평가한다 */
export function evaluateFood(
  food: Food,
  patient: PatientContext,
  servings = 1,
  cached?: { rules: RuleHit[]; interactions: InteractionHit[] }
): FoodVerdict {
  const rules = cached?.rules ?? activeRules(patient)
  const inter = cached?.interactions ?? activeInteractions(patient)

  /*
   * 염장·가공육·훈제 음식에는 '권장' 을 붙이지 않는다.
   *
   * 공통 단백질 규칙은 이 셋을 제외한다고 적어 두었고, 공통 채소 규칙도 염장을 뺀다.
   * 그런데 그 제외가 그 두 규칙에만 있었다. 암종별 권장 규칙 22개에는 없어서
   * 굴비(자반)가 폐암·췌장암에서 "체중을 지키는 것이 가장 중요한 영양 목표" 로,
   * 런천미트가 간암에서 "자기 전 간단한 야식이 근육 손실을 줄입니다" 로,
   * 배추김치가 유방암에서 "채소 중심 식사" 로 **권장**이 되었다(2026-10, 상식 검사가 찾음).
   *
   * 규칙마다 제외를 달면 다음 규칙에서 또 빠진다. 그래서 판정하는 이 한 자리에서 막는다.
   * 드시지 말라는 뜻이 아니다 — 권할 음식으로 내세우지 않을 뿐이고, 주의·피하세요는 그대로 간다.
   */
  const noPraise = food.tags.some((t) => NO_PRAISE_TAGS.has(t))
  const all = rules.filter((h) =>
    !(noPraise && h.rule.level === 'prefer') && matchesFood(h.rule.match, food, servings))
  const interactions = inter.filter((h) =>
    !(noPraise && h.interaction.level === 'prefer') && matchesFood(h.interaction.match, food, servings))

  const level = strongestLevel([
    ...all.map((h) => h.rule.level),
    ...interactions.map((h) => h.interaction.level)
  ])

  /*
   * 피해야 할 음식이면 권장 사유는 보여 주지 않는다.
   *
   * 두 규칙이 동시에 맞는 일이 실제로 있다. 폐암 방사선치료 중 견과는
   * 거친 질감이라 피해야 하지만, 악액질에는 열량이 높아 도움이 된다.
   * 둘 다 맞는 말이라 규칙을 고칠 것은 아니다.
   * 다만 화면에 "견과를 드세요" 와 "견과를 피하세요" 가 나란히 붙으면
   * 무엇을 믿어야 할지 알 수 없다. 결론이 '피하세요' 라면 그 이유만 보여 준다.
   */
  const hits = level === 'avoid' ? all.filter((h) => h.rule.level !== 'prefer') : all

  return { food, level, hits, interactions }
}

export interface SupplementVerdict {
  supplement: Supplement
  level: RuleLevel | null
  hits: RuleHit[]
  interactions: InteractionHit[]
}

export function evaluateSupplement(
  s: Supplement,
  patient: PatientContext,
  cached?: { rules: RuleHit[]; interactions: InteractionHit[] }
): SupplementVerdict {
  const rules = cached?.rules ?? activeRules(patient)
  const inter = cached?.interactions ?? activeInteractions(patient)

  const hits = rules.filter((h) => matchesSupplement(h.rule.match, s))
  const interactions = inter.filter((h) => matchesSupplement(h.interaction.match, s))

  const level = strongestLevel([
    ...hits.map((h) => h.rule.level),
    ...interactions.map((h) => h.interaction.level)
  ])

  return { supplement: s, level, hits, interactions }
}

/** 선택한 식품 전체에 대한 평가 — 중복 경고는 규칙 단위로 합친다 */
export function evaluateSelection(items: SelectedItem[], patient: PatientContext) {
  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  const verdicts = items
    .map((i) => {
      const food = FOOD_BY_ID[i.foodId]
      return food ? evaluateFood(food, patient, i.servings, cached) : null
    })
    .filter((v): v is FoodVerdict => v !== null)

  /** 규칙 id → 그 규칙에 걸린 식품들 */
  const byRule = new Map<string, { hit: RuleHit; foods: Food[] }>()
  for (const v of verdicts) {
    for (const h of v.hits) {
      const cur = byRule.get(h.rule.id)
      if (cur) cur.foods.push(v.food)
      else byRule.set(h.rule.id, { hit: h, foods: [v.food] })
    }
  }

  const byInteraction = new Map<string, { hit: InteractionHit; foods: Food[] }>()
  for (const v of verdicts) {
    for (const h of v.interactions) {
      const cur = byInteraction.get(h.interaction.id)
      if (cur) cur.foods.push(v.food)
      else byInteraction.set(h.interaction.id, { hit: h, foods: [v.food] })
    }
  }

  const grouped = [...byRule.values()].sort(
    (a, b) => LEVEL_RANK[b.hit.rule.level] - LEVEL_RANK[a.hit.rule.level]
  )

  return { verdicts, grouped, interactions: [...byInteraction.values()] }
}
