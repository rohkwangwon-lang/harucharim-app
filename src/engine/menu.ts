import type { Cuisine, EvidenceLevel, Food, FoodGroup, MealSlot, PatientContext, Season, SelectedItem } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { CURATED_FOODS, FOOD_BY_ID } from '../data/foods'
import { CANCER_BY_ID } from '../data/cancers'
import { activeInteractions, activeRules, evaluateFood, type RuleHit, type InteractionHit } from './rules'
import { addTotals, foodContribution, personalTarget, type NutrientTotals } from './nutrition'

export type { MealSlot }
export { MEAL_SLOTS }

export interface MenuEntry {
  food: Food
  servings: number
  /** 사용자가 직접 고른 것인지, 앱이 채운 것인지 */
  origin: 'chosen' | 'added'
  /** 무엇을 채우려고 넣었는지 (예: '단백질 31 g 보충') */
  contribution?: string
  /** 어떤 권고에 따른 것인지 */
  ruleTitle?: string
  /** 그 권고의 근거 수준과 출처 */
  evidence?: EvidenceLevel
  refIds?: string[]
  /** 제철이라서 우선 배치했는지 */
  seasonal?: boolean
}

export interface DayMenu {
  /** 이 식단이 다루는 범위 — 화면에 그대로 표시한다 */
  scope: '하루(24시간) 전체'
  /** 기준이 된 계절 */
  season: Season
  meals: Record<MealSlot, MenuEntry[]>
  totals: NutrientTotals
  target: { kcal: [number, number]; protein: [number, number]; fluid: number }
  /** 사용자가 골랐지만 이 암종에서 피해야 해 제외한 항목 */
  removed: { food: Food; reason: string; alternative?: Food }[]
  /** 목표 대비 부족·초과 요약 */
  notes: string[]
}

/** 식품군 → 어느 끼니에 어울리는지 */
const SLOT_BY_GROUP: Record<FoodGroup, MealSlot[]> = {
  '곡류·전분': ['아침', '점심', '저녁'],
  '두류·대두가공': ['아침', '점심', '저녁'],
  '견과·종실': ['간식'],
  채소: ['점심', '저녁'],
  '해조·버섯': ['아침', '점심', '저녁'],
  과일: ['간식'],
  육류: ['점심', '저녁'],
  '가금류·난류': ['아침', '점심', '저녁'],
  어패류: ['점심', '저녁'],
  '우유·유제품': ['아침', '간식'],
  '유지·당류': ['점심', '저녁'],
  '국·탕·찌개': ['아침', '점심', '저녁'],
  '밥·면·죽 요리': ['아침', '점심', '저녁'],
  '반찬·조림·볶음': ['점심', '저녁'],
  가공식품: ['간식'],
  음료: ['간식'],
  '간식·디저트': ['간식'],
  '외식·프랜차이즈': ['점심', '저녁'],
  '경장영양·환자식': ['간식']
}

/** 오늘 날짜로 계절을 판정한다. 제철 재료를 우선 배치하기 위한 것이다. */
export function currentSeason(date = new Date()): Season {
  var m = date.getMonth() + 1
  if (m >= 3 && m <= 5) return '봄'
  if (m >= 6 && m <= 8) return '여름'
  if (m >= 9 && m <= 11) return '가을'
  return '겨울'
}

/** 이 식품이 지금 제철인지 */
function isSeasonal(food: Food, season: Season): boolean {
  if (!food.season || food.season.length === 0) return false
  return food.season.includes(season)
}

/** 사용자가 허용한 요리 계통인지. 비어 있으면 한식만 쓴다. */
function allowedCuisine(food: Food, allowed: Cuisine[]): boolean {
  var c = food.cuisine ?? '한식'
  if (c === '무관') return true
  return allowed.includes(c)
}

function slotsFor(food: Food): MealSlot[] {
  return SLOT_BY_GROUP[food.group] ?? ['점심', '저녁']
}

/**
 * 피해야 할 식품에 대한 대체 식품을 찾는다.
 *
 * 단순히 "같은 식품군에서 아무거나"가 아니라, 원래 식품과 역할이 비슷한 것을 고른다.
 * 김치를 뺐다면 계란말이가 아니라 백김치를 제안해야 실제로 바꿔 먹을 수 있다.
 * 그래서 태그가 얼마나 겹치는지를 가장 크게 본다 — 단, 문제가 된 태그는 겹쳐도 점수를 주지 않는다.
 */
export function suggestAlternative(
  food: Food,
  patient: PatientContext,
  cached: { rules: RuleHit[]; interactions: InteractionHit[] }
): Food | undefined {
  const offending = new Set(
    evaluateFood(food, patient, 1, cached)
      .hits.filter((h) => h.rule.level === 'avoid' || h.rule.level === 'caution')
      .flatMap((h) => h.rule.match.tags ?? [])
  )
  const ownTags = food.tags.filter((t) => !offending.has(t))

  const scored = CURATED_FOODS.filter((f) => f.id !== food.id && f.group === food.group)
    .map((f) => {
      const v = evaluateFood(f, patient, 1, cached)
      if (v.level === 'avoid' || v.level === 'caution') return null
      const overlap = ownTags.filter((t) => f.tags.includes(t)).length
      const prefers = v.hits.filter((h) => h.rule.level === 'prefer').length
      // 열량이 비슷할수록 식단에서 자리를 그대로 대신할 수 있다
      const kcalGap = Math.abs(f.per100.kcal - food.per100.kcal) / Math.max(50, food.per100.kcal)
      return { food: f, score: overlap * 10 + prefers * 3 - kcalGap * 2 }
    })
    .filter((x): x is { food: Food; score: number } => x !== null)

  if (scored.length === 0) return undefined
  return scored.sort((a, b) => b.score - a.score)[0].food
}

/** pickFillers 가 돌려주는 한 건 */
interface Filler {
  food: Food
  servings: number
  contribution: string
  ruleTitle: string
  evidence: EvidenceLevel
  refIds: string[]
}

/**
 * 하루 메뉴를 구성한다.
 *
 * 1) 사용자가 고른 것 중 '피하세요' 판정을 받은 항목은 빼고 대체안을 제시한다.
 * 2) 남은 것을 끼니에 배치한다.
 * 3) 열량·단백질 목표에 미달하면, 이 암종에서 권장 쪽인 식품으로 부족분을 채운다.
 */
export function buildDayMenu(chosen: SelectedItem[], patient: PatientContext): DayMenu {
  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)

  const season = currentSeason()
  const cuisines: Cuisine[] = patient.cuisines && patient.cuisines.length ? patient.cuisines : ['한식']

  const meals: Record<MealSlot, MenuEntry[]> = { 아침: [], 점심: [], 저녁: [], 간식: [] }
  const removed: DayMenu['removed'] = []
  let totals: NutrientTotals = {}

  // 1) 선택 항목 분류
  const keep: { food: Food; servings: number; meal?: MealSlot }[] = []
  for (const item of chosen) {
    const food = FOOD_BY_ID[item.foodId]
    if (!food) continue
    const v = evaluateFood(food, patient, item.servings, cached)
    if (v.level === 'avoid') {
      const avoidHit = v.hits.find((h) => h.rule.level === 'avoid')
      const interHit = v.interactions.find((h) => h.interaction.level === 'avoid')
      removed.push({
        food,
        reason: avoidHit?.rule.title ?? interHit?.interaction.title ?? '이 암종에서 권장되지 않습니다',
        alternative: suggestAlternative(food, patient, cached)
      })
    } else {
      keep.push({ food, servings: item.servings, meal: item.meal })
    }
  }

  // 2) 끼니 배치 — 사용자가 지정했으면 그대로 두고, 안 했으면 식품군에 맞춰 순환 배치한다
  const slotCursor: Record<string, number> = {}
  for (const { food, servings, meal } of keep) {
    let slot: MealSlot
    if (meal) {
      slot = meal
    } else {
      const slots = slotsFor(food)
      const key = slots.join('|')
      const idx = (slotCursor[key] ?? 0) % slots.length
      slotCursor[key] = idx + 1
      slot = slots[idx]
    }
    meals[slot].push({ food, servings, origin: 'chosen', seasonal: isSeasonal(food, season) })
    totals = addTotals(totals, foodContribution(food, servings))
  }

  // 3) 부족분 채우기
  const notes: string[] = []
  const kcalGap = target.kcal[0] - (totals.kcal ?? 0)
  const proteinGap = target.protein[0] - (totals.protein ?? 0)
  const fiberGap = (profile.target.fiberTarget?.[0] ?? 20) - (totals.fiber ?? 0)
  const naBudget = (profile.target.naLimit ?? 2000) - (totals.na ?? 0)

  if (kcalGap > 100 || proteinGap > 10 || fiberGap > 5) {
    const fillers = pickFillers(
      patient, cached, kcalGap, proteinGap, fiberGap, naBudget,
      new Set(keep.map((k) => k.food.id)), season, cuisines
    )
    for (const f of fillers) {
      const slots = slotsFor(f.food)
      // 가장 항목이 적은 끼니에 넣는다
      const slot = slots.reduce((a, b) => (meals[a].length <= meals[b].length ? a : b))
      meals[slot].push({
        food: f.food, servings: f.servings, origin: 'added',
        contribution: f.contribution, ruleTitle: f.ruleTitle,
        evidence: f.evidence, refIds: f.refIds,
        seasonal: isSeasonal(f.food, season)
      })
      totals = addTotals(totals, foodContribution(f.food, f.servings))
    }
  }

  // 4) 요약
  const kcal = totals.kcal ?? 0
  const protein = totals.protein ?? 0
  const na = totals.na ?? 0

  if (kcal < target.kcal[0]) {
    notes.push(
      `열량이 목표(${target.kcal[0]}~${target.kcal[1]} kcal)보다 ${Math.round(target.kcal[0] - kcal)} kcal 부족합니다. ` +
      '견과·유제품·경구영양보충 음료처럼 부피 대비 열량이 높은 것을 간식으로 더해 보세요.'
    )
  } else if (kcal > target.kcal[1] * 1.15) {
    notes.push(`열량이 목표 상단(${target.kcal[1]} kcal)을 넘습니다. 치료 중이라면 문제가 아닐 수 있으나, 체중 관리기라면 조정이 필요합니다.`)
  } else {
    notes.push(`열량 ${Math.round(kcal)} kcal — 목표 범위(${target.kcal[0]}~${target.kcal[1]} kcal)에 들어옵니다.`)
  }

  if (protein < target.protein[0]) {
    notes.push(
      `단백질이 목표(${target.protein[0]}~${target.protein[1]} g)보다 ${Math.round(target.protein[0] - protein)} g 부족합니다. ` +
      '계란·두부·생선·닭가슴살 중 하나를 한 끼에 더하면 대개 채워집니다.'
    )
  } else {
    notes.push(`단백질 ${Math.round(protein)} g — 목표(${target.protein[0]} g 이상)를 충족합니다.`)
  }

  const naLimit = profile.target.naLimit ?? 2000
  if (na > naLimit) {
    notes.push(
      `나트륨이 ${Math.round(na)} mg 으로 이 암종의 권고 상한(${naLimit} mg)을 넘습니다. ` +
      '국물을 남기는 것만으로 상당 부분이 줄어듭니다.'
    )
  }

  const fiber = totals.fiber ?? 0
  const fiberTarget = profile.target.fiberTarget
  if (fiberTarget && fiber < fiberTarget[0]) {
    notes.push(`식이섬유가 ${Math.round(fiber)} g 으로 목표(${fiberTarget[0]}~${fiberTarget[1]} g)에 못 미칩니다.`)
  }

  return { scope: '하루(24시간) 전체', season, meals, totals, target, removed, notes }
}

/**
 * 부족한 부분을 채울 식품을 고른다.
 *
 * 단순히 "단백질이 가장 많은 것"을 집으면 위 절제 환자에게 양고기를 권하는 식의 결과가 나온다.
 * 그래서 다음을 함께 본다.
 *  - 이 암종·증상에서 권장 근거가 있는가 (공통 규칙보다 암종·증상 규칙에 더 큰 가중치)
 *  - 지금 제철인가 (제철 재료를 우선 배치한다)
 *  - 사용자가 허용한 요리 계통인가 (기본은 한식)
 *  - 이 암종에서 굳이 늘릴 이유가 없는 성질인가 (적색육·직화구이·초가공·고지방에 감점)
 *  - 남은 나트륨 예산 안에 들어오는가
 * 그리고 한 식품군에 몰리지 않도록 군당 최대 2개까지만 넣는다.
 */
function pickFillers(
  patient: PatientContext,
  cached: { rules: RuleHit[]; interactions: InteractionHit[] },
  kcalGap: number,
  proteinGap: number,
  fiberGap: number,
  naBudget: number,
  exclude: Set<string>,
  season: Season,
  cuisines: Cuisine[]
): Filler[] {
  const PENALTY: Partial<Record<string, number>> = {
    적색육: 12, 직화구이: 8, 초가공식품: 12, 튀김: 10, 가공육: 30,
    고지방: 5, 포화지방높음: 5, 고나트륨: 8, 고당: 6, 염장: 20, 거친질감: 3
  }

  /**
   * 환자가 직접 고르는 것은 막지 않지만, 앱이 먼저 권하지는 않는 성질.
   * 규칙상 금기가 아닌 시기라도 치료 중인 환자에게 회나 술을 제안하는 것은 부적절하다.
   */
  const NEVER_SUGGEST = new Set(['생식', '알코올', '가공육', '염장', '훈제'])

  interface Cand {
    food: Food
    score: number
    /** 이 식품에 걸린 권장 규칙들 — 어떤 이유로 넣었는지 설명할 때 고른다 */
    prefers: RuleHit[]
    seasonal: boolean
    kcal: number
    protein: number
    fiber: number
    na: number
  }

  const candidates: Cand[] = []
  /**
   * 후보는 손으로 검토한 식품에서만 고른다.
   *
   * 공공데이터에서 들여온 것은 성분값은 믿을 만하지만 1회 제공량이 부정확하고
   * ("삶아서 말린 나물" 100 g 처럼 실제로 먹지 않는 양), 이상치도 섞여 있다.
   * 검색해서 찾아보는 데는 쓸모가 있어도, 앱이 먼저 권하는 자리에는 맞지 않는다.
   */
  for (const f of CURATED_FOODS) {
    if (exclude.has(f.id)) continue
    // 조미료·기름처럼 그 자체로 한 끼를 이루지 않는 것은 제안하지 않는다
    if (f.group === '유지·당류') continue
    if (f.tags.some((t) => NEVER_SUGGEST.has(t))) continue
    if (!allowedCuisine(f, cuisines)) continue
    // 사람이 한 번에 먹는 양으로 보기 어려운 것은 제외한다
    if (f.serving.g < 10) continue

    const v = evaluateFood(f, patient, 1, cached)
    if (v.level === 'avoid' || v.level === 'caution') continue

    const prefers = v.hits.filter((h) => h.rule.level === 'prefer')
    if (prefers.length === 0) continue

    // 암종·증상 규칙에서 나온 권장을 공통 규칙보다 높게 친다
    let score = 0
    for (const h of prefers) score += h.source === '공통' ? 6 : 14
    for (const t of f.tags) score -= PENALTY[t] ?? 0

    const seasonal = isSeasonal(f, season)
    if (seasonal) score += 10

    const c = foodContribution(f, 1)
    const kcal = c.kcal ?? 0
    const protein = c.protein ?? 0
    // 1회 제공량 기준으로 말이 되지 않는 값은 데이터 오류로 보고 거른다
    if (kcal > 900 || protein > 80) continue

    candidates.push({
      food: f, score, prefers, seasonal,
      kcal, protein, fiber: c.fiber ?? 0, na: c.na ?? 0
    })
  }

  /**
   * 이 식품을 넣은 이유로 가장 잘 맞는 규칙을 고른다.
   * 예를 들어 섬유를 채우려고 넣었다면 섬유를 다루는 규칙의 문장을 보여준다.
   */
  const explain = (c: Cand, wantTags: string[]): RuleHit => {
    const matched = c.prefers.find((h) => h.rule.match.tags?.some((t) => wantTags.includes(t)))
    return matched ?? c.prefers.find((h) => h.source !== '공통') ?? c.prefers[0]
  }

  const out: Filler[] = []
  const groupCount = new Map<string, number>()
  let na = naBudget
  let remainingProtein = proteinGap
  let remainingKcal = kcalGap
  let remainingFiber = fiberGap

  const take = (c: Cand, contribution: string, wantTags: string[]) => {
    const hit = explain(c, wantTags)
    out.push({
      food: c.food,
      servings: 1,
      contribution,
      ruleTitle: hit.rule.title,
      evidence: hit.rule.evidence,
      refIds: hit.rule.refIds
    })
    groupCount.set(c.food.group, (groupCount.get(c.food.group) ?? 0) + 1)
    na -= c.na
    remainingProtein -= c.protein
    remainingKcal -= c.kcal
    remainingFiber -= c.fiber
  }

  const usable = (c: Cand) =>
    !out.some((o) => o.food.id === c.food.id) &&
    (groupCount.get(c.food.group) ?? 0) < 2 &&
    c.na <= Math.max(200, na)

  // 1) 단백질 — 치료 중 우선순위가 열량보다 높다
  const byProtein = [...candidates]
    .filter((c) => c.protein >= 7)
    .sort((a, b) => b.score + b.protein - (a.score + a.protein))
  for (const c of byProtein) {
    if (remainingProtein <= 5 || out.length >= 3) break
    if (!usable(c)) continue
    take(c, `단백질 ${Math.round(c.protein)} g 보충`, ['고단백'])
  }

  // 2) 식이섬유 — 채소·과일·해조가 하나도 없는 식단을 막는다
  const byFiber = [...candidates]
    .filter((c) => c.fiber >= 1.5)
    .sort((a, b) => b.score + b.fiber * 2 - (a.score + a.fiber * 2))
  for (const c of byFiber) {
    if (remainingFiber <= 3 || out.length >= 6) break
    if (!usable(c)) continue
    take(c, `식이섬유 ${c.fiber.toFixed(1)} g 보충`, ['고식이섬유', '십자화과', '저잔사'])
  }

  // 3) 남은 열량
  const byKcal = [...candidates]
    .filter((c) => c.kcal >= 80)
    .sort((a, b) => b.score + b.kcal / 20 - (a.score + a.kcal / 20))
  for (const c of byKcal) {
    if (remainingKcal <= 150 || out.length >= 7) break
    if (!usable(c)) continue
    take(c, `열량 ${Math.round(c.kcal)} kcal 보충`, ['고열량밀도'])
  }

  return out
}
