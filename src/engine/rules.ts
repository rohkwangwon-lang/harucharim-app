import type {
  CancerId, Food, NutritionRule, PatientContext, RuleLevel, RuleMatch,
  SelectedItem, Supplement, Interaction
} from '../data/types'
import { FOOD_BY_ID } from '../data/foods'
import { CANCER_BY_ID } from '../data/cancers'
import { COMMON_RULES } from '../data/commonRules'
import { CONDITION_RULES } from '../data/conditionRules'
import { INTERACTIONS } from '../data/interactions'
import { foodContribution } from './nutrition'

/** 규칙의 강도 — 여러 규칙이 같은 식품에 걸리면 강한 쪽을 대표로 쓴다 */
const LEVEL_RANK: Record<RuleLevel, number> = { avoid: 3, caution: 2, prefer: 1, info: 0 }

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

/* ────────────────────────── 규칙 수집 ────────────────────────── */

/** 현재 환자 맥락에서 유효한 모든 규칙 */
export function activeRules(patient: PatientContext): RuleHit[] {
  const hits: RuleHit[] = []

  for (const r of COMMON_RULES) {
    if (appliesToPhase(r, patient)) hits.push({ rule: r, source: '공통' })
  }

  const profile = CANCER_BY_ID[patient.cancer]
  for (const r of profile.rules) {
    if (appliesToPhase(r, patient)) hits.push({ rule: r, source: '암종' })
  }

  for (const cond of patient.conditions) {
    for (const r of CONDITION_RULES[cond] ?? []) {
      if (appliesToPhase(r, patient)) hits.push({ rule: r, source: '증상', sourceLabel: cond })
    }
  }

  return hits
}

/** 환자가 복용 중인 약제에 해당하는 상호작용만 추린다 */
export function activeInteractions(patient: PatientContext): InteractionHit[] {
  return INTERACTIONS.filter((i) => patient.medications.includes(i.agent)).map((i) => ({
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

  const hits = rules.filter((h) => matchesFood(h.rule.match, food, servings))
  const interactions = inter.filter((h) => matchesFood(h.interaction.match, food, servings))

  const level = strongestLevel([
    ...hits.map((h) => h.rule.level),
    ...interactions.map((h) => h.interaction.level)
  ])

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

/** 특정 암종에서 이 식품이 "권장" 대상인지 빠르게 확인 (메뉴 추천에서 사용) */
export function preferenceScore(food: Food, patient: PatientContext, cached: { rules: RuleHit[]; interactions: InteractionHit[] }): number {
  const v = evaluateFood(food, patient, 1, cached)
  if (v.level === 'avoid') return -100
  if (v.level === 'caution') return -20
  const prefers = v.hits.filter((h) => h.rule.level === 'prefer').length
  return prefers * 10
}

export const LEVEL_LABEL: Record<RuleLevel, string> = {
  avoid: '피하세요',
  caution: '주의',
  prefer: '권장',
  info: '참고'
}

export function cancerName(id: CancerId): string {
  return CANCER_BY_ID[id].name
}
