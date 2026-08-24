import type { Cuisine, EvidenceLevel, Food, FoodGroup, MealSlot, NutrientKey, PatientContext, Season, SelectedItem, Supplement } from '../data/types'
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
  /** 음식과 영양제를 모두 합한 하루 총계 — 화면에 나오는 '합계'는 항상 이 값이다 */
  totals: NutrientTotals
  /** 그중 영양제에서 온 몫. 음식 소계와 합계가 안 맞아 보이지 않도록 따로 밝힌다. */
  suppTotals: NutrientTotals
  /** 끼니별 소계 — 항목을 더한 값이 그대로 여기 담긴다 */
  slotTotals: Record<MealSlot, NutrientTotals>
  target: { kcal: [number, number]; protein: [number, number]; fluid: number }
  /** 사용자가 골랐지만 이 암종에서 피해야 해 제외한 항목 */
  removed: { food: Food; reason: string; alternative?: Food }[]
  /** 목표 대비 부족·초과 요약 */
  notes: DayNote[]
  /**
   * 끼니별 설명. 비어 있는 끼니의 사유이거나,
   * 예산이 빠듯해 가볍게 채운 끼니의 사정이다.
   */
  slotNotes: Partial<Record<MealSlot, string>>
}

/** 식품군 → 어느 끼니에 어울리는지 */
const SLOT_BY_GROUP: Record<FoodGroup, MealSlot[]> = {
  '곡류·전분': ['아침', '점심', '저녁'],
  '두류·대두가공': ['아침', '점심', '저녁'],
  '견과·종실': ['간식'],
  채소: ['점심', '저녁'],
  '해조·버섯': ['아침', '점심', '저녁'],
  // 과일은 식후 후식으로도 먹는다. 간식으로만 묶어 두면 간식이 차는 순간
  // 아침으로 몰려, 가벼워야 할 아침이 가장 무거운 끼니가 된다.
  과일: ['아침', '점심', '저녁', '간식'],
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

/**
 * 사용자가 허용한 요리 계통인지.
 *
 * 한식은 언제나 포함한다. 이 앱의 바탕은 제철 한식이고, 양식·중식·일식은
 * 거기에 더하는 것이지 대신하는 것이 아니다.
 * 검토분에 중식은 8가지, 동남아는 1가지뿐이라 그것만으로는 하루가 만들어지지 않는다.
 * 실제로 "동남아만" 고르면 열량이 목표의 절반에도 못 미치는 하루가 나왔다.
 */
function allowedCuisine(food: Food, allowed: Cuisine[]): boolean {
  var c = food.cuisine ?? '한식'
  if (c === '무관' || c === '한식') return true
  return allowed.includes(c)
}

function slotsFor(food: Food): MealSlot[] {
  return SLOT_BY_GROUP[food.group] ?? ['점심', '저녁']
}

/**
 * 끼니가 지정되지 않은 항목을 어느 끼니로 볼지 정한다.
 *
 * 초기 판에는 끼니 개념이 아예 없어서, 그때 담은 기록에는 끼니가 비어 있다.
 * 그런 항목은 '내 식단'의 어느 끼니에도 걸리지 않아 화면에서 사라지는데,
 * 합계와 추천 화면에는 남아 있어 "담지 않은 것이 아침에 들어가 있다"로 보였다.
 * 불러올 때 한 번 채워 넣어 그런 항목이 없게 만든다.
 */
export function defaultSlotFor(food: Food | undefined): MealSlot {
  if (!food) return '점심'
  const slots = slotsFor(food)
  // 어느 끼니였는지 알 수 없는 기록이다. 그렇다면 점심이 가장 무난하다 —
  // 아침으로 몰아 두면 삼계탕이 아침상에 올라간 것처럼 보인다.
  return slots.includes('점심') ? '점심' : slots[0]
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

/**
 * 식재료 이름에서 요리 이름과 맞춰 볼 핵심어를 뽑는다.
 *   "두부(부침용)" → "두부",  "시금치(데친 것)" → "시금치"
 */
function coreWord(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '')
    .replace(/(생것|삶은 것|데친 것|찐 것|말린 것|가루|분말)/g, '')
    .trim()
}

export interface IngredientIdea {
  /** 사용자가 담은 식재료 */
  source: Food
  /** 그 식재료로 만들 수 있는 요리들 */
  dishes: Food[]
}

/**
 * 담은 식재료를 쓰는 요리를 찾아 준다.
 *
 * 두부를 담아 두면 "그래서 두부로 뭘 해 먹지" 가 다음 질문이다.
 * 이름이 겹치는 요리를 찾아 그 답을 미리 내놓는다.
 */
export function ideasFromIngredients(
  chosen: SelectedItem[],
  patient: PatientContext,
  limitPerItem = 4
): IngredientIdea[] {
  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  const cuisines: Cuisine[] = patient.cuisines && patient.cuisines.length ? patient.cuisines : ['한식']
  const chosenIds = new Set(chosen.map((c) => c.foodId))
  const out: IngredientIdea[] = []

  for (const item of chosen) {
    const src = FOOD_BY_ID[item.foodId]
    if (!src || src.form !== 'ingredient') continue

    const key = coreWord(src.name)
    if (key.length < 2) continue

    const dishes = CURATED_FOODS.filter((f) => {
      if (f.id === src.id || chosenIds.has(f.id)) return false
      if (f.form === 'ingredient') return false
      if (!f.name.includes(key)) return false
      if (!allowedCuisine(f, cuisines)) return false
      const v = evaluateFood(f, patient, 1, cached)
      return v.level !== 'avoid'
    })
      .sort((a, b) => {
        // 이 암종에서 권장되는 것을 먼저
        const av = evaluateFood(a, patient, 1, cached).hits.filter((h) => h.rule.level === 'prefer').length
        const bv = evaluateFood(b, patient, 1, cached).hits.filter((h) => h.rule.level === 'prefer').length
        if (av !== bv) return bv - av
        return (a.per100.na ?? 0) - (b.per100.na ?? 0)
      })
      .slice(0, limitPerItem)

    if (dishes.length > 0) out.push({ source: src, dishes })
  }
  return out
}

/**
 * 하루 메뉴를 구성한다.
 *
 * 1) 사용자가 고른 것 중 '피하세요' 판정을 받은 항목은 빼고 대체안을 제시한다.
 * 2) 남은 것을 끼니에 배치한다.
 * 3) 열량·단백질 목표에 미달하면, 이 암종에서 권장 쪽인 식품으로 부족분을 채운다.
 */
export interface MenuOptions {
  /** 복용 중인 영양제 */
  supplements?: Supplement[]
  /**
   * 이 식단이 어느 날의 것인지 ('YYYY-MM-DD').
   * 같은 날이면 몇 번을 열어도 같은 식단이 나오고, 날이 바뀌면 달라진다.
   */
  day?: string
  /** '다시 구성'을 누른 횟수 — 같은 날에도 다른 안을 볼 수 있게 한다 */
  nonce?: number
  /**
   * 최근에 드신 식품과 며칠 전인지.
   * 어제 먹은 것이 오늘 또 올라오면 추천으로 읽히지 않는다.
   */
  recent?: Map<string, number>
  /**
   * 며칠 전까지 거슬러 보고 겹치지 않게 할지.
   *
   * day 를 주면서 이 값을 두면, 그 며칠 치를 앞에서부터 차례로 만들어 보고
   * 거기 나온 것을 피해 오늘 것을 짠다. 따로 저장해 두지 않아도
   * "사흘 안에 같은 것을 다시 권하지 않는다" 가 지켜진다.
   */
  lookback?: number
}

/**
 * 최근 며칠간 기록에 남은 식품과 며칠 전인지.
 *
 * 어제 드신 것이 오늘 추천에 또 올라오면 추천으로 읽히지 않는다.
 * 실제로 드신 기록을 근거로 삼으므로, 기록을 남기실수록 식단이 다양해진다.
 */
export function recentFoods(
  diary: Record<string, SelectedItem[]>,
  day: string,
  days = REPEAT_FADE_DAYS
): Map<string, number> {
  const out = new Map<string, number>()
  const today = daysSinceEpoch(day)
  for (const [key, items] of Object.entries(diary)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    const ago = today - daysSinceEpoch(key)
    if (ago <= 0 || ago > days) continue
    for (const it of items) {
      const prev = out.get(it.foodId)
      if (prev === undefined || ago < prev) out.set(it.foodId, ago)
    }
  }
  return out
}

/** 'YYYY-MM-DD' 가 기준일로부터 며칠째인지 */
function daysSinceEpoch(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000)
}

/**
 * 엇비슷한 후보를 몇 개까지 묶어 차례를 돌릴 것인가.
 * 넷이면 같은 주요리가 다시 나오기까지 대개 나흘이 걸린다.
 */
const ROTATE_POOL = 5
/** 이 점수 차이 안쪽이면 '엇비슷하다'고 본다 */
const ROTATE_TOLERANCE = 28

/** 기록에 남은 것 중 며칠 안에는 다시 권하지 않는다 */
const REPEAT_BLOCK_DAYS = 3
/** 그 뒤로도 얼마 동안은 뒤로 미룬다 */
const REPEAT_FADE_DAYS = 7
/** 이 열량을 넘는 것만 '되풀이'로 친다. 곁들이는 것까지 막을 이유는 없다. */
const REPEAT_MIN_KCAL = 150

export function buildDayMenu(
  chosen: SelectedItem[],
  patient: PatientContext,
  supplementsOrOptions: Supplement[] | MenuOptions = [],
  extra?: MenuOptions
): DayMenu {
  const opts: MenuOptions = Array.isArray(supplementsOrOptions)
    ? { supplements: supplementsOrOptions, ...extra }
    : supplementsOrOptions

  const supplements = opts.supplements ?? []
  const recent = opts.recent ?? new Map<string, number>()
  /*
   * 그날의 차례.
   *
   * 사흘 안에 같은 주요리가 다시 나오지 않게 하려면, "지난 사흘에 무엇이 나왔는지"를
   * 알아야 한다. 그런데 그걸 저장하지 않고 다시 만들어 보게 했더니,
   * 되짚는 깊이가 날마다 달라져 어제 실제로 보여 준 것과 다른 답이 나왔다.
   *
   * 그래서 기억하는 대신 차례를 돌린다.
   * 점수가 엇비슷한 후보 몇을 묶어 두고 날짜에 따라 차례로 꺼낸다.
   * 묶음이 넷이면 같은 것이 다시 나오기까지 나흘이 걸린다 — 저장할 것이 없고,
   * 기기를 바꿔도 기록을 지워도 같은 성질이 유지된다.
   */
  const dayIndex = opts.day ? daysSinceEpoch(opts.day) + (opts.nonce ?? 0) : (opts.nonce ?? 0)

  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const naLimit = profile.target.naLimit ?? 2000

  const season = currentSeason()
  const cuisines: Cuisine[] = patient.cuisines && patient.cuisines.length ? patient.cuisines : ['한식']

  const meals: Record<MealSlot, MenuEntry[]> = { 아침: [], 점심: [], 저녁: [], 간식: [] }
  const removed: DayMenu['removed'] = []
  const slotNotes: DayMenu['slotNotes'] = {}

  /*
   * 영양제도 하루 섭취량에 들어간다.
   * 경장영양 계열은 한 캔에 나트륨이 200 mg 가까이 들어 있어, 빼놓고 세면
   * 다른 화면과 숫자가 달라진다. 처음부터 예산에 넣고 시작한다.
   */
  let suppTotals: NutrientTotals = {}
  for (const sup of supplements) suppTotals = addTotals(suppTotals, sup.perDay as NutrientTotals)

  let foodTotals: NutrientTotals = {}

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
    foodTotals = addTotals(foodTotals, foodContribution(food, servings))
  }

  /** 지금까지의 음식 + 영양제 합계 */
  const running = (): NutrientTotals => addTotals(foodTotals, suppTotals)

  const used = new Set(keep.map((k) => k.food.id))
  const candidates = collectCandidates(patient, cached, cuisines, season)
  /*
   * 보충 단계에서 쓸 후보. 여기서는 영양보충 음료도 넣는다 —
   * 하루를 다 짜고도 열량이 모자란다면 그것이 곧 경구영양보충의 적응증이다.
   */
  const topUpPool = collectCandidates(patient, cached, cuisines, season, true)
    .filter((c) => c.na <= 120 && (c.kcal >= 60 || c.protein >= 5))

  // 3) 부족분 채우기
  const notes: DayNote[] = []
  const fiber = fiberGoal(patient, profile)
  const fiberTarget = fiber.range[0]

  /*
   * 목표에 닿을 때까지 한 가지씩 고른다.
   *
   * 예전에는 "단백질 3개 → 섬유 3개 → 열량 1개" 로 칸을 정해 두고 채웠다.
   * 그래서 앞선 몇 가지가 나트륨 예산을 다 써 버리면 뒤가 통째로 막혔다.
   * 실제로 처음부터 구성한 하루의 90 % 가 열량 미달, 98 % 가 식이섬유 미달이었고,
   * 쓸 수 있는 후보 44 종이 남아 있는데도 멈춰 있었다.
   *
   * 이제는 매번 "지금 가장 모자란 것을 나트륨 대비 가장 잘 채우는 것"을 고른다.
   * 한 가지가 남은 나트륨 예산의 절반 넘게 가져가지 못하게 막아, 뒤에 올 것의 자리를 남긴다.
   */
  const groupCount = new Map<string, number>()
  for (const k of keep) groupCount.set(k.food.group, (groupCount.get(k.food.group) ?? 0) + 1)
  const cap = snackCap(patient)
  /*
   * 끼니별 목표 열량. 하루 목표 범위의 가운데를 비중대로 나눈다.
   * 딱 맞출 수는 없고 맞출 필요도 없지만, 어느 끼니가 아직 제 몫에 모자란지
   * 견줄 잣대는 있어야 한다.
   */
  const midKcal = (target.kcal[0] + target.kcal[1]) / 2
  const shares = mealShares(patient)
  const quota: Record<MealSlot, number> = {
    아침: midKcal * shares['아침'], 점심: midKcal * shares['점심'],
    저녁: midKcal * shares['저녁'], 간식: midKcal * shares['간식']
  }

  for (let guard = 0; guard < 40; guard++) {
    const cur = running()
    const need = {
      kcal: target.kcal[0] - (cur.kcal ?? 0),
      protein: target.protein[0] - (cur.protein ?? 0),
      fiber: fiberTarget - (cur.fiber ?? 0)
    }
    if (need.kcal <= 25 && need.protein <= 2 && need.fiber <= 0.5) break

    /*
     * 나트륨 상한을 절대선으로 쓰면, 담으신 국·찌개 한 그릇이 예산을 다 써 버렸을 때
     * 앱이 남은 하루를 굶기게 된다. 비빔밥(나트륨 1,750 mg) 한 그릇을 담으면
     * 그 뒤로 아무것도 못 넣어, 열량이 목표에 못 미치는 하루가 76 % 였다.
     *
     * 암환자에게는 저영양이 먼저다(ESPEN).
     * 그렇다고 상한을 통째로 올리면 짠 음식이 먼저 뽑혀 오히려 나빠진다.
     * 그래서 상한은 그대로 두고, 모자란 동안에만 '아주 싱거운 것'에 한해 길을 열어 둔다.
     * 견과·과일·채소는 대개 100 mg 아래라 이 문으로 들어온다.
     */
    const na = cur.na ?? 0
    const room = { kcal: target.kcal[1] - (cur.kcal ?? 0), na: naLimit - na }
    /*
     * 한 가지가 가져가도 되는 나트륨의 최대치.
     *  - 예산이 남아 있으면 그 절반까지. 뒤에 올 것의 자리를 남겨야 한다.
     *  - 예산이 없어도 열량·단백질이 모자라면 250 mg 이하는 받는다.
     *    견과·과일·나물은 대개 여기 들어온다.
     *  - 상한의 1.5 배를 넘어서면 거의 무염인 것만 받는다. 여기서도 멈추지 않으면
     *    나트륨을 무한정 쌓게 된다.
     */
    const short = need.kcal > 0 || need.protein > 0
    const naCap =
      na >= naLimit * 1.5 ? Math.max(40, room.na * 0.5)
        : short ? Math.max(250, room.na * 0.5)
          // 식이섬유만 모자란 경우에도 길은 열어 둔다.
          // 나물·채소는 대개 200 mg 아래라, 여기서 막으면 채소를 못 넣는다.
          : need.fiber > 0 ? Math.max(120, room.na * 0.5)
            : Math.max(0, room.na * 0.5)
    const best = bestFiller(candidates, need, room, used, meals, groupCount, naCap, cap, quota, dayIndex + guard, recent)
    if (!best) break

    /*
     * 먼저 상한을 지켜 자리를 찾고, 자리가 없을 때만 한 자리를 더 연다.
     * 처음부터 열어 두면 거의 늘 열려 있게 되어 상한이 없는 것과 같아진다.
     */
    const slot = placeIn(best.food, meals, cap, quota) ??
      (need.kcal > 0 ? placeIn(best.food, meals, cap, quota, true) : undefined)
    if (!slot) { used.add(best.food.id); continue }
    meals[slot].push({
      food: best.food, servings: best.servings, origin: 'added',
      contribution: best.contribution, ruleTitle: best.ruleTitle,
      evidence: best.evidence, refIds: best.refIds,
      seasonal: isSeasonal(best.food, season)
    })
    foodTotals = addTotals(foodTotals, foodContribution(best.food, best.servings))
    used.add(best.food.id)
    groupCount.set(best.food.group, (groupCount.get(best.food.group) ?? 0) + 1)
  }

  /*
   * 3-2) 그래도 열량·단백질이 모자라면 간식으로 보충한다.
   *
   * 위암은 나트륨 상한이 1,500 mg 이라, 비빔밥 한 그릇(1,750 mg)만 담아도
   * 그 자리에서 상한의 1.7 배가 된다. 그러면 위 단계는 거의 무염인 것만 받게 되고,
   * 열량이 400 kcal 넘게 모자란 채로 끝났다.
   *
   * 하지만 견과·두유·미숫가루·영양음료는 나트륨이 거의 없으면서 열량과 단백질이 높다.
   * 짜게 드셨다고 해서 굶어야 할 이유는 없다. 이 단계에서는
   *  - 나트륨이 아주 낮은 것만 (120 mg 이하)
   *  - 간식 자리와 식품군 상한을 조금 더 열고
   *  - 영양보충 음료도 후보에 넣어
   * 열량·단백질만 겨냥해 채운다. 식이섬유는 여기서 따지지 않는다.
   */
  const topUpCap = cap + 2
  for (let guard = 0; guard < 12; guard++) {
    const cur = running()
    const need = {
      kcal: target.kcal[0] - (cur.kcal ?? 0),
      protein: target.protein[0] - (cur.protein ?? 0),
      fiber: 0
    }
    if (need.kcal <= 25 && need.protein <= 2) break

    const room = { kcal: target.kcal[1] - (cur.kcal ?? 0), na: naLimit - (cur.na ?? 0) }
    if (room.kcal <= 40) break

    const best = bestFiller(
      topUpPool, need, room, used, meals, groupCount,
      /*
       * 나트륨은 거의 없는 것만.
       * 예산이 남아 있으면 그 절반까지, 남지 않았으면 120 mg 이하만 받는다.
       * 다만 이미 상한을 넘긴 상태라면 여기서 더 얹지 않는다 —
       * 보충은 열량을 채우자는 것이지 나트륨을 늘리자는 것이 아니다.
       */
      room.na <= 0 ? 40 : Math.max(120, room.na * 0.5),
      topUpCap,
      quota,
      dayIndex + 40 + guard,
      recent,
      GROUP_CAP + 2
    )
    if (!best) break

    const slot = placeIn(best.food, meals, topUpCap, quota) ??
      placeIn(best.food, meals, topUpCap, quota, true)
    if (!slot) { used.add(best.food.id); continue }

    /*
     * 가짓수 대신 양을 늘린다.
     *
     * 큰 체격이거나 암종·증상 규칙이 겹쳐 쓸 수 있는 음식이 몇 가지 안 남는 경우가 있다
     * (간암에 당뇨가 겹치면 검토분 483 종 가운데 33 종만 남는다).
     * 그럴 때 서로 다른 음식을 스무 가지 늘어놓는 것보다, 먹던 것을 두 배로 드시는 편이
     * 실제에 가깝다 — 영양음료 두 캔, 견과 두 줌처럼.
     */
    const one = foodContribution(best.food, 1)
    const roomLeft = { kcal: room.kcal - (one.kcal ?? 0), na: room.na - (one.na ?? 0) }
    const doubleUp =
      need.kcal > (one.kcal ?? 0) * 1.6 &&
      (one.kcal ?? 0) <= roomLeft.kcal &&
      (one.na ?? 0) <= Math.max(120, roomLeft.na) &&
      /*
       * 양이 늘면 판정이 달라지는 음식이 있다.
       * 두유라떼는 한 잔이면 괜찮지만 두 잔이면 당류 기준에 걸려 '주의'가 된다.
       * 늘린 양 그대로 다시 판정해 보고, 여전히 괜찮을 때만 늘린다.
       */
      !['avoid', 'caution'].includes(evaluateFood(best.food, patient, 2, cached).level ?? '')
    const servings = doubleUp ? 2 : best.servings

    meals[slot].push({
      food: best.food, servings, origin: 'added',
      contribution: `${best.contribution} · 보충`,
      ruleTitle: best.ruleTitle, evidence: best.evidence, refIds: best.refIds,
      seasonal: isSeasonal(best.food, season)
    })
    foodTotals = addTotals(foodTotals, foodContribution(best.food, servings))
    used.add(best.food.id)
    groupCount.set(best.food.group, (groupCount.get(best.food.group) ?? 0) + 1)
  }

  /*
   * 4) 빈 끼니 채우기.
   *
   * 여기까지는 "영양소가 모자라면 채운다"는 규칙만 있었다.
   * 그래서 아침·점심만으로 목표가 채워지면 저녁이 통째로 비었다.
   * 하루 세 끼는 영양소 계산과 별개로 지켜야 할 틀이므로, 마지막에 따로 본다.
   *
   * 간식도 함께 본다. 치료 중에는 한 번에 많이 못 드시는 경우가 흔해서,
   * 하루 목표를 세 끼로만 나누면 한 끼가 너무 커진다.
   * 간식은 그 부담을 나누는 자리이므로 하루 식단에 들어가야 한다.
   */
  for (const slot of [...MAIN_SLOTS, '간식' as MealSlot]) {
    if (meals[slot].length > 0) continue
    const cur = running()
    const room = {
      kcal: target.kcal[1] - (cur.kcal ?? 0),
      na: naLimit - (cur.na ?? 0)
    }
    const deficit = Math.max(0, target.kcal[0] - (cur.kcal ?? 0))
    const { entry, note } = pickForSlot(candidates, slot, used, room, deficit, dayIndex, recent, meals)
    if (note) slotNotes[slot] = note
    if (!entry) continue
    meals[slot].push({
      food: entry.food, servings: 1, origin: 'added',
      contribution: entry.contribution, ruleTitle: entry.ruleTitle,
      evidence: entry.evidence, refIds: entry.refIds,
      seasonal: isSeasonal(entry.food, season)
    })
    foodTotals = addTotals(foodTotals, foodContribution(entry.food, 1))
    used.add(entry.food.id)
  }

  /*
   * 4-2) 제철로 바꿔 넣기.
   *
   * 화면에는 "여름철 추천 식단" 이라 적혀 있는데, 실제로는 네 계절이 모두 같았다.
   * 제철 가산점을 점수에 섞어 두었지만 영양 점수에 묻혀 아무 일도 하지 못했다.
   *
   * 가중치를 키워 맞추는 대신, 다 짠 뒤에 한 번 바꿔 넣는다.
   * 같은 식품군에서 열량이 비슷하고 나트륨이 더 늘지 않는 제철 음식이 있으면
   * 그것으로 교체한다. 영양은 그대로 두고 계절만 바꾸는 것이라 안전하다.
   *
   * 국수·국물 같은 여름·겨울 대표 음식은 나트륨이 높아 '주의' 판정을 받는다.
   * 그런 것은 여기서도 쓰지 않는다 — 제철이라고 해서 권할 이유가 되지는 않는다.
   */
  {
    const seasonal = candidates.filter((c) => c.seasonal && !used.has(c.food.id))
    for (const slot of MEAL_SLOTS) {
      for (const entry of meals[slot]) {
        if (entry.origin !== 'added' || entry.seasonal) continue
        const cur = foodContribution(entry.food, entry.servings)
        const curKcal = cur.kcal ?? 0
        const curNa = cur.na ?? 0

        /*
         * 바꿔도 되는지는 하루 총량으로 본다.
         * 항목 하나만 놓고 "나트륨이 늘면 안 된다" 고 하면 거의 아무것도 못 바꾼다.
         * 한식 반찬은 대개 200 mg 안팎이고 데친 채소는 50 mg 이라, 늘 채소가 이긴다.
         * 바꾼 뒤에도 하루가 상한 안에 있고 열량이 목표 범위에 남는다면 문제될 것이 없다.
         */
        const now = running()
        const dayNa = now.na ?? 0
        const dayKcal = now.kcal ?? 0
        const dayProtein = now.protein ?? 0
        const dayFiber = now.fiber ?? 0
        const swap = seasonal.find(
          (c) =>
            /*
             * 같은 식품군끼리 바꾸는 것이 원칙이다 — 국을 과일로 바꾸면 끼니가 무너진다.
             * 다만 간식 자리는 다르다. 거기서는 무엇이 오든 간식이고,
             * 제철 과일이 들어갈 자리가 바로 거기다.
             * 이 완화가 없으면 죽 위주 식단(식도암·두경부암)에는 과일이 낄 틈이 없어
             * 네 계절이 모두 같아진다.
             */
            (c.food.group === entry.food.group || slot === '간식') &&
            slotsFor(c.food).includes(slot) &&
            /*
             * 바꿔 넣는 것도 상한을 지킨다.
             * 간식에서 식품군 일치를 풀어 준 탓에, 이미 과일이 있는 간식에
             * 제철 과일을 하나 더 밀어 넣어 포도·수박·참외가 나란히 놓였다.
             */
            (c.food.group === entry.food.group ||
              meals[slot].filter((e) => e.food !== entry.food && e.food.group === c.food.group).length <
                (SLOT_GROUP_CAP[c.food.group] ?? SLOT_GROUP_CAP_DEFAULT)) &&
            Math.abs(c.kcal - curKcal) <= Math.max(120, curKcal * 0.4) &&
            // 상한에 딱 맞추지 않는다. 제철 때문에 안전 여유를 써 버리면 안 된다.
            dayNa - curNa + c.na <= naLimit * 0.9 &&
            dayKcal - curKcal + c.kcal >= target.kcal[0] &&
            dayKcal - curKcal + c.kcal <= target.kcal[1] &&
            // 단백질·식이섬유도 하루 총량으로 본다. 항목끼리 견주면
            // 섬유가 많은 가을 과일이 자리를 잡은 뒤로는 아무것도 못 바꾸게 된다.
            dayProtein - (cur.protein ?? 0) + c.protein >= target.protein[0] &&
            dayFiber - (cur.fiber ?? 0) + c.fiber >= fiberTarget
        )
        if (!swap) continue

        used.delete(entry.food.id)
        used.add(swap.food.id)
        seasonal.splice(seasonal.indexOf(swap), 1)
        foodTotals = addTotals(foodTotals, foodContribution(swap.food, entry.servings))
        for (const [k, v] of Object.entries(cur) as [NutrientKey, number][]) {
          foodTotals[k] = (foodTotals[k] ?? 0) - v
        }
        const hit = explain(swap, [])
        entry.food = swap.food
        entry.seasonal = true
        entry.contribution = `${entry.contribution ?? ''} · ${season} 제철`.replace(/^ · /, '')
        entry.ruleTitle = hit?.rule.title ?? `${season}에 나는 것으로 바꿔 넣었습니다.`
        entry.evidence = hit?.rule.evidence
        entry.refIds = hit?.rule.refIds ?? []
      }
    }
  }

  // 5) 끼니별 소계 — 화면에서 항목을 더한 값과 정확히 같아야 한다
  const slotTotals: Record<MealSlot, NutrientTotals> = { 아침: {}, 점심: {}, 저녁: {}, 간식: {} }
  for (const slot of MEAL_SLOTS) {
    let t: NutrientTotals = {}
    for (const e of meals[slot]) t = addTotals(t, foodContribution(e.food, e.servings))
    slotTotals[slot] = t
  }

  const totals = running()

  // 6) 요약
  notes.push(...dayNotes(totals, suppTotals, patient, naUnknownNames(chosen)))

  return { scope: '하루(24시간) 전체', season, meals, totals, suppTotals, slotTotals, target, removed, notes, slotNotes }
}

/**
 * 이 환자에게 맞는 식이섬유 목표.
 *
 * 암종별 목표를 그대로 쓰면 설사 환자에게 "식이섬유가 부족합니다" 라고 말하게 된다.
 * 같은 앱이 바로 위에서는 거친 섬유를 '피하세요' 로 판정하고 있는데도 그렇다.
 * 설사·장루 보유처럼 잔사를 줄여야 하는 상태에서는 목표 자체가 달라야 한다.
 */
export function fiberGoal(
  patient: PatientContext,
  profile: { target: { fiberTarget?: [number, number] } }
): { range: [number, number]; lowResidue: boolean } {
  const lowResidue = patient.conditions.some((c) => c === '설사' || c === '장루보유')
  // 저잔사식에서도 완전히 끊지는 않는다. 수용성 섬유는 오히려 도움이 된다.
  if (lowResidue) return { range: [8, 15], lowResidue: true }
  return { range: profile.target.fiberTarget ?? [20, 30], lowResidue: false }
}

/** 끼니로 세는 자리. 간식은 이 틀에 넣지 않는다 — 없어도 하루가 성립한다. */
const MAIN_SLOTS: MealSlot[] = ['아침', '점심', '저녁']

/**
 * 끼니별로 하루 열량을 어떻게 나눌 것인가.
 *
 * 예전에는 "지금 가장 가벼운 끼니" 에 넣었다. 그러면 넷이 고르게 되는데,
 * 실제로는 아침 35 % · 점심 27 % · 저녁 23 % 로 아침이 가장 무거워졌다.
 * 빈 끼니를 앞에서부터 채우다 보니 단백질이 많은 주요리가 늘 아침에 놓인 탓이다.
 *
 * 한국에서 하루 식사는 저녁이 가장 무겁고 아침이 가장 가볍다.
 * 아침에 630 kcal 짜리 삼계탕을 놓아 봐야 실제로 드시지 않는다.
 *
 * 다만 소량씩 자주 드셔야 하는 분은 다르다. 식욕이 없거나 위를 절제하신 경우
 * 한 끼를 크게 만들면 그 끼니를 통째로 남기신다. 그때는 넷을 고르게 하고
 * 간식 몫을 키운다.
 */
function mealShares(patient: PatientContext): Record<MealSlot, number> {
  const grazing = patient.conditions.some(
    (c) => c === '식욕부진' || c === '체중감소' || c === '위절제후' || c === '오심·구토'
  )
  return grazing
    ? { 아침: 0.25, 점심: 0.26, 저녁: 0.27, 간식: 0.22 }
    : { 아침: 0.25, 점심: 0.30, 저녁: 0.35, 간식: 0.10 }
}

/**
 * 간식으로 내놓을 수 있는 최대 가짓수.
 *
 * 저나트륨·고열량 식품 — 견과·과일·영양음료 — 은 거의 다 간식 전용 식품군이다.
 * 그래서 이 수를 2 로 묶어 두면, 짠 국 한 그릇을 담으신 날에는
 * 남은 열량을 채울 길이 아예 막힌다. 실제로 그 때문에 열량 미달이 75 % 였다.
 *
 * 한편 치료 중에는 한 번에 많이 못 드시는 경우가 흔해, 소량씩 자주 나눠 드시는 것이
 * 권장된다(ESPEN). 그래서 기본 3 가지, 식욕이 없거나 체중이 줄고 있으면 4 가지까지 둔다.
 */
function snackCap(patient: PatientContext): number {
  const needsGrazing = patient.conditions.some(
    (c) => c === '식욕부진' || c === '체중감소' || c === '위절제후' || c === '오심·구토'
  )
  return needsGrazing ? 4 : 3
}

/**
 * 어느 끼니에 넣을지 고른다. 넣을 자리가 없으면 undefined 를 돌려준다.
 *
 * 예전에는 항목이 가장 적은 끼니를 골랐다. 그런데 견과·과일·경구영양은
 * 모두 간식만 허용된 식품군이라, 간식에 다섯 개가 쌓이고 저녁은 비는 일이 생겼다.
 * 그래서 아직 비어 있는 끼니를 먼저 채우고, 간식은 두 개까지만 받는다.
 * 간식밖에 갈 곳이 없는데 간식이 찼다면 아예 넣지 않는다 — 하루에
 * 곶감·푸룬·미숫가루·영양음료가 나란히 놓이면 식단으로 읽히지 않는다.
 */
/**
 * 한 끼니에 같은 식품군을 몇 가지까지 놓을 것인가.
 *
 * 반찬과 채소는 여럿이 정상이다 — 나물 두 접시에 김치가 놓인 상은 자연스럽다.
 * 그런데 과일 두 가지, 우유 두 잔, 음료 두 개가 한 끼에 함께 오르면
 * 그건 상차림이 아니라 목록이다.
 * 실제로 끼니의 44 % 에서 같은 식품군이 겹쳤고, 그 절반이 과일이었다
 * (아침에 단감과 배가 나란히 올라오는 식이다).
 */
const SLOT_GROUP_CAP: Partial<Record<FoodGroup, number>> = {
  // 한 끼에 둘이면 이상해 보이는 것들
  과일: 1,
  '우유·유제품': 1,
  음료: 1,
  '간식·디저트': 1,
  '경장영양·환자식': 1
}
/*
 * 나머지는 둘까지 둔다.
 * 전부 하나로 묶었더니 체격이 큰 분(하루 2,850 kcal)에게 낼 자리가 모자라
 * 열량이 300 kcal 넘게 미달했다. 밥과 국, 나물 두 접시가 한 상에 오르는 것은
 * 이상하지 않다. 이상한 것은 과일 두 가지, 우유 두 잔이다.
 */
const SLOT_GROUP_CAP_DEFAULT = 2

function placeIn(
  food: Food,
  meals: Record<MealSlot, MenuEntry[]>,
  cap: number,
  /** 끼니별 목표 열량 — 여기에 견주어 가장 모자란 끼니에 넣는다 */
  quota: Record<MealSlot, number>,
  /**
   * 열량이 아직 모자란가.
   *
   * 모자란 동안에는 같은 식품군을 하나 더 놓을 수 있게 한다.
   * 상차림이 조금 단조로워지는 것과, 하루 열량이 300 kcal 모자란 것 중에서는
   * 앞쪽이 낫다. 체격이 크고 규칙이 까다로운 분(간암에 당뇨가 겹친 경우처럼)은
   * 쓸 수 있는 음식이 몇 가지 안 남아 이 여유가 필요하다.
   */
  short = false
): MealSlot | undefined {
  /*
   * 열량이 모자라도 이 다섯은 늘리지 않는다.
   * 우유 두 잔이 한 끼에 오르나 과일 두 가지가 오르나 이상해 보이기는 마찬가지다.
   * 열량은 밥·국·반찬 쪽에서 채운다.
   */
  const strict = SLOT_GROUP_CAP[food.group] !== undefined
  const groupCap = (SLOT_GROUP_CAP[food.group] ?? SLOT_GROUP_CAP_DEFAULT) + (short && !strict ? 1 : 0)
  const sameGroup = (s: MealSlot) => meals[s].filter((e) => e.food.group === food.group).length

  const pool = slotsFor(food).filter(
    (s) => (s !== '간식' || meals['간식'].length < cap) && sameGroup(s) < groupCap
  )
  if (pool.length === 0) return undefined

  /*
   * 가짓수가 아니라 '제 몫에 얼마나 모자란가' 로 견준다.
   *
   * 가짓수로 보면 나물 두 접시가 올라간 저녁이 '이미 찬 끼니' 가 되어,
   * 87 kcal 짜리 저녁과 네 가지가 올라간 아침이 나란히 놓였다.
   * 절대 열량으로 견주면 넷이 똑같이 나뉘어, 아침이 저녁만큼 무거워진다.
   * 사람이 한 끼로 느끼는 것은 접시 수도, 균등한 몫도 아니다.
   */
  const load = (s: MealSlot) =>
    meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
  const shortfall = (s: MealSlot) => quota[s] - load(s)

  // 간식은 끼니가 아니다. 끼니 쪽에 아직 여유가 있으면 그쪽을 먼저 채운다.
  const mains = pool.filter((s) => s !== '간식')
  const hungry = mains.filter((s) => shortfall(s) > 0)
  const target = hungry.length > 0 ? hungry : mains.length > 0 ? mains : pool
  return target.reduce((a, b) => (shortfall(a) >= shortfall(b) ? a : b))
}

/** 후보 한 건 — 영양 기여분을 미리 계산해 둔다 */
interface Cand {
  food: Food
  /** 권장 근거·제철에서 오는 가산점 */
  bonus: number
  /** 굳이 늘릴 이유가 없는 성질에서 오는 감점 (양수) */
  penalty: number
  /** 이 식품에 걸린 권장 규칙들 — 어떤 이유로 넣었는지 설명할 때 고른다 */
  prefers: RuleHit[]
  seasonal: boolean
  kcal: number
  protein: number
  fiber: number
  na: number
  /** 열량은 낮은데 배는 부른 정도 */
  satiety: number
}

/**
 * 앱이 먼저 권해도 되는 식품을 모은다.
 *
 * 후보는 손으로 검토한 식품에서만 고른다.
 * 공공데이터에서 들여온 것은 성분값은 믿을 만하지만 1회 제공량이 부정확하고
 * ("삶아서 말린 나물" 100 g 처럼 실제로 먹지 않는 양), 이상치도 섞여 있다.
 * 검색해서 찾아보는 데는 쓸모가 있어도, 앱이 먼저 권하는 자리에는 맞지 않는다.
 */
function collectCandidates(
  patient: PatientContext,
  cached: { rules: RuleHit[]; interactions: InteractionHit[] },
  cuisines: Cuisine[],
  season: Season,
  /** 경구영양보충을 후보에 넣을지 — 보충 단계에서는 열량 미달 자체가 적응증이다 */
  forceONS = false
): Cand[] {
  const PENALTY: Partial<Record<string, number>> = {
    적색육: 12, 직화구이: 8, 초가공식품: 12, 튀김: 10, 가공육: 30,
    고지방: 5, 포화지방높음: 5, 고나트륨: 8, 고당: 6, 염장: 20, 거친질감: 3
  }

  /**
   * 환자가 직접 고르는 것은 막지 않지만, 앱이 먼저 권하지는 않는 성질.
   * 규칙상 금기가 아닌 시기라도 치료 중인 환자에게 회나 술을 제안하는 것은 부적절하다.
   */
  /*
   * 튀김·직화구이·초가공식품도 여기에 넣는다.
   *
   * 감점만 주고 후보에는 남겨 두었더니, 날마다 다른 식단을 내려고 좋은 후보를
   * 사흘씩 쉬게 하는 순간 이것들이 밀려 올라왔다 — 삼겹살 구이, 김말이 튀김이
   * 이틀에 한 번꼴로 추천에 올랐다.
   *
   * 환자분이 직접 고르시는 것은 막지 않는다. 다만 앱이 먼저 권할 이유는 없다.
   * 태운 부분의 헤테로사이클릭아민, 튀김의 산화 지질, 초가공식품은
   * 암 생존자 식이 권고에서 줄이라고 하는 쪽이다(WCRF/AICR).
   * 적색육은 남겨 둔다 — 불고기·수육까지 빼면 한식에서 단백질을 낼 길이 좁아진다.
   */
  const NEVER_SUGGEST = new Set(['알코올', '가공육', '염장', '훈제', '튀김', '직화구이', '초가공식품'])

  /*
   * 날것은 동물성만 막는다.
   *
   * 예전에는 '생식' 태그가 붙은 것을 모두 막았다. 회·생굴·날달걀을 막으려던 것인데,
   * 그 태그는 사과·딸기·상추·오이에도 붙어 있어서 신선 농산물 43 종이 함께 막혔다.
   * 그래서 계절이 바뀌어도 추천에 나오는 과일은 곶감·건자두 같은 말린 것뿐이었다.
   *
   * 호중구감소증처럼 날것을 정말 피해야 하는 상태는 규칙 엔진이 따로 판정한다
   * (그때는 사과·딸기도 '피하세요'가 된다). 여기서 이중으로 막을 이유가 없다.
   */
  const RAW_RISK_GROUPS = new Set<FoodGroup>(['어패류', '가금류·난류', '육류', '외식·프랜차이즈'])

  /*
   * 경구영양보충(ONS)은 영양 위험이 있는 분에게 쓰는 것이다.
   * 잘 드시고 계신 분께 "균형영양식 2 캔"을 권하면 이상하기도 하거니와,
   * 열량이 높아 하루 예산을 먼저 차지해 버려 채소·과일이 들어갈 자리를 없앤다.
   */
  const bmi = patient.weightKg / Math.pow(patient.heightCm / 100, 2)
  const needsONS =
    (patient.weightLossPct ?? 0) >= 5 || bmi < 18.5 ||
    patient.conditions.some((c) =>
      c === '식욕부진' || c === '체중감소' || c === '연하곤란' ||
      c === '구강점막염' || c === '오심·구토' || c === '위절제후')

  const out: Cand[] = []
  for (const f of CURATED_FOODS) {
    if (f.group === '경장영양·환자식' && !needsONS && !forceONS) continue
    // 조미료·기름처럼 그 자체로 한 끼를 이루지 않는 것은 제안하지 않는다
    if (f.group === '유지·당류') continue
    if (f.tags.some((t) => NEVER_SUGGEST.has(t))) continue
    if (f.tags.includes('생식') && RAW_RISK_GROUPS.has(f.group)) continue
    if (!allowedCuisine(f, cuisines)) continue
    // 사람이 한 번에 먹는 양으로 보기 어려운 것은 제외한다
    if (f.serving.g < 10) continue
    /*
     * 끼니로 제안하는 자리이므로 '요리'만 고른다.
     * "대두(삶은 것)", "냉이", "아마씨" 같은 식재료를 끼니로 내놓으면
     * 그걸 어떻게 먹으라는 말인지 알 수 없다.
     * 다만 영양보충 음료처럼 그대로 먹는 것은 예외로 둔다.
     */
    /*
     * 과일은 재료로 분류돼 있어도 그대로 먹는 것이다.
     * 사과 한 개, 귤 두 개는 조리가 필요 없는 완결된 간식인데,
     * '재료' 라는 이유로 32 종이 통째로 추천에서 빠져 있었다.
     * 그래서 계절이 바뀌어도 늘 곶감만 나왔다 — 곶감만 form 이 snack 이었기 때문이다.
     * 아래 이름 규칙이 "(생것)·(삶은 것)" 같은 조리 상태 이름은 따로 걸러 준다.
     */
    const eatenAsIs = f.group === '과일' || f.group === '경장영양·환자식'
    if (f.form === 'ingredient' && !eatenAsIs) continue
    // "(삶은 것)", "(데친 것)" 처럼 조리 상태만 적힌 이름은 재료에 가깝다.
    // 간식 자리에 "밤(삶은 것)" 이 올라오면 메뉴로 읽히지 않는다.
    if (/\((생것|삶은 것|데친 것|찐 것|말린 것|불린 것|생)\)/.test(f.name)) continue

    const v = evaluateFood(f, patient, 1, cached)
    if (v.level === 'avoid' || v.level === 'caution') continue

    const prefers = v.hits.filter((h) => h.rule.level === 'prefer')

    /*
     * 가산점과 감점을 따로 센다.
     * 예전에는 하나로 합쳐 두고 점수 전체에 계수를 곱했는데,
     * 그러면 계수를 낮출 때 적색육·직화구이 감점까지 함께 약해진다.
     * 실제로 그 때문에 삼겹살 구이(662 kcal)가 추천에 올라왔다.
     * 권장은 "같은 값이면 앞세우는" 기준이라 줄여도 되지만, 감점은 그대로 두어야 한다.
     */
    let bonus = 0
    for (const h of prefers) bonus += h.source === '공통' ? 6 : 14
    let penalty = 0
    for (const t of f.tags) penalty += PENALTY[t] ?? 0

    // 제철 가산은 bestFiller 에서 따로 센다. 여기서 더하면 두 번 세는 셈이 된다.
    const seasonal = isSeasonal(f, season)

    const c = foodContribution(f, 1)
    const kcal = c.kcal ?? 0
    const protein = c.protein ?? 0
    // 1회 제공량 기준으로 말이 되지 않는 값은 데이터 오류로 보고 거른다
    if (kcal > 900 || protein > 80) continue

    const fiber = c.fiber ?? 0
    /*
     * 포만감 점수.
     * 배가 부른 느낌은 열량이 아니라 부피와 섬유질에서 온다.
     * 국·나물·채소처럼 무게는 나가는데 열량은 낮은 것을 위로 올린다.
     */
    const satiety = fiber * 4 + f.serving.g / 40 + protein * 0.3 - kcal / 25

    out.push({ food: f, bonus, penalty, prefers, seasonal, kcal, protein, fiber, na: c.na ?? 0, satiety })
  }
  return out
}

/** 부족분을 채우려고 고른 한 건 */
interface Filler {
  food: Food
  servings: number
  contribution: string
  ruleTitle: string
  /** 근거가 되는 규칙이 없으면 비어 있다 */
  evidence?: EvidenceLevel
  refIds: string[]
}

/**
 * 이 식품을 넣은 이유로 가장 잘 맞는 규칙을 고른다.
 * 예를 들어 섬유를 채우려고 넣었다면 섬유를 다루는 규칙의 문장을 보여준다.
 */
function explain(c: Cand, wantTags: string[]): RuleHit | undefined {
  const matched = c.prefers.find((h) => h.rule.match.tags?.some((t) => wantTags.includes(t)))
  return matched ?? c.prefers.find((h) => h.source !== '공통') ?? c.prefers[0]
}

/**
 * 한 식품군에서 하루에 내놓을 수 있는 최대 가짓수.
 * 2 로 묶으면 채소 두 접시를 넣은 뒤로 채소를 더 못 넣어, 섬유가 늘 모자랐다.
 */
const GROUP_CAP = 3

/**
 * 지금 가장 모자란 것을 가장 잘 채우는 한 가지를 고른다.
 *
 * 무엇을 볼 것인가.
 *  - 남은 부족분을 얼마나 메우는가 (열량·단백질·식이섬유를 함께 본다)
 *  - 그 대가로 나트륨을 얼마나 쓰는가. 나트륨은 이 앱에서 가장 빠듯한 예산이다.
 *  - 이 암종·증상에서 권장 근거가 있는가 (공통 규칙보다 암종·증상 규칙을 높게 친다)
 *  - 지금 제철인가
 *  - 굳이 늘릴 이유가 없는 성질인가 (적색육·직화구이·초가공·고지방에 감점)
 *
 * 한 가지가 남은 나트륨 예산의 절반을 넘게 가져가지 못하게 막는다.
 * 그렇게 하지 않으면 국·찌개 한 그릇이 예산을 다 써 버려 뒤에 올 채소·과일이 들어갈 자리가 없어진다.
 * 실제로 그 때문에 하루가 1,374 kcal 에서 멈춰 있었다.
 */
function bestFiller(
  all: Cand[],
  need: { kcal: number; protein: number; fiber: number },
  room: { kcal: number; na: number },
  exclude: Set<string>,
  meals: Record<MealSlot, MenuEntry[]>,
  groupCount: Map<string, number>,
  /** 한 가지가 가져가도 되는 나트륨의 최대치 */
  naCap: number,
  /** 간식 가짓수 상한 */
  cap: number,
  /** 끼니별 목표 열량 */
  quota: Record<MealSlot, number>,
  /** 그날의 차례 — 엇비슷한 후보 중 몇 번째를 꺼낼지 정한다 */
  turn: number,
  /** 최근에 드신 식품과 며칠 전인지 */
  recent: Map<string, number>,
  /** 한 식품군에서 낼 수 있는 최대 가짓수 */
  groupCap = GROUP_CAP
): Filler | undefined {

  const scored: { c: Cand; score: number }[] = []
  for (const c of all) {
    if (exclude.has(c.food.id)) continue
    if ((groupCount.get(c.food.group) ?? 0) >= groupCap) continue
    if (c.kcal > room.kcal) continue
    if (c.na > naCap) continue
    /*
     * 며칠 안에 나온 것은 다시 권하지 않는다.
     * 어제 나온 닭백숙이 오늘 또 올라오면 추천으로 읽히지 않는다.
     *
     * 다만 눈에 띄는 것만 막는다. 사과나 두유까지 사흘씩 묶어 두면
     * 열량을 낼 후보가 동나서, 하루가 잔챙이 열네 가지로 채워진다.
     * 실제로 그렇게 해 봤더니 항목 수가 여섯에서 열넷으로 늘었다.
     * 매일 사과를 드시는 것은 이상하지 않다. 매일 같은 삼계탕이 이상한 것이다.
     */
    const ago = recent.get(c.food.id)
    if (ago !== undefined && ago <= REPEAT_BLOCK_DAYS && c.kcal >= REPEAT_MIN_KCAL) continue
    // 넣을 끼니가 없으면 (간식이 다 찼는데 간식밖에 못 가는 것) 의미가 없다
    if (!placeIn(c.food, meals, cap, quota) && !(need.kcal > 0 && placeIn(c.food, meals, cap, quota, true))) continue

    /*
     * 부족분을 얼마나 메우는지 — 필요한 만큼만 쳐 준다.
     * 단백질이 5 g 모자란데 50 g 짜리를 넣어도 메운 것은 5 g 이다.
     */
    const fill =
      (need.protein > 0 ? Math.min(c.protein, need.protein) / need.protein : 0) * 3.0 +
      (need.fiber > 0 ? Math.min(c.fiber, need.fiber) / need.fiber : 0) * 2.0 +
      // 열량을 가장 무겁게 본다. 치료 중 가장 먼저 무너지는 것이 에너지다(ESPEN).
      (need.kcal > 0 ? Math.min(c.kcal, need.kcal) / need.kcal : 0) * 3.5

    if (fill <= 0.01) continue

    // 나트륨은 남은 예산에 견주어 값을 매긴다. 예산이 빠듯할수록 비싸진다.
    const naCost = c.na / Math.max(150, room.na)
    /*
     * 열량 상한도 예산이다.
     * 열량이 이미 찼는데 식이섬유가 남았다면, 남은 열량으로 섬유를 최대한 사야 한다.
     * 이 항이 없으면 고열량 식품이 먼저 상한을 채워, 채소를 넣을 자리가 없어진다.
     * 열량이 모자란 동안에는 위의 fill 항이 이 값보다 크므로 방해가 되지 않는다.
     */
    const kcalCost = c.kcal / Math.max(200, room.kcal)
    /*
     * 남은 예산을 넘겨 버리는 선택에는 따로 벌점을 준다.
     * 모자란 동안에는 상한을 넘겨서라도 먹이는 것이 맞지만, 같은 값을 하는
     * 더 싱거운 것이 있다면 그쪽을 골라야 한다. 이 벌점이 없어서
     * 마지막 한 가지(단백질음료 150 mg)가 하루를 1,546 / 1,500 으로 만들었다.
     */
    const crossPenalty = c.na > room.na ? 22 : 0

    /*
     * 부족분을 메우는 정도가 가장 중요하다.
     * 예전에는 이 항이 30 점이고 규칙 점수(c.score)가 그대로 더해졌는데,
     * 제철 가산 10 점 + 암종 권장 14 점만으로도 24 점이라 부족분 점수를 눌러 버렸다.
     * 그 결과 "권장 근거가 있는 고열량 식품"이 먼저 뽑혀 열량 상한을 채우고,
     * 정작 값싸고 섬유가 많은 나물 반찬이 들어갈 자리가 없어졌다.
     * 근거는 같은 값이면 앞세우는 기준이지, 무엇을 채울지 정하는 기준이 아니다.
     */
    /*
     * 제철은 따로 센다.
     *
     * 예전에는 제철 가산 10 점이 c.bonus 안에 섞여 있었고, 그 bonus 에 0.5 를 곱하니
     * 실제로는 5 점이었다. fill * 80 앞에서 아무 일도 하지 못했다.
     * 그래서 봄·여름·가을·겨울 어느 때에 물어도 똑같은 일곱 가지가 나왔다.
     * 화면에는 "여름철 추천 식단" 이라 적어 놓고서 그랬다.
     *
     * 영양을 뒤집을 만큼은 아니고, 엇비슷한 후보끼리 갈릴 때 제철이 이기는 정도로 둔다.
     */
    const seasonBonus = c.seasonal ? 22 : 0

    /*
     * 최근에 드신 것일수록 뒤로 미룬다.
     * 사흘 안에 드신 것은 위에서 이미 걸렀고, 그 뒤로 일주일까지는 점수를 깎는다.
     */
    const fade = ago === undefined ? 0 : Math.max(0, (REPEAT_FADE_DAYS - ago) / REPEAT_FADE_DAYS) * 40

    /*
     * 날마다 조금씩 다르게.
     *
     * 이 항이 없으면 같은 환자·같은 계절에는 언제 열어도 똑같은 여섯 가지가 나온다.
     * 실제로 8월 한 달 동안 하루도 빠짐없이 같은 식단이었다.
     * 영양 점수를 뒤집을 만큼은 아니고, 엇비슷한 후보끼리 차례가 돌아가는 정도로 둔다.
     */
    const score = fill * 80 + c.bonus * 0.5 + seasonBonus
      - fade - c.penalty * 9 - naCost * 25 - kcalCost * 14 - crossPenalty
    scored.push({ c, score })
  }
  if (scored.length === 0) return undefined

  /*
   * 가장 높은 하나만 집으면 조건이 같은 한 언제나 같은 것이 나온다.
   * 점수가 엇비슷한 것들을 묶어 두고 날짜에 따라 차례로 꺼낸다.
   * 영양 점수를 뒤집는 것이 아니라, 비긴 것들 사이에서 차례를 정하는 것뿐이다.
   */
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0].score
  let pool = scored.filter((x) => x.score >= top - ROTATE_TOLERANCE).slice(0, ROTATE_POOL)
  /*
   * 차례를 돌리더라도 상한은 넘지 않는다.
   * 예산 안에 드는 것이 하나라도 있으면 그 안에서만 돌린다.
   * 이 걸림쇠가 없으면 그날의 차례가 하필 짠 것에 닿았을 때
   * 앱이 스스로 정한 나트륨 상한을 넘긴 식단을 내놓는다.
   */
  const within = pool.filter((x) => x.c.na <= room.na)
  if (within.length > 0) pool = within
  const c = pool[((turn % pool.length) + pool.length) % pool.length].c
  // 무엇을 채우려고 넣었는지 — 가장 크게 메운 것을 말한다
  const parts: { label: string; ratio: number }[] = [
    { label: `단백질 ${Math.round(c.protein)} g 보충`, ratio: need.protein > 0 ? Math.min(c.protein, need.protein) / need.protein : 0 },
    { label: `식이섬유 ${c.fiber.toFixed(1)} g 보충`, ratio: need.fiber > 0 ? Math.min(c.fiber, need.fiber) / need.fiber : 0 },
    { label: `열량 ${Math.round(c.kcal)} kcal 보충`, ratio: need.kcal > 0 ? Math.min(c.kcal, need.kcal) / need.kcal : 0 }
  ]
  parts.sort((a, b) => b.ratio - a.ratio)
  const wantTags =
    parts[0].label.startsWith('단백질') ? ['고단백']
      : parts[0].label.startsWith('식이섬유') ? ['고식이섬유', '십자화과', '저잔사']
        : ['고열량밀도']

  const hit = explain(c, wantTags)
  return {
    food: c.food,
    servings: 1,
    contribution: parts[0].label,
    /*
     * 권장 근거가 붙은 식품이면 그 문장을 그대로 쓴다.
     * 근거가 없는 식품은 없는 대로 말한다 — 있지도 않은 권고를 지어내지 않는다.
     */
    ruleTitle: hit?.rule.title ?? '이 암종에서 특별히 권하거나 피할 이유는 없는 음식입니다. 모자란 부분을 채우려고 넣었습니다.',
    // 규칙이 없으면 근거 수준도 없다. 없는 근거에 'G' 배지를 붙이면 근거가 있는 것처럼 보인다.
    evidence: hit?.rule.evidence,
    refIds: hit?.rule.refIds ?? []
  }
}

/**
 * 비어 있는 끼니를 채울 한 가지를 고른다.
 *
 * 하루 목표를 이미 채웠다고 저녁을 통째로 비워 두면 굶으라는 말로 읽힌다.
 * 남은 여유에 따라 성격을 바꿔 고른다.
 *  - 열량에 여유가 있으면: 그 끼니에 어울리는, 근거가 있는 보통 요리
 *  - 여유가 없으면: 열량은 낮고 부피·식이섬유로 배를 채우는 것 (국·나물·채소)
 * 어느 쪽이든 왜 그렇게 골랐는지 함께 돌려준다.
 *
 * 나트륨은 넘겼다고 해서 끼니를 막는 근거로 쓰지 않는다.
 * 열량 860 kcal 짜리 하루에 저녁을 안 넣는 것이 나트륨 2,500 mg 보다 위험하다.
 * 암환자에게는 저영양이 먼저다(ESPEN). 대신 나트륨이 낮은 쪽을 크게 우대한다.
 */
function pickForSlot(
  all: Cand[],
  slot: MealSlot,
  exclude: Set<string>,
  room: { kcal: number; na: number },
  /** 하루 목표 하단에 얼마나 모자란지 — 모자랄수록 나트륨보다 열량을 우선한다 */
  deficit: number,
  /** 그날의 차례 */
  turn: number,
  /** 최근에 나온 식품과 며칠 전인지 */
  recent: Map<string, number>,
  /** 지금까지 짜인 끼니 — 같은 식품군이 겹치지 않게 본다 */
  meals: Record<MealSlot, MenuEntry[]>
): { entry?: Filler; note?: string } {
  /*
   * 여기서도 최근에 나온 것은 피한다.
   * 이 단계에 이력을 보지 않는 구멍이 있어서, 앞 단계에서 막아 둔 주요리가
   * 빈 끼니를 채울 때 그대로 다시 올라오고 있었다.
   */
  const fresh = all.filter((c) => {
    const ago = recent.get(c.food.id)
    return !(ago !== undefined && ago <= REPEAT_BLOCK_DAYS && c.kcal >= REPEAT_MIN_KCAL)
  })
  /** 이 끼니에 그 식품군을 더 놓을 수 있는가 */
  const roomForGroup = (c: Cand) => {
    const capG = SLOT_GROUP_CAP[c.food.group] ?? SLOT_GROUP_CAP_DEFAULT
    return meals[slot].filter((e) => e.food.group === c.food.group).length < capG
  }
  const fits = fresh.filter(
    (c) => !exclude.has(c.food.id) && slotsFor(c.food).includes(slot) && roomForGroup(c)
  )
  if (fits.length === 0) {
    return {
      note:
        `${slot}에 올릴 만한 요리가 후보에 없습니다. ` +
        '내 정보에서 드시는 요리 계통(한식·양식·중식)을 넓히시면 후보가 늘어납니다.'
    }
  }

  const naOver = room.na <= 0
  /*
   * 나트륨이 넘쳤으면 낮은 쪽을 우대한다.
   * 다만 열량이 모자란 하루에서는 그 우대를 줄인다.
   * 나트륨을 아끼려다 저녁이 두유 한 잔이 되면 그게 더 나쁘다.
   */
  const naWeight = naOver ? (deficit > 300 ? 45 : 15) : 60
  const naPenalty = (c: Cand) => (naOver || c.na > room.na ? c.na / naWeight : 0)

  /**
   * 한 끼의 중심이 될 수 있는 식품군.
   * 두유·요구르트도 영양은 좋지만 저녁 한 끼로 내놓으면 끼니로 읽히지 않는다.
   */
  const MAIN_DISH = new Set<FoodGroup>([
    '밥·면·죽 요리', '국·탕·찌개', '반찬·조림·볶음', '육류',
    '어패류', '가금류·난류', '두류·대두가공', '외식·프랜차이즈'
  ])
  /** 열량이 모자랄수록 열량이 있는 쪽을 크게 본다 */
  const kcalWeight = deficit > 300 ? 15 : 40
  const anchor = (c: Cand) => (MAIN_DISH.has(c.food.group) ? 14 : 0)

  // 1) 열량에 여유가 있으면 보통 한 끼를 낸다
  if (room.kcal >= 250) {
    const pool = fits.filter((c) => c.kcal <= room.kcal)
    /*
     * 나트륨 예산 안에 드는 것을 먼저 본다.
     * 이 단계에는 나트륨 조건이 아예 없어서, 앱이 처음부터 구성한 하루가
     * 스스로 정한 상한을 넘기는 일이 있었다(위암 1,546 / 1,500 mg).
     * 예산 안에 드는 것이 하나도 없을 때만 넘겨서 고른다 — 끼니를 비우는 것보다는 낫다.
     */
    const within = pool.filter((c) => c.na <= room.na)
    const src = within.length > 0 ? within : pool.length > 0 ? pool : fits
    const rank = (c: Cand) =>
      c.bonus - c.penalty + anchor(c) + c.kcal / kcalWeight - naPenalty(c)
    // 여기서도 엇비슷한 것끼리는 날마다 차례를 돌린다
    const ranked = [...src].sort((a, b) => rank(b) - rank(a))
    const near = ranked.filter((x) => rank(x) >= rank(ranked[0]) - ROTATE_TOLERANCE).slice(0, ROTATE_POOL)
    const c = near[((turn % near.length) + near.length) % near.length]
    const hit = explain(c, ['고단백', '고열량밀도'])
    return {
      entry: {
        food: c.food, servings: 1,
        contribution: `${slot} 한 끼 구성`,
        ruleTitle: hit?.rule.title ?? '하루 세 끼의 틀을 지키기 위해 넣었습니다.',
        evidence: hit?.rule.evidence,
        refIds: hit?.rule.refIds ?? []
      },
      note: naOver
        ? `나트륨이 이미 상한을 넘어, ${slot}은 나트륨이 가장 낮은 것(${Math.round(c.na)} mg)으로 골랐습니다.`
        : undefined
    }
  }

  /*
   * 2) 열량 여유가 없다.
   *
   * 그래도 끼니를 비우지 않는다. 열량은 최소로 하면서 부피와 식이섬유로
   * 배가 부른 것 — 나물·채소·맑은국 쪽에서 고른다.
   */
  const light = fits.filter((c) => c.kcal <= 150)
  const src = light.length > 0 ? light : [...fits].sort((a, b) => a.kcal - b.kcal).slice(0, 5)
  const c = [...src].sort((a, b) => b.satiety * 3 + b.bonus - b.penalty - naPenalty(b) - (a.satiety * 3 + a.bonus - a.penalty - naPenalty(a)))[0]
  const hit = explain(c, ['고식이섬유', '수분보충', '저잔사'])

  const over = Math.round(-room.kcal)
  return {
    entry: {
      food: c.food, servings: 1,
      contribution: `가볍게 · ${Math.round(c.kcal)} kcal`,
      ruleTitle:
        hit?.rule.title ??
        '하루 목표에 이미 도달해, 열량은 낮고 포만감이 큰 것으로 골랐습니다.',
      evidence: hit?.rule.evidence ?? 'G',
      refIds: hit?.rule.refIds ?? []
    },
    note:
      (over > 0
        ? `아침·점심만으로 하루 열량 목표를 ${over} kcal 넘겼습니다. `
        : '하루 열량 목표에 이미 도달했습니다. ') +
      `${slot}을 거르시라는 뜻은 아니라서, 열량 ${Math.round(c.kcal)} kcal·나트륨 ${Math.round(c.na)} mg 으로 ` +
      '부담이 가장 적으면서 포만감이 큰 것을 올렸습니다. ' +
      (over > 0 ? '다음부터는 아침·점심의 양을 조금 줄여 저녁 몫을 남겨 두시는 편이 낫습니다.' : '')
  }
}


/**
 * 하루 합계를 사람이 읽는 문장으로 바꾼다.
 *
 * 이 함수를 따로 둔 이유가 있다.
 * 예전에는 '오늘 식단 평가'가 추천으로 채워진 하루를 계산해,
 * 화면 위쪽에는 나트륨 2,730 mg 이라 써 놓고 아래쪽 평가에서는 3,250 mg 이라 말했다.
 * 아직 담지도 않은 저녁이 계산에 들어가 있었기 때문이다.
 * 무엇을 계산했는지 부르는 쪽이 정하도록 합계를 인자로 받는다.
 */
/**
 * 평가 한 줄.
 *
 * 예전에는 문장만 돌려주어 화면에서 모두 같은 회색 문단으로 늘어섰다.
 * 그래서 "충족합니다" 와 "상한을 넘습니다" 가 나란히 같은 무게로 보였다.
 * 무엇이 문제인지 눈으로 먼저 골라낼 수 있도록 성격을 함께 돌려준다.
 */
export interface DayNote {
  tone: 'good' | 'low' | 'over' | 'info'
  /** 무엇에 대한 말인지 — 화면에서 제목으로 쓴다 */
  topic: string
  text: string
}

export function dayNotes(
  totals: NutrientTotals,
  suppTotals: NutrientTotals,
  patient: PatientContext,
  /** 나트륨 값이 없는 식품의 이름들 — 합계가 실제보다 적게 나온다 */
  naUnknown: string[] = []
): DayNote[] {
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const naLimit = profile.target.naLimit ?? 2000
  const notes: DayNote[] = []

  const kcal = totals.kcal ?? 0
  const protein = totals.protein ?? 0
  const na = totals.na ?? 0

  if (kcal < target.kcal[0]) {
    notes.push({ tone: 'low', topic: '에너지',
      text: `목표(${target.kcal[0]}~${target.kcal[1]} kcal)보다 ${Math.round(target.kcal[0] - kcal)} kcal 부족합니다. ` +
        '견과·유제품·경구영양보충 음료처럼 부피 대비 열량이 높은 것을 간식으로 더해 보세요.' })
  } else if (kcal > target.kcal[1] * 1.15) {
    notes.push({ tone: 'over', topic: '에너지',
      text: `목표 상단(${target.kcal[1]} kcal)을 넘습니다. 치료 중이라면 문제가 아닐 수 있으나, 체중 관리기라면 조정이 필요합니다.` })
  } else {
    notes.push({ tone: 'good', topic: '에너지',
      text: `${Math.round(kcal)} kcal — 목표 범위(${target.kcal[0]}~${target.kcal[1]} kcal)에 들어옵니다.` })
  }

  if (protein < target.protein[0]) {
    notes.push({ tone: 'low', topic: '단백질',
      text: `목표(${target.protein[0]}~${target.protein[1]} g)보다 ${Math.round(target.protein[0] - protein)} g 부족합니다. ` +
        '계란·두부·생선·닭가슴살 중 하나를 한 끼에 더하면 대개 채워집니다.' })
  } else {
    notes.push({ tone: 'good', topic: '단백질',
      text: `${Math.round(protein)} g — 목표(${target.protein[0]} g 이상)를 충족합니다.` })
  }

  if (na > naLimit) {
    notes.push({ tone: 'over', topic: '나트륨',
      text: `${Math.round(na)} mg 으로 이 암종의 권고 상한(${naLimit} mg)을 넘습니다. ` +
        '국물을 남기는 것만으로 상당 부분이 줄어듭니다.' })
  } else if (na > naLimit * 0.85) {
    notes.push({ tone: 'info', topic: '나트륨',
      text: `${Math.round(na)} mg — 상한(${naLimit} mg)에 가깝습니다. 오늘은 국물을 남기시는 편이 좋겠습니다.` })
  } else {
    notes.push({ tone: 'good', topic: '나트륨', text: `${Math.round(na)} mg — 상한(${naLimit} mg) 안에 있습니다.` })
  }

  const suppNa = suppTotals.na ?? 0
  if (suppNa > 0) {
    notes.push({ tone: 'info', topic: '영양제 몫',
      text: `나트륨 ${Math.round(na)} mg 중 ${Math.round(suppNa)} mg 은 드시는 영양제에서 나옵니다. ` +
        '끼니별 소계를 모두 더한 값과 합계가 그만큼 차이 납니다.' })
  }

  const fiber = totals.fiber ?? 0
  const goal = fiberGoal(patient, profile)
  if (goal.lowResidue) {
    if (fiber > goal.range[1]) {
      notes.push({ tone: 'over', topic: '식이섬유',
        text: `${Math.round(fiber)} g 입니다. 지금은 잔사를 줄여야 하는 시기라 ` +
          `${goal.range[0]}~${goal.range[1]} g 정도가 적당합니다. 거친 나물·통곡·생채소를 줄여 보세요.` })
    } else {
      notes.push({ tone: 'good', topic: '식이섬유',
        text: `${Math.round(fiber)} g — 설사·장루가 있는 동안의 목표(${goal.range[0]}~${goal.range[1]} g) 안에 있습니다. ` +
          '이 시기에는 섬유를 늘리는 것이 목표가 아닙니다.' })
    }
  } else if (fiber < goal.range[0]) {
    notes.push({ tone: 'low', topic: '식이섬유',
      text: `${Math.round(fiber)} g 으로 목표(${goal.range[0]}~${goal.range[1]} g)에 못 미칩니다.` })
  } else {
    notes.push({ tone: 'good', topic: '식이섬유', text: `${Math.round(fiber)} g — 목표(${goal.range[0]}~${goal.range[1]} g) 안에 있습니다.` })
  }

  /*
   * 나트륨을 신고하지 않은 가공식품이 섞여 있으면 합계가 실제보다 적게 나온다.
   * "상한 안에 들어옵니다" 라고 안심시켜 놓고 실제로는 넘겼을 수 있으므로 밝힌다.
   */
  if (naUnknown.length > 0) {
    const head = naUnknown.slice(0, 3).join('·')
    const subject = naUnknown.length > 3 ? `${head} 외 ${naUnknown.length - 3}가지` : head
    notes.push({ tone: 'info', topic: '빠진 값',
      text: `${subject}${topicParticle(subject)} 원본 자료에 나트륨 값이 없어 위 합계에 잡히지 않았습니다. ` +
        '실제 섭취량은 이보다 많습니다.' })
  }

  return notes
}

/**
 * 은/는 을 앞말에 맞춰 고른다.
 * "도넛는" 처럼 나오면 앱이 만든 문장이라는 티가 그대로 난다.
 */
function topicParticle(word: string): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  // 한글 음절이 아니면(숫자·영문·괄호 등) 안전하게 '은'
  if (code < 0xac00 || code > 0xd7a3) return '은'
  return (code - 0xac00) % 28 === 0 ? '는' : '은'
}

/** 담은 것 중 나트륨 값이 없는 식품의 이름 */
export function naUnknownNames(items: SelectedItem[]): string[] {
  const out: string[] = []
  for (const it of items) {
    const f = FOOD_BY_ID[it.foodId]
    if (f && f.per100.na === undefined && !out.includes(f.name)) out.push(f.name)
  }
  return out
}
