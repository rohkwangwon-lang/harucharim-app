import type { Cuisine, EvidenceLevel, Food, FoodGroup, MealSlot, NutrientKey, PatientContext, Season, SelectedItem, Supplement } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { CURATED_FOODS, FOOD_BY_ID, isAnchorDish, isIngredientOnly, mealIsComplete, mealRole, type MealRole } from '../data/foods'
import { INGREDIENT_DISHES } from '../data/foods/ingredientDishes'
import { CANCER_BY_ID } from '../data/cancers'
import { activeInteractions, activeRules, evaluateFood, type RuleHit, type InteractionHit } from './rules'
import { addTotals, dosingWeight, effectiveLossPct, foodContribution, microTargets, personalTarget, type MicroTarget, type NutrientTotals } from './nutrition'

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
  /*
   * 나물·김치는 아침상의 기본이다.
   *
   * 처음에는 채소와 반찬을 점심·저녁에만 두었다. 서양식 아침(빵·우유·달걀)을
   * 그대로 옮겨 놓은 셈인데, 한국 아침상은 밥·국·나물이다.
   * 그 바람에 아침에 놓을 수 있는 것이 죽·우유·과일·달걀뿐이라,
   * 아침에 포도 한 송이(101 kcal)만 놓인 채 끝나는 날이 나왔다.
   * 저녁의 두부부침을 아침으로 옮기려 해도 '반찬' 이라 갈 수가 없었다.
   */
  채소: ['아침', '점심', '저녁'],
  '해조·버섯': ['아침', '점심', '저녁'],
  // 과일은 식후 후식으로도 먹는다. 간식으로만 묶어 두면 간식이 차는 순간
  // 아침으로 몰려, 가벼워야 할 아침이 가장 무거운 끼니가 된다.
  과일: ['아침', '점심', '저녁', '간식'],
  육류: ['점심', '저녁'],
  '가금류·난류': ['아침', '점심', '저녁'],
  // 생선구이 한 토막은 아침상에 흔하다. 무거운 것은 아래 HEAVY_MAIN 에서 걸린다
  어패류: ['아침', '점심', '저녁'],
  '우유·유제품': ['아침', '간식'],
  '유지·당류': ['점심', '저녁'],
  '국·탕·찌개': ['아침', '점심', '저녁'],
  '밥·면·죽 요리': ['아침', '점심', '저녁'],
  '반찬·조림·볶음': ['아침', '점심', '저녁'],
  가공식품: ['간식'],
  음료: ['점심', '저녁', '간식'],
  '간식·디저트': ['간식'],
  '외식·프랜차이즈': ['점심', '저녁'],
  /*
   * 경구영양보충은 끼니와 함께 드시는 것이지 군것질이 아니다.
   *
   * 간식에만 갈 수 있게 묶어 두었더니 간식이 쓰레기통이 됐다.
   * 균형영양식 두 팩에 미숫가루에 단백질음료까지 몰려 간식이 976 kcal —
   * 하루의 61 % 였다. 그 대신 아침 128 · 점심 104 kcal 로,
   * 그건 식사가 아니라 결식이다. 실제로 하루의 27 % 에서 이런 일이 났다.
   *
   * 위를 잘라 내신 분이 점심에 균형영양식을 곁들이는 것은 이상한 일이 아니라
   * 오히려 표준적인 방법이다. 갈 수 있는 자리를 넓혀 준다.
   */
  '경장영양·환자식': ['아침', '점심', '저녁', '간식']
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

/*
 * 아침에 올리지 않을 무거운 주요리.
 *
 * 식품군만으로는 걸러지지 않는 것이 있다. '가금류·난류' 에는 삶은 달걀(85 kcal)도
 * 있고 닭백숙(390 kcal)도 있어서, 달걀을 아침에 놓으려고 이 군을 열어 두면
 * 백숙까지 따라 들어온다. 실제로 아침 516 · 저녁 371 인 날의 아침에 백숙이 있었다.
 *
 * 이 앱은 이미 "아침에 630 kcal 짜리 삼계탕을 놓아 봐야 실제로 드시지 않는다" 고
 * 적어 두고서, 정작 백숙은 막지 않고 있었다. 숫자를 맞추는 문제가 아니라
 * 아침상에 오를 만한 것인지의 문제다.
 *
 * 죽·국은 제외한다 — 아침에 죽 한 그릇은 열량이 높아도 이상하지 않다.
 */
const HEAVY_MAIN_GROUPS = new Set<FoodGroup>(['가금류·난류', '어패류', '육류', '외식·프랜차이즈'])
const HEAVY_MAIN_KCAL = 250

function slotsFor(food: Food): MealSlot[] {
  const slots = SLOT_BY_GROUP[food.group] ?? ['점심', '저녁']
  if (!slots.includes('아침')) return slots
  if (!HEAVY_MAIN_GROUPS.has(food.group)) return slots
  const kcal = (food.per100.kcal * food.serving.g) / 100
  return kcal > HEAVY_MAIN_KCAL ? slots.filter((s) => s !== '아침') : slots
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

    /*
     * 손으로 적어 둔 것을 먼저 본다.
     *
     * 이름이 겹치는 것만 찾던 때에는 재료 97종 가운데 8종만 제안이 나왔다 —
     * '시금치' 로 '시금치나물' 은 찾아도, 무·배추·양파처럼 이름이 요리에 드러나지 않는 것은
     * 한 건도 잇지 못했다. 무로 깍두기를 담근다는 것은 표에 적어 두는 수밖에 없다.
     */
    const listed = (INGREDIENT_DISHES[src.name] ?? [])
      .map((n) => CURATED_FOODS.find((f) => f.name === n))
      .filter((f): f is Food => !!f)

    const byName = key.length >= 2
      ? CURATED_FOODS.filter((f) => f.id !== src.id && !f.form.includes('ingredient') && f.name.includes(key))
      : []

    const seenDish = new Set<string>()
    const dishes = [...listed, ...byName].filter((f) => {
      if (f.id === src.id || chosenIds.has(f.id)) return false
      if (seenDish.has(f.id)) return false
      if (!allowedCuisine(f, cuisines)) return false
      const v = evaluateFood(f, patient, 1, cached)
      if (v.level === 'avoid') return false
      seenDish.add(f.id)
      return true
    })
      .sort((a, b) => {
        // 이 암종에서 권장되는 것을 먼저
        const av = evaluateFood(a, patient, 1, cached).hits.filter((h) => h.rule.level === 'prefer').length
        const bv = evaluateFood(b, patient, 1, cached).hits.filter((h) => h.rule.level === 'prefer').length
        if (av !== bv) return bv - av
        // 그다음은 싱거운 쪽 — 같은 재료로도 덜 짜게 드실 수 있다
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
/*
 * 옵션 이름을 잘못 적으면 조용히 무시된다.
 *
 * 검사 아홉 곳이 day 를 dayKey 라고 적고 있었다. 타입이 그것을 잡아 주지 못한 것은
 * MenuOptions 가 넓은 자리(supplementsOrOptions)로 들어오기 때문인데,
 * 그 바람에 '날마다 다른가' 를 묻는 검사들이 모두 같은 날을 보고 있었고
 * 그런 줄도 모른 채 통과하고 있었다.
 *
 * 모르는 열쇠가 들어오면 알아채도록 남겨 둔다.
 */
export const MENU_OPTION_KEYS = ['supplements', 'day', 'nonce', 'recent'] as const

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
 * 며칠에 걸친 섭취 흐름.
 *
 * 하루만 보면 어제 잔치를 했는지, 몇 주째 그런지 구분할 수 없다.
 * 하루 넘친 것은 흔한 일이고 조언할 거리가 아니다.
 * 몇 주째 넘치고 체중까지 오르고 있다면 그건 다른 이야기다.
 */
export function intakeTrend(
  diary: Record<string, SelectedItem[]>,
  patient: PatientContext,
  today: string,
  days = 14
): { recordedDays: number; avgKcal: number; avgProtein: number; overDays: number } | null {
  const dayNo = (k: string) => {
    const [y, m, d] = k.split('-').map(Number)
    return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000)
  }
  const t = dayNo(today)
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)

  let sumK = 0, sumP = 0, n = 0, over = 0
  for (const [key, items] of Object.entries(diary)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !items?.length) continue
    const ago = t - dayNo(key)
    if (ago < 0 || ago >= days) continue
    let k = 0, pr = 0
    for (const it of items) {
      const f = FOOD_BY_ID[it.foodId]
      if (!f) continue
      const c = foodContribution(f, it.servings)
      k += c.kcal ?? 0
      pr += c.protein ?? 0
    }
    sumK += k; sumP += pr; n++
    if (k > target.kcal[1]) over++
  }
  if (n < 5) return null   // 며칠 안 되는 기록으로 흐름을 말할 수는 없다
  return { recordedDays: n, avgKcal: Math.round(sumK / n), avgProtein: Math.round(sumP / n), overDays: over }
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

/*
 * '다시 구성' 을 누르셨을 때는 더 과감하게 돌린다.
 *
 * 날마다 조금씩 다르게 하는 것과, 마음에 안 들어 다시 청하시는 것은 다른 요구다.
 * 앞의 값으로는 평균 36 % 만 바뀌었고 가장 흔한 것이 일곱 가지 중 두 가지였다.
 * 그런데 그 둘이 대개 곁들이라, 저녁의 주요리가 그대로면
 * 눌러도 아무 일이 없는 것처럼 보인다. 실제로 "변화가 없다" 는 말을 들었다.
 *
 * 점수가 가장 높은 하나만 옳은 답이 아니다 — 엇비슷한 것들 중 무엇을 내놓아도
 * 영양은 비슷하게 맞는다. 다시 청하실 때는 그 폭을 넓게 본다.
 */
const RETRY_POOL = 12
const RETRY_TOLERANCE = 75

/** 고를 것이 동났을 때 쓰는 빈 이력 — 되풀이를 허용한다는 뜻이다 */
const EMPTY_RECENT: Map<string, number> = new Map()

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

  /* 오타로 넘긴 열쇠는 조용히 사라지지 않고 여기서 드러난다 */
  for (const k of Object.keys(opts)) {
    if (!(MENU_OPTION_KEYS as readonly string[]).includes(k)) {
      throw new Error(`buildDayMenu: 모르는 옵션 '${k}' — ${MENU_OPTION_KEYS.join(', ')} 중 하나여야 합니다`)
    }
  }

  const supplements = opts.supplements ?? []
  /* 이분에게만 세는 미량영양소 — 해당 사항이 없으면 빈 배열이라 아래가 그대로 돈다 */
  const micros = microTargets(patient)
  /* 신장이 걸리는 분만 단백질에 뚜껑을 씌운다 */
  const renalCap = patient.conditions.includes('신기능저하')
  /*
   * '다시 구성' 을 누르셨는가.
   *
   * nonce 는 그 단추를 누를 때마다 하나씩 올라간다. 날마다 다르게 하는 것과
   * 마음에 안 들어 다시 청하시는 것은 다른 요구이므로, 이때는 폭을 넓게 본다.
   */
  const retry = (opts.nonce ?? 0) > 0
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

  /*
   * 계절은 그 식단이 놓인 날짜에서 읽는다.
   *
   * 예전에는 늘 오늘 날짜로 판정했다. 오늘 식단만 볼 때는 맞았지만,
   * 기록에서 지난 겨울의 하루를 열면 '여름 제철' 이 붙어 있었다.
   * 날짜를 받아 두고 쓰지 않고 있었던 셈이다.
   */
  const season = currentSeason(opts.day ? new Date(`${opts.day}T12:00:00`) : new Date())
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
    const microRoom = microBudget(micros, cur)
    /*
     * 열량·단백질·식이섬유가 찼다고 바로 멈추면 미량영양소를 쫓아갈 기회가 없다.
     *
     * 실제로 아로마타제 억제제를 드시는 분의 하루가 늘 칼슘 817 mg 에서 끝났다.
     * 목표를 다 채우고 루프가 끝나 버리니, 점수에 칼슘을 넣어 둔 것이 쓰이질 않았다.
     *
     * 그렇다고 열량을 넘겨 가며 채우지는 않는다. 칼슘을 맞추자고 과식을 시킬 수는 없다.
     * 상한까지 여유가 있을 때만 한 가지 더 본다.
     */
    const microShort = microRoom.some((m) => m.need > 0)
    if (need.kcal <= 25 && need.protein <= 2 && need.fiber <= 0.5) {
      if (!microShort || target.kcal[1] - (cur.kcal ?? 0) <= 120) break
    }

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
    const room = {
      kcal: target.kcal[1] - (cur.kcal ?? 0),
      na: naLimit - na,
      /* 단백질에도 위가 있다 — ESPEN 은 1.0~1.5 g/kg, 많아도 2.0 g/kg 을 넘기지 않는다 */
      protein: target.protein[1] - (cur.protein ?? 0),
      /*
       * 설사·장루가 있는 동안에는 식이섬유에도 위가 있다.
       *
       * 앱은 "지금은 8~15 g 정도가 적당합니다" 라고 말해 놓고
       * 정작 추천에서는 섬유를 막지 않아, 저잔사 대상인 날의 56 % 가
       * 그 상한을 넘겼다(평균 16.3 g). 말과 행동이 어긋나 있었다.
       * 저잔사가 아닌 분에게는 위가 없다(Infinity).
       */
      fiber: fiber.lowResidue ? fiber.range[1] - (cur.fiber ?? 0) : Infinity
    }
    /*
     * 한 가지가 가져가도 되는 나트륨의 최대치.
     *  - 예산이 남아 있으면 그 절반까지. 뒤에 올 것의 자리를 남겨야 한다.
     *  - 예산이 없어도 열량·단백질이 모자라면 250 mg 이하는 받는다.
     *    견과·과일·나물은 대개 여기 들어온다.
     *  - 상한의 1.5 배를 넘어서면 거의 무염인 것만 받는다. 여기서도 멈추지 않으면
     *    나트륨을 무한정 쌓게 된다.
     */
    const short = need.kcal > 0 || need.protein > 0
    /*
     * 나트륨 천장.
     *
     * 모자란 동안에는 상한을 넘겨서라도 먹인다는 원칙은 그대로다.
     * 다만 어디까지나 '조금 넘는 것' 이어야 한다.
     * 고를 것이 동났을 때 되풀이를 허용하도록 고친 뒤로 짠 음식이 더 들어와,
     * 상한의 1.5 배를 넘는 날이 생겼다(2,000 mg 상한에 3,072 mg).
     * 그건 열량을 채우자는 명분으로도 설명되지 않는다.
     * 상한의 1.25 배부터는 거의 무염인 것만 받는다.
     */
    /*
     * 모자란 정도에 따라 문을 연다.
     *
     * 한 값으로 고정했더니 어느 쪽이든 한쪽이 무너졌다 —
     * 넉넉히 잡으면 나트륨이 상한을 넘는 날이 5.5 % 로 늘고,
     * 빠듯하게 잡으면 체격이 큰 분(하루 3,120 kcal)이 2,183 kcal 에서 멈췄다.
     * 조금 모자란 날과 크게 모자란 날에 같은 잣대를 댈 이유가 없다.
     *
     * 목표의 8 % 쯤 모자란 정도면 짜지 않은 것으로 채우면 되고,
     * 3분의 1이 비어 있으면 그건 나트륨을 아낄 자리가 아니다.
     */
    const gap = target.kcal[0] > 0 ? Math.max(0, need.kcal) / target.kcal[0] : 0
    const shortCap = 45 + Math.min(1, gap / 0.25) * 55

    const naCap =
      na >= naLimit * 1.25 ? Math.max(25, room.na * 0.5)
        : short ? Math.max(shortCap, room.na * 0.5)
          // 식이섬유만 모자란 경우에도 길은 열어 둔다.
          // 나물·채소는 대개 200 mg 아래라, 여기서 막으면 채소를 못 넣는다.
          : need.fiber > 0 ? Math.max(120, room.na * 0.5)
            : Math.max(0, room.na * 0.5)
    /*
     * 며칠 안에 나온 것을 피하다 보면 고를 것이 동날 때가 있다.
     * 드실 수 있는 음식이 적은 암종에서 특히 그렇다 — 두경부암에 연하곤란이 겹치면
     * 후보가 74 종이고 그중 열량이 되는 것은 스무 가지 남짓이다.
     * 사흘씩 쉬게 하면 금세 바닥난다.
     *
     * 그때는 되풀이를 허용한다. 어제 먹은 것이 또 나오는 것과
     * 하루가 목표의 3분의 2에 그치는 것 중에서는 앞쪽이 낫다.
     * 다양성은 영양을 채운 다음의 이야기다.
     */
    const best =
      bestFiller(candidates, need, room, used, meals, groupCount, naCap, cap, quota, dayIndex + guard, recent, GROUP_CAP, microRoom, renalCap, retry) ??
      bestFiller(candidates, need, room, used, meals, groupCount, naCap, cap, quota, dayIndex + guard, EMPTY_RECENT, GROUP_CAP, microRoom, renalCap, retry)
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

    const room = {
      kcal: target.kcal[1] - (cur.kcal ?? 0),
      na: naLimit - (cur.na ?? 0),
      protein: target.protein[1] - (cur.protein ?? 0),
      fiber: fiber.lowResidue ? fiber.range[1] - (cur.fiber ?? 0) : Infinity
    }
    if (room.kcal <= 40) break

    /*
     * 보충 단계에서는 '며칠 안에 나온 것' 을 따지지 않는다.
     *
     * 날마다 다른 식단을 내려고 최근에 나온 주요리를 사흘씩 쉬게 하는데,
     * 쓸 수 있는 음식이 적은 암종(두경부암처럼 연하곤란이 겹치는 경우)에서는
     * 그러다 후보가 동나서 열량이 500 kcal 넘게 모자란 날이 생겼다.
     * 여러 날에 걸쳐 돌려 보니 5,400 일 중 374 일이 그랬다.
     *
     * 다양성과 영양 중에서는 영양이 먼저다. 여기까지 왔다는 것은
     * 앞 단계가 이미 할 수 있는 만큼 다양하게 짰다는 뜻이다.
     */
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
      new Map<string, number>(),
      GROUP_CAP + 2,
      microBudget(micros, cur),
      renalCap,
      retry
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
    /*
     * 잦은 소량으로 드셔야 하는 분은 간식이 '비어 있지 않기만' 해서는 부족하다.
     *
     * 위를 잘라 내셨거나 입맛이 없는 분께는 하루를 넷으로 고르게 나누는 것이 목표라
     * 간식 몫을 22 % 로 잡아 두었다. 그런데 이 단계는 '비어 있는 끼니' 만 채워서,
     * 간식에 213 kcal 짜리 하나가 놓이면 그것으로 끝났다 — 하루의 12 % 다.
     * 그래서 제 몫의 절반도 못 채운 간식은 한 번 더 본다.
     */
    const graze = shares['간식'] >= 0.2
    const thin = graze && slot === '간식' &&
      meals['간식'].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0) < quota['간식'] * 0.55
    if (meals[slot].length > 0 && !thin) continue
    if (thin && meals['간식'].length >= cap) continue
    const cur = running()
    const room = {
      kcal: target.kcal[1] - (cur.kcal ?? 0),
      na: naLimit - (cur.na ?? 0)
    }
    const deficit = Math.max(0, target.kcal[0] - (cur.kcal ?? 0))
    const { entry, note } = pickForSlot(candidates, slot, used, retry, room, deficit, dayIndex, recent, meals)
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
             * 제철로 갈아 끼울 때도 상차림을 본다.
             *
             * 여기는 항목의 내용만 바꾸므로 placeIn 을 지나지 않는다.
             * 그래서 곁들임 상한이 걸리지 않았고, 실제로 이 자리가
             * "단호박(찐 것) + 군고구마" 같은 끼니를 만든 유일한 통로였다.
             * 하나뿐인 반찬이 과일로 갈리면 밥상이 무너지지만, 그것까지 여기서 막지는 않는다.
             * 막아 보았더니 신장이 걸리는 분의 단백질 초과가 0.4 % 에서 1.8 % 로 올랐다 —
             * 고기 한 접시가 과일로 갈리는 것이 그분께는 이득인데 그 길을 닫은 셈이다.
             * 무너진 상은 뒤의 마지막 단계가 낮은 단백질 반찬으로 다시 세운다.
             */
            /*
             * 상차림과 신장 사이에서.
             *
             * 이 상한을 걸면 곁들임 몰림이 8.4 % 에서 0 으로 떨어지는데,
             * 신장이 걸리는 분의 단백질 초과가 0.3 % 에서 1.8 % 로 올랐다.
             * 제철로 갈아 끼우는 이 자리가 고기 한 접시를 과일로 바꾸는 통로이기도 해서,
             * 막으면 그 길까지 함께 닫힌다.
             *
             * 둘이 부딪히면 신장이 먼저다. 상이 조금 성긴 것과 단백질이 40 g 넘치는 것은
             * 무게가 다르다. 그래서 단백질을 낮추는 갈아 끼우기는 막지 않는다.
             */
            /*
             * 제철로 갈아 끼울 때도 상차림을 본다.
             * 여기는 항목의 내용만 바꾸므로 placeIn 을 지나지 않아,
             * 곁들임 상한이 걸리지 않는 유일한 통로였다.
             */
            (!sideClash(meals, slot, c.food, entry) ||
              (renalCap && c.protein < (foodContribution(entry.food, entry.servings).protein ?? 0))) &&
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
  
    /*
     * 4-2-2) 상차림의 짜임새를 맞춘다.
     *
     * 여태 영양소만 맞추고 상은 보지 않았다. 그래서 아침에 흑미밥 한 공기만
     * 올라가거나, 저녁이 찹쌀밥과 복숭아 두 가지로 끝나는 일이 생겼다.
     * 열량도 단백질도 맞았지만 그건 밥상이 아니다 — 끼니의 12 % 가 그랬다.
     *
     * 한국 상차림은 밥·국·반찬이 한 벌이다. 밥은 혼자 서지 못하고,
     * 과일은 아무리 놓아도 반찬 자리를 대신하지 못한다.
     * 죽이나 국수 한 그릇은 그것만으로 한 끼이므로 손대지 않는다.
     *
     * 채우는 순서는 상차림의 순서를 따른다 — 국이 먼저, 없으면 주찬, 그다음 부찬.
     * 밥에 국 한 그릇이 붙는 것이 가장 흔한 모습이기 때문이다.
     */
    {
      const order: MealRole[] = ['soup', 'main', 'side']
      for (const slot of ['아침', '점심', '저녁'] as MealSlot[]) {
        const here = meals[slot]
        if (here.length === 0) continue
        if (mealIsComplete(here.map((e) => e.food))) continue
  
        const cur = running()
        const room = {
          kcal: target.kcal[1] - (cur.kcal ?? 0),
          na: naLimit - (cur.na ?? 0),
          protein: target.protein[1] - (cur.protein ?? 0),
          fiber: fiber.lowResidue ? fiber.range[1] - (cur.fiber ?? 0) : Infinity
        }
  
        /*
         * 반찬 한 가지를 더한다고 하루가 무너지면 안 되므로, 가벼운 것 중에서 고른다.
         * 나물·국은 대개 100 kcal 아래라 이 정도로 충분히 찾아진다.
         */
        let picked: Cand | undefined
        for (const role of order) {
          const fits = candidates
            .filter((c) => !used.has(c.food.id))
            .filter((c) => mealRole(c.food) === role)
            /*
             * 상을 세우는 반찬만 센다.
             *
             * 역할만 보았더니 삶은 콩과 찐 고구마가 'main'·'side' 로 잡혀,
             * "쌀밥 + 옥수수" 를 채워 놓고 상을 갖췄다고 여겼다.
             * 국이거나 조리된 반찬이어야 밥상이 선다.
             */
            .filter((c) => isAnchorDish(c.food))
            .filter((c) => slotsFor(c.food).includes(slot))
            .filter((c) => {
              const capG = SLOT_GROUP_CAP[c.food.group] ?? SLOT_GROUP_CAP_DEFAULT
              return here.filter((x) => x.food.group === c.food.group).length < capG
            })
            /*
             * 상을 갖추자고 하루 열량을 넘기면 안 된다.
             *
             * 처음에는 남은 여유와 무관하게 160 kcal 까지 받았더니,
             * 목표 상단이 1,260 kcal 인 분의 하루가 1,634 까지 올라갔다.
             * 곁들이는 나물·국이 대개 100 kcal 아래이므로,
             * 남은 여유 안에서만 고르게 해도 대개 찾아진다.
             */
            /*
             * 남은 여유를 크게 넘기지 않는다.
             * 목표가 작은 분(하루 1,140 kcal)에게는 60 kcal 도 여유가 없을 때가 있어,
             * 곁들임 하나로 하루가 1,388 까지 올라갔다. 여유가 없으면 그냥 두는 편이 낫다 —
             * 상을 갖추자고 목표를 넘기는 것은 앞뒤가 바뀐 일이다.
             */
            .filter((c) => c.kcal <= Math.min(160, Math.max(0, room.kcal)) &&
                           c.na <= Math.max(200, room.na * 0.4))
          if (fits.length === 0) continue
          /* 엇비슷하면 날마다 다르게 — 같은 자리에 늘 같은 나물이 오르지 않게 */
          const ranked = fits.sort((a, b) => (b.bonus - b.penalty) - (a.bonus - a.penalty))
          const near = ranked.filter((x) => (x.bonus - x.penalty) >= (ranked[0].bonus - ranked[0].penalty) - 12)
          picked = near[((dayIndex % near.length) + near.length) % near.length]
          break
        }
        /*
         * 자리가 없으면 바꿔 놓는다.
         *
         * 더할 여유가 없다고 그냥 두면 "쌀밥 + 대두(삶은 것) + 석류" 가 그대로 나간다.
         * 밥상을 세우지 못하는 곁들임 하나를 빼고 그 열량만큼의 반찬을 놓으면
         * 하루 합계는 그대로이면서 상은 갖춰진다.
         */
        if (!picked) {
          const drop = here.find((e) => !isAnchorDish(e.food) && mealRole(e.food) !== 'staple')
          if (!drop) continue
          const freed = foodContribution(drop.food, drop.servings)
          const swap = candidates
            .filter((c) => !used.has(c.food.id))
            .filter((c) => isAnchorDish(c.food))
            .filter((c) => slotsFor(c.food).includes(slot))
            .filter((c) => !sideClash(meals, slot, c.food, drop))
            .filter((c) => c.kcal <= (freed.kcal ?? 0) + Math.max(0, room.kcal) + 60)
            .filter((c) => c.na <= (freed.na ?? 0) + Math.max(150, room.na))
            .sort((a, b) => (b.bonus - b.penalty) - (a.bonus - a.penalty))[0]
          if (!swap) continue
          here.splice(here.indexOf(drop), 1)
          foodTotals = addTotals(foodTotals, negate(freed))
          used.add(swap.food.id)
          foodTotals = addTotals(foodTotals, foodContribution(swap.food, 1))
          const h2 = swap.prefers[0]
          here.push({
            food: swap.food, servings: 1, origin: 'added',
            contribution: '밥상을 세우려고 곁들임 하나를 반찬으로 바꿨습니다',
            ruleTitle: h2?.rule.title ?? '밥만으로는 한 끼가 되지 않아 반찬으로 바꿨습니다.',
            evidence: h2?.rule.evidence, refIds: h2?.rule.refIds ?? [],
            seasonal: swap.seasonal
          })
          continue
        }
  
        used.add(picked.food.id)
        groupCount.set(picked.food.group, (groupCount.get(picked.food.group) ?? 0) + 1)
      /* 합계에도 더한다 — 이걸 빠뜨려 화면의 합계와 끼니별 소계가 어긋났다 */
      foodTotals = addTotals(foodTotals, foodContribution(picked.food, 1))
      const hit = picked.prefers[0]
      here.push({
        food: picked.food,
        servings: 1,
        origin: 'added',
        contribution: '상을 갖추려고 곁들였습니다',
        ruleTitle: hit?.rule.title ?? '밥만으로는 한 끼가 되지 않아 곁들였습니다.',
        evidence: hit?.rule.evidence,
        refIds: hit?.rule.refIds ?? [],
        seasonal: picked.seasonal
      })
    }
  }

  /*
   * 4-2-3) 잦은 소량으로 드셔야 하는 분의 간식을 채운다.
   *
   * 위를 잘라 내셨거나 입맛이 없는 분께는 하루를 넷으로 고르게 나누는 것이 목표라
   * 간식 몫을 22 % 로 잡아 두었다. 그런데 하루 열량이 이미 찬 날에는
   * 간식에 무엇을 더 얹을 수가 없어 5 % 에서 끝나곤 했다.
   *
   * 더 얹을 수 없으면 옮기면 된다. 끼니에 놓인 것 중 간식으로도 갈 수 있는 것
   * — 과일·유제품·견과·영양음료 — 을 가장 무거운 끼니에서 내린다.
   * 하루 총량은 그대로이고 나뉘는 모양만 달라진다.
   */
  {
    const graze = shares['간식'] >= 0.2
    const load = (slot: MealSlot) =>
      meals[slot].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)

    for (let pass = 0; graze && pass < 3 && load('간식') < quota['간식'] * 0.6; pass++) {
      if (meals['간식'].length >= cap) break
      /* 가장 무거운 끼니부터 — 거기서 덜어 내는 것이 균형에도 맞는다 */
      const from = MAIN_SLOTS
        .filter((s) => meals[s].length > 1)
        .sort((a, b) => load(b) - load(a))[0]
      if (!from) break

      const movable = meals[from].filter((e) => {
        if (!slotsFor(e.food).includes('간식')) return false
        if (meals['간식'].some((x) => x.food.id === e.food.id)) return false
        const capG = SLOT_GROUP_CAP[e.food.group] ?? SLOT_GROUP_CAP_DEFAULT
        if (meals['간식'].filter((x) => x.food.group === e.food.group).length >= capG) return false
        /* 끼니의 짜임새를 무너뜨리면서까지 옮기지는 않는다 */
        const rest = meals[from].filter((x) => x !== e).map((x) => x.food)
        return mealIsComplete(rest)
      })
      if (movable.length === 0) break

      /* 옮겼을 때 간식이 제 몫에 가장 가까워지는 것 */
      const want = quota['간식'] - load('간식')
      const best = movable.reduce((a, b) => {
        const ka = foodContribution(a.food, a.servings).kcal ?? 0
        const kb = foodContribution(b.food, b.servings).kcal ?? 0
        return Math.abs(want - kb) < Math.abs(want - ka) ? b : a
      })
      meals[from].splice(meals[from].indexOf(best), 1)
      meals['간식'].push(best)
    }
  }

  /*
   * 4-3) 끼니 사이 옮겨 담기.
   *
   * 한 가지씩 '제 몫에 가장 모자란 끼니' 에 넣다 보면, 다 짜고 난 뒤에는
   * 어긋나 있는 경우가 생긴다. 갈 수 있는 자리가 하나뿐인 것들 때문이다 —
   * 영양음료·단백질분말·균형영양식은 간식에만 갈 수 있고, 우유는 아침 아니면 간식이다.
   * 간식이 차면 그것들이 아침으로 밀려나, 가벼워야 할 아침이 저녁보다 무거워진다.
   * 실제로 아침 540 kcal 에 저녁 383 kcal 인 날이 나왔다.
   *
   * 그래서 마지막에 한 번 옮겨 담는다. 넘치는 끼니에서 모자란 끼니로,
   * 옮겨도 그 끼니의 식품군 상한을 넘지 않는 것만 고른다.
   */
  {
    const load = (slot: MealSlot) =>
      meals[slot].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)

    for (let pass = 0; pass < 6; pass++) {
      /*
       * 어느 끼니가 굶고 있으면 '넘침' 의 기준을 낮춘다.
       *
       * 예전에는 제 몫의 1.15배를 넘는 끼니가 있어야만 옮겨 담았다.
       * 그런데 아침 101 · 점심 603 · 저녁 642 인 날이 있었다 —
       * 저녁 몫이 589 이라 1.15배(677)에 닿지 않으니, 옮길 곳을 찾지 못하고
       * 그대로 끝났다. 아침에 포도 한 송이만 놓인 채로.
       *
       * 한쪽이 제 몫의 절반도 못 채우고 있으면, 다른 쪽이 '조금 많은' 정도라도
       * 나눠 주는 것이 맞다. 주는 쪽이 제 몫 아래로 내려가지만 않으면 된다.
       */
      /*
       * 어느 끼니가 굶고 있으면 '넘침' 의 기준을 낮춘다.
       *
       * 예전에는 제 몫의 1.15배를 넘는 끼니가 있어야만 옮겨 담았다.
       * 그런데 아침 101 · 점심 603 · 저녁 642 인 날이 있었다 —
       * 저녁 몫이 589 이라 1.15배(677)에 닿지 않으니 옮길 곳을 찾지 못하고
       * 아침에 포도 한 송이만 놓인 채로 끝났다.
       *
       * 한쪽이 제 몫의 절반도 못 채우고 있으면, 다른 쪽이 '조금 많은' 정도라도
       * 나눠 주는 것이 맞다. 주는 쪽이 제 몫 아래로 내려가지만 않으면 된다.
       */
      const starving = (['아침', '점심', '저녁'] as MealSlot[]).some((s) => load(s) < quota[s] * 0.45)
      /*
       * 잦은 소량으로 드셔야 하는 분은 한 끼가 커지는 것 자체가 문제다.
       * 위를 잘라 내신 분께 저녁 660 kcal 은 한 번에 드시기 어려운 양이다.
       * 그분들께는 '넘침' 의 기준을 낮춰 더 부지런히 나눈다.
       */
      const graze = shares['간식'] >= 0.2
      const overLine = starving ? 0.95 : graze ? 1.05 : 1.15
      const overs = MEAL_SLOTS.filter((s) => load(s) > quota[s] * overLine)
        .sort((a, b) => load(b) - quota[b] - (load(a) - quota[a]))
      if (overs.length === 0) break

      /*
       * 가장 많이 넘친 끼니 하나만 보고 포기하지 않는다.
       *
       * 예전에는 첫 후보에서 막히면 그대로 끝냈다. 위의 그 날이 그랬다 —
       * 점심에서 흑임자죽을 빼면 점심이 163 kcal 로 무너지니 옮길 수 없었고,
       * 거기서 멈춰 버려 저녁의 두부부침은 쳐다보지도 않았다.
       * 한 곳이 안 되면 다음 곳을 본다.
       */
      let moved = false
      for (const over of overs) {
        const under = MEAL_SLOTS.filter((s) => s !== over && load(s) < quota[s] * 0.9)
          .sort((a, b) => quota[b] - load(b) - (quota[a] - load(a)))[0]
        if (!under) continue

        // 끼니를 비우면서까지 옮기지 않는다
        if (over !== '간식' && meals[over].length <= 1) continue
        const movable = meals[over]
          .map((e, i) => ({ e, i, kcal: foodContribution(e.food, e.servings).kcal ?? 0 }))
          .filter(({ e }) => {
            if (!slotsFor(e.food).includes(under)) return false
            // 옮길 곳에 같은 음식이 이미 있으면 안 된다 — 한 끼니에 배가 두 개 놓인다
            if (meals[under].some((x) => x.food.id === e.food.id)) return false
            if (stapleClash(meals, under, e.food) || sideClash(meals, under, e.food)) return false
            const capG = SLOT_GROUP_CAP[e.food.group] ?? SLOT_GROUP_CAP_DEFAULT
            return meals[under].filter((x) => x.food.group === e.food.group).length < capG
          })
          // 옮겨서 주는 쪽이 무너지면 그것도 뺀다
          .filter(({ kcal }) => load(over) - kcal >= quota[over] * 0.6)
        if (movable.length === 0) continue

        const gapOver = load(over) - quota[over]
        const gapUnder = quota[under] - load(under)
        const best = movable.reduce((a, b) =>
          Math.abs(Math.min(gapOver, gapUnder) - b.kcal) < Math.abs(Math.min(gapOver, gapUnder) - a.kcal) ? b : a
        )

        meals[over].splice(meals[over].indexOf(best.e), 1)
        meals[under].push(best.e)
        moved = true
        break
      }
      if (!moved) break
    }

    /*
     * 몫으로 견주는 것만으로는 부족하다.
     * 아침이 몫을 조금 넘고 저녁이 크게 모자란 경우, 위 규칙은 '넘침' 으로 보지 않는다
     * (아침 429 · 몫 398 · 저녁 294 처럼). 그래도 아침이 저녁보다 무거운 것은 그대로다.
     * 지켜야 할 것은 그 순서 자체이므로 마지막으로 한 번 더 본다.
     */
    /*
     * 잦은 소량 식사(식욕부진·체중감소·위절제후)에서도 이 순서는 지킨다.
     *
     * 처음에는 여기를 건너뛰었다. 그분들은 넷을 고르게 나누는 것이 목적이니
     * 저녁을 무겁게 만들 이유가 없다고 본 것이다. 그런데 고르게 나눈다는 것과
     * 아침이 저녁보다 무거워도 좋다는 것은 다른 말이다.
     * 실제로 아침에 흑임자죽 440 kcal, 저녁에 닭백숙 390 kcal 이 놓인 날이 나왔다 —
     * 둘을 맞바꾸기만 하면 되는 것을, 이 갈래 때문에 그냥 두고 있었다.
     * 몫이 25 : 27 로 거의 같으니 뒤집힌 날에만 손이 가고, 갈 때마다 나아진다.
     */
    {
      for (let pass = 0; pass < 5 && load('아침') > load('저녁'); pass++) {
        /*
         * 끼니를 비워 가며 균형을 맞추지는 않는다. 빈 아침은 균형이 아니라 결식이다.
         * 그래서 아침에 하나만 남았으면 '옮기기' 는 하지 않는다 —
         * 다만 '맞바꾸기' 는 가짓수를 그대로 두므로 아래에서 그대로 시도한다.
         * 예전에는 여기서 바로 멈춰 버려, 아침이 한 접시뿐인 마른 환자의 날이
         * 뒤집힌 채로 남아 있었다(34 kg · 아침 192 · 저녁 165).
         */
        const canMove = meals['아침'].length > 1
        const movable = (canMove ? meals['아침'] : []).filter((e) => {
          if (!slotsFor(e.food).includes('저녁')) return false
          if (meals['저녁'].some((x) => x.food.id === e.food.id)) return false
          if (stapleClash(meals, '저녁', e.food) || sideClash(meals, '저녁', e.food)) return false
          const capG = SLOT_GROUP_CAP[e.food.group] ?? SLOT_GROUP_CAP_DEFAULT
          if (meals['저녁'].filter((x) => x.food.group === e.food.group).length >= capG) return false
          /*
           * 옮긴 뒤 저녁이 제 몫을 크게 넘지만 않으면 된다.
           * 처음에는 '저녁이 아침보다 무거워지지 않게' 라고 적었는데, 그건 거꾸로다 —
           * 저녁이 가장 무거운 것이 바로 원하는 결과다. 그 조건 때문에 옮길 것이
           * 하나도 없어 이 단계가 아무 일도 하지 않고 있었다.
           */
          const k = foodContribution(e.food, e.servings).kcal ?? 0
          return load('저녁') + k <= quota['저녁'] * 1.35
        })
        if (movable.length === 0) {
          /*
           * 옮길 데가 없는 날이 남는다. 저녁이 이미 제 몫에 가까워 무엇을 더 얹어도
           * 넘치거나, 아침에 남은 것이 아침 전용이라 저녁에 못 가는 경우다.
           * 그럴 때는 옮기는 대신 맞바꾼다 — 아침의 무거운 것과 저녁의 가벼운 것을
           * 자리만 바꾸면 두 끼니의 가짓수도 식품군 상한도 그대로다.
           */
          /*
           * 저녁으로 못 가는 것이 아침에 남아 있는 날이 있다.
           * 우유는 아침 아니면 간식이고, 과일도 갈 곳이 정해져 있다.
           * 아침 418(녹두죽 288 + 우유 130) · 저녁 390 인 날이 그랬다 —
           * 우유만 간식으로 내리면 끝나는데, 저녁만 쳐다보느라 손을 못 대고 있었다.
           * 그래서 저녁이 막히면 점심·간식도 받아 준다. 순서를 지키는 것이 목적이지
           * 저녁으로 보내는 것이 목적이 아니다.
           */
          const sideways = canMove ? moveBreakfastElsewhere(meals, load, quota) : null
          if (sideways) {
            const [i, to] = sideways
            const [e] = meals['아침'].splice(i, 1)
            meals[to].push(e)
            continue
          }
          const swap = swapToLightenBreakfast(meals, load)
          if (!swap) break
          const [bi, di] = swap
          const b = meals['아침'][bi]
          const d = meals['저녁'][di]
          meals['아침'][bi] = d
          meals['저녁'][di] = b
          continue
        }
        // 가장 큰 것을 옮겨야 한 번에 뒤집힌다
        const move = movable.reduce((a, b) =>
          (foodContribution(b.food, b.servings).kcal ?? 0) > (foodContribution(a.food, a.servings).kcal ?? 0) ? b : a
        )
        meals['아침'].splice(meals['아침'].indexOf(move), 1)
        meals['저녁'].push(move)
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

  /*
   * 5-마지막) 상을 한 번 더 본다.
   *
   * 짜임새는 4-2-2 에서 맞추는데, 그 뒤의 옮겨 담기와 간식 채우기가
   * 상을 도로 흐트러뜨린다. 반찬을 간식으로 옮겨 놓고 밥만 남기는 식이다.
   * 그래서 다 끝난 자리에서 한 번 더 본다 — 여기서는 더하지 않고 바꾸기만 한다.
   * 열량은 이미 맞춰졌으므로, 곁들임 하나를 그만한 반찬으로 갈아 놓으면 된다.
   */
  /*
   * 열어 주는 폭은 하루에 한 번만 센다.
   *
   * 끼니마다 8 % 씩 열었더니 세 끼가 합쳐져 목표 1,170 kcal 인 분의 하루가
   * 1,493 까지 올라갔다. 한 끼에 조금씩 봐준 것이 하루에서는 조금이 아니었다.
   */
  const kcalCeiling = target.kcal[1] + Math.min(120, target.kcal[1] * 0.08)
  const naCeiling = naLimit + Math.min(250, naLimit * 0.1)

  for (const slot of ['아침', '점심', '저녁'] as MealSlot[]) {
    const here = meals[slot]
    if (here.length === 0) continue
    if (mealIsComplete(here.map((e) => e.food))) continue

    /*
     * 바꿀 곁들임조차 없는 경우 — 밥 한 공기만 놓인 상.
     *
     * 사용자가 가장 먼저 말씀하신 모습이 이것이다. 바꿀 것이 없으니
     * 여기서는 더하는 수밖에 없다. 하루 상한 안에서 가벼운 반찬 하나를 놓는다.
     */
    const drop = here.find((e) => !isAnchorDish(e.food) && mealRole(e.food) !== 'staple')
    const freed = drop
      ? foodContribution(drop.food, drop.servings)
      : ({ kcal: 0, protein: 0, fiber: 0, na: 0 } as NutrientTotals)
    const swap = candidates
      .filter((c) => !used.has(c.food.id))
      .filter((c) => isAnchorDish(c.food))
      /* 신장이 걸리는 분께는 바꿔 넣는 것도 단백질을 늘리지 않아야 한다 */
      .filter((c) => !renalCap || c.protein <= (freed.protein ?? 0) +
        Math.max(4, target.protein[1] - (running().protein ?? 0)))
      .filter((c) => slotsFor(c.food).includes(slot))
      .filter((c) => !sideClash(meals, slot, c.food, drop))
      /*
       * 바꿔 놓는다고 하루가 넘치면 안 된다.
       *
       * 처음에는 뺀 만큼 + 80 kcal 까지 받았더니, 세 끼에서 조금씩 밀려
       * 목표 1,170 kcal 인 분의 하루가 1,461 까지 올라갔다.
       * 남은 여유 안에서만 바꾼다 — 상을 갖추자고 목표를 넘기는 것은 앞뒤가 바뀐 일이다.
       */
      /*
       * 밥상을 세우는 데는 조금 열어 준다.
       *
       * 남은 여유 안에서만 바꾸게 했더니, 하루 열량이 이미 찬 날에는
       * "잡곡밥 + 수박" 이 그대로 남았다. 밥 한 공기에 수박 한 조각은 상이 아니다.
       * 목표를 지키는 것과 상을 세우는 것이 부딪히는 자리인데,
       * 60 kcal 넘는 것보다 밥만 놓인 것이 더 나쁘다고 본다.
       * 다만 열어 주는 폭은 하루 목표의 8 % 까지로 못 박는다.
       */
      /*
       * 바꾼 뒤의 '하루 합계' 로 본다.
       *
       * 끼니마다 여유를 따로 세었더니 셋이 합쳐져 목표를 21 % 넘겼다.
       * 한 끼씩 보아서는 하루가 얼마나 되는지 알 수 없다 — 하루로 본다.
       */
      .filter((c) => (running().kcal ?? 0) - (freed.kcal ?? 0) + c.kcal <= kcalCeiling)
      .filter((c) => (running().na ?? 0) - (freed.na ?? 0) + c.na <= naCeiling)
      .sort((a, b) => (b.bonus - b.penalty) - (a.bonus - a.penalty))[0]
    if (!swap) continue

    if (drop) {
      here.splice(here.indexOf(drop), 1)
      foodTotals = addTotals(foodTotals, negate(freed))
    }
    used.add(swap.food.id)
    foodTotals = addTotals(foodTotals, foodContribution(swap.food, 1))
    const h = swap.prefers[0]
    here.push({
      food: swap.food, servings: 1, origin: 'added',
      contribution: drop
        ? '밥상을 세우려고 곁들임 하나를 반찬으로 바꿨습니다'
        : '밥만으로는 한 끼가 되지 않아 반찬을 곁들였습니다',
      ruleTitle: h?.rule.title ?? '밥만으로는 한 끼가 되지 않아 반찬을 놓았습니다.',
      evidence: h?.rule.evidence, refIds: h?.rule.refIds ?? [],
      seasonal: swap.seasonal
    })
  }

  const totals = tidy(running())

  // 6) 요약
  /*
   * 값이 빠진 것을 밝힐 때는 '상에 오른 전부' 를 봐야 한다.
   *
   * 여기서 담으신 것(chosen)만 보고 있었다. 그런데 합계에는 앱이 추천한 것도
   * 함께 들어간다. 그러니 앱이 골라 온 음식에 나트륨 값이 없으면,
   * 합계는 실제보다 적게 나오면서 "상한 안에 들어옵니다" 라고 말하게 된다.
   * 사용자가 직접 담은 것만 정직하게 밝히고 앱이 고른 것은 숨기는 셈이었다.
   */
  const onPlate: SelectedItem[] = []
  for (const slot of MEAL_SLOTS)
    for (const e of meals[slot]) onPlate.push({ foodId: e.food.id, servings: e.servings, meal: slot })

  notes.push(...dayNotes(totals, suppTotals, patient, naUnknownNames(onPlate), microUnknownNames(onPlate, patient)))

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

/**
 * 식단을 짤 때 이 환자에게만 달리 적용한 것들.
 *
 * 열량·단백질 목표가 왜 그 값인지는 targetNotes 가 답하고,
 * 여기서는 '어떻게 짰는지' 를 답한다 — 섬유를 왜 낮게 잡았는지,
 * 왜 저녁이 크지 않은지 같은 것이다.
 * 화면 맨 위에 함께 적어, 앱이 조용히 다르게 굴지 않도록 한다.
 */
export function planNotes(patient: PatientContext): { label: string; reason: string }[] {
  const out: { label: string; reason: string }[] = []
  const profile = CANCER_BY_ID[patient.cancer]

  const fiber = fiberGoal(patient, profile)
  if (fiber.lowResidue) {
    out.push({
      label: `식이섬유 목표를 ${fiber.range[0]}~${fiber.range[1]} g 으로 낮췄습니다`,
      reason:
        '설사나 장루가 있는 동안에는 잔사를 줄이는 것이 목표입니다. ' +
        '거친 나물·통곡·생채소를 늘리는 시기가 아닙니다. 증상이 가라앉으면 원래 목표로 돌아갑니다.'
    })
  }

  const shares = mealShares(patient)
  if (shares['간식'] >= 0.2) {
    out.push({
      label: '한 끼를 크게 만들지 않고 나눠 담았습니다',
      reason:
        '한 번에 많이 드시기 어려운 상태입니다. 저녁을 크게 잡으면 그 끼니를 통째로 남기시게 되므로, ' +
        '네 끼니를 고르게 하고 간식 몫을 키웠습니다.'
    })
  }

  const cuisines = patient.cuisines ?? []
  const extra = cuisines.filter((c) => c !== '한식')
  if (extra.length > 0) {
    out.push({
      label: `${extra.join('·')}도 함께 봅니다`,
      reason: '제철 한식을 바탕으로 하고, 고르신 계통을 더해 후보를 넓혔습니다.'
    })
  }

  return out
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
/**
 * 아침의 무거운 것과 저녁의 가벼운 것을 맞바꿀 짝을 찾는다.
 *
 * 옮기기(한쪽에서 빼서 다른 쪽에 넣기)로는 풀리지 않는 날 —
 * 저녁이 이미 제 몫 가까이 차 있어 무엇을 더 얹을 수 없는 날 — 을 위한 것이다.
 * 자리만 바꾸므로 두 끼니의 가짓수는 그대로고, 서로의 식품군 상한만 확인하면 된다.
 * 바꾼 뒤 아침이 저녁보다 가벼워지는 짝 중 차이가 가장 크게 줄어드는 것을 고른다.
 */
/**
 * 아침에서 점심이나 간식으로 한 접시를 내린다.
 *
 * 저녁으로 옮기지도, 저녁의 무엇과 맞바꾸지도 못하는 날을 위한 마지막 길이다.
 * 옮긴 뒤에 아침이 저녁보다 가벼워지는 것 중에서, 받는 끼니가 제 몫을 덜 넘는 쪽을 고른다.
 */
/**
 * 옮겨 놓았을 때 그 끼니에 주식이 겹치는가.
 *
 * 자리를 옮기는 단계들이 placeIn 을 거치지 않아, 밥이 이미 있는 끼니로
 * 또 밥이 건너가는 일이 있었다. 옮기는 곳마다 같은 것을 묻는다.
 */
function stapleClash(meals: Record<MealSlot, MenuEntry[]>, to: MealSlot, food: Food, replacing?: MenuEntry): boolean {
  const r = mealRole(food)
  if (r !== 'staple' && r !== 'onedish') return false
  return meals[to].some((e) => {
    if (e === replacing) return false
    const er = mealRole(e.food)
    return er === 'staple' || er === 'onedish'
  })
}

/*
 * 곁들임이 몰리지 않게 한다.
 *
 * 삶은 콩·삶은 옥수수·찐 감자·군고구마는 밥상에 놓을 수는 있어도
 * 그것만 여럿 늘어놓으면 상이 아니라 무언가를 쌓아 둔 것이 된다.
 * 실제로 "두부부침 + 옥수수(삶은 것) + 팥(삶은 것) + 배 + 두부(부침용)" 같은 저녁이 나왔다.
 * 한 끼에 곁들임은 하나까지만 둔다.
 *
 * 그리고 이름이 겹치는 것도 막는다 — '두부(부침용)' 과 '두부부침' 은
 * 식품군이 달라 기존 상한에 걸리지 않지만 상에서는 같은 것이다.
 */
function isGarnish(f: Food): boolean {
  const r = mealRole(f)
  return (r === 'side' || r === 'main') && !isAnchorDish(f)
}

/** 이름의 알맹이 — 괄호와 조리 표현을 걷어낸 앞부분 */
function coreName(name: string): string {
  return name.replace(/\(.*?\)/g, '').replace(/구이|부침|조림|볶음|찜|무침|나물|전$/g, '').trim()
}

/*
 * 합계에서 빼기.
 *
 * 처음에는 열량·단백질·식이섬유·나트륨 네 가지만 빼도록 적었다.
 * 그랬더니 칼슘·칼륨·인이 그대로 남아, 화면의 하루 합계가 끼니별 소계와 어긋났다
 * (칼륨 2,371 대 1,971). 빼는 것은 더한 것과 같은 모양이어야 한다.
 */
function negate(t: NutrientTotals): NutrientTotals {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(t)) if (typeof v === 'number') out[k] = -v
  return out as NutrientTotals
}

/*
 * 더하고 뺀 자리에 남는 부스러기를 턴다.
 *
 * 0 이어야 할 당류가 -3.55e-15 로 남아 '합계 이상값' 으로 잡혔다.
 * 사람에게 보일 값이 음수인 것과 0 인 것은 다르고, 화면에서는 둘 다 '0 g' 로 보이지만
 * 검사는 음수를 보고 무언가 잘못되었다고 말한다. 그 말이 맞다 — 여기서 턴다.
 */
function tidy(t: NutrientTotals): NutrientTotals {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(t)) {
    if (typeof v !== 'number') continue
    out[k] = Math.abs(v) < 1e-9 ? 0 : v
  }
  return out as NutrientTotals
}

function sideClash(meals: Record<MealSlot, MenuEntry[]>, to: MealSlot, food: Food, replacing?: MenuEntry): boolean {
  const here = meals[to].filter((e) => e !== replacing)
  if (isGarnish(food) && here.some((e) => isGarnish(e.food))) return true
  const core = coreName(food.name)
  if (core.length >= 2 && here.some((e) => coreName(e.food.name) === core)) return true
  return false
}

function moveBreakfastElsewhere(
  meals: Record<MealSlot, MenuEntry[]>,
  load: (slot: MealSlot) => number,
  quota: Record<MealSlot, number>
): [number, MealSlot] | null {
  const dinner = load('저녁')
  let best: { pick: [number, MealSlot]; over: number } | null = null

  for (let i = 0; i < meals['아침'].length; i++) {
    const e = meals['아침'][i]
    const k = foodContribution(e.food, e.servings).kcal ?? 0
    if (load('아침') - k > dinner) continue // 하나로 순서가 뒤집히지 않으면 뜻이 없다
    for (const to of ['간식', '점심'] as MealSlot[]) {
      if (!slotsFor(e.food).includes(to)) continue
      if (meals[to].some((x) => x.food.id === e.food.id)) continue
      if (stapleClash(meals, to, e.food) || sideClash(meals, to, e.food)) continue
      const capG = SLOT_GROUP_CAP[e.food.group] ?? SLOT_GROUP_CAP_DEFAULT
      if (meals[to].filter((x) => x.food.group === e.food.group).length >= capG) continue
      if (load(to) + k > quota[to] * 1.8) continue
      const over = (load(to) + k) / Math.max(1, quota[to])
      if (!best || over < best.over) best = { pick: [i, to], over }
    }
  }
  return best ? best.pick : null
}

function swapToLightenBreakfast(
  meals: Record<MealSlot, MenuEntry[]>,
  load: (slot: MealSlot) => number
): [number, number] | null {
  const kcal = (e: MenuEntry) => foodContribution(e.food, e.servings).kcal ?? 0
  const fits = (e: MenuEntry, to: MealSlot, replacing: MenuEntry) => {
    if (!slotsFor(e.food).includes(to)) return false
    if (meals[to].some((x) => x !== replacing && x.food.id === e.food.id)) return false
    if (stapleClash(meals, to, e.food, replacing) || sideClash(meals, to, e.food, replacing)) return false
    const capG = SLOT_GROUP_CAP[e.food.group] ?? SLOT_GROUP_CAP_DEFAULT
    const already = meals[to].filter((x) => x !== replacing && x.food.group === e.food.group).length
    return already < capG
  }

  let best: { pair: [number, number]; gap: number } | null = null
  const gapNow = load('아침') - load('저녁')
  for (let bi = 0; bi < meals['아침'].length; bi++) {
    for (let di = 0; di < meals['저녁'].length; di++) {
      const b = meals['아침'][bi]
      const d = meals['저녁'][di]
      const diff = kcal(b) - kcal(d)
      if (diff <= 0) continue // 가벼운 것을 아침으로 들여올 때만 뜻이 있다
      if (!fits(b, '저녁', d) || !fits(d, '아침', b)) continue
      const gap = gapNow - diff * 2
      if (gap >= 0) continue // 바꿔도 아침이 여전히 무거우면 헛일이다
      if (!best || gap > best.gap) best = { pair: [bi, di], gap }
    }
  }
  return best ? best.pair : null
}

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
  '간식·디저트': 1
  /*
   * 경장영양(균형영양식)은 여기 넣지 않는다.
   *
   * 한 끼에 두 캔이 오르는 것이 보기 좋지는 않다. 그래서 하나로 묶어 두었는데,
   * 목표가 높고 드실 수 있는 음식이 적은 분(두경부암에 연하곤란이 겹친 경우)에게는
   * 그 제한이 그대로 열량 미달이 됐다. 여러 날에 걸쳐 보니 그런 날이 5 % 가까이 됐다.
   *
   * 이런 분께 열량을 채우는 임상적 답이 바로 경구영양보충이다.
   * 모자랄 때는 한 자리를 더 열어 준다 — 아래 기본값(2)을 따른다.
   */
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

  /*
   * 한 끼에 주식은 하나다.
   *
   * 곡류·전분은 밥도 감자도 빵도 함께 들어 있어서 식품군만으로는 막히지 않았다.
   * 그 바람에 아침에 보리밥과 흑미밥이 나란히 오르는 날이 나왔다.
   * 밥 두 공기는 한 끼가 아니라 두 끼다.
   */
  const role = mealRole(food)
  const stapleTaken = (s: MealSlot) =>
    (role === 'staple' || role === 'onedish') &&
    meals[s].some((e) => {
      const r = mealRole(e.food)
      return r === 'staple' || r === 'onedish'
    })

  const loadOf = (s: MealSlot) =>
    meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
  const kcalOf = (foodContribution(food, 1).kcal ?? 0)

  const pool = slotsFor(food).filter((s) => {
    if (sameGroup(s) >= groupCap) return false
    if (stapleTaken(s)) return false
    /*
     * 곁들임이 몰리거나 같은 것이 두 번 오르지 않게 한다.
     * 옮기고 바꾸는 자리에만 걸어 두었더니 처음 놓을 때는 그대로 통과해,
     * "두부부침 + 옥수수(삶은 것) + 팥(삶은 것) + 배 + 두부(부침용)" 같은 저녁이 나왔다.
     */
    if (sideClash(meals, s, food)) return false
    if (s !== '간식') return true
    /*
     * 간식에는 가짓수만이 아니라 열량으로도 뚜껑을 덮는다.
     *
     * 예전에는 가짓수만 세었다. 그래서 300 kcal 짜리 균형영양식 두 팩이
     * '두 가지' 로만 잡혀 간식이 하루의 60 % 를 차지했다.
     * 간식은 끼니 사이를 메우는 것이지 하루를 지고 가는 자리가 아니다.
     */
    return meals['간식'].length < cap && loadOf('간식') + kcalOf <= quota['간식'] * 1.6
  })
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
  /**
   * 이 환자에게만 세는 미량영양소의 1회 제공량 기여.
   *
   * 세는 항목이 없으면 빈 객체다. 신기능이 떨어진 분의 칼륨·인,
   * 골밀도가 떨어지는 치료를 받는 분의 칼슘, 위를 잘라 낸 분의 철.
   */
  micro: Partial<Record<NutrientKey, number>>
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
/**
 * 지금 이 시점에서 미량영양소가 얼마나 모자라고 얼마나 남았는지.
 *
 * need 는 채워야 남은 양(칼슘·철), room 은 아직 쓸 수 있는 양(칼륨·인).
 * 상한이 없으면 room 은 Infinity 라 벌점이 붙지 않는다.
 */
function microBudget(
  micros: MicroTarget[],
  cur: NutrientTotals
): { key: NutrientKey; need: number; room: number }[] {
  return micros.map((m) => {
    const got = cur[m.key] ?? 0
    return {
      key: m.key,
      need: m.min !== undefined ? Math.max(0, m.min - got) : 0,
      room: m.max !== undefined ? m.max - got : Infinity
    }
  })
}

function collectCandidates(
  patient: PatientContext,
  cached: { rules: RuleHit[]; interactions: InteractionHit[] },
  cuisines: Cuisine[],
  season: Season,
  /** 경구영양보충을 후보에 넣을지 — 보충 단계에서는 열량 미달 자체가 적응증이다 */
  forceONS = false
): Cand[] {
  /* 이분에게 세는 미량영양소 — 없으면 아래 루프가 빈 객체만 만든다 */
  const micros = microTargets(patient)

  /*
   * 부드러운 식사가 필요하신가 — 죽을 앞세울지 밥을 앞세울지 가른다.
   * 급성기(방사선·항암 중)에는 증상이 없더라도 언제든 나빠질 수 있어 함께 본다.
   */
  /* 잦은 소량으로 드셔야 하는가 — 큰 접시를 덜 고르게 한다 */
  const grazing = patient.conditions.some(
    (c) => c === '식욕부진' || c === '체중감소' || c === '위절제후' || c === '오심·구토'
  )

  const needsSoft =
    patient.phase === 'during_rt' || patient.phase === 'during_chemo' ||
    patient.conditions.some((c) =>
      c === '연하곤란' || c === '구강점막염' || c === '오심·구토' ||
      c === '위절제후' || c === '식욕부진' || c === '설사')
  /*
   * 점착성(떡류)에 감점을 준다 — 연하곤란으로 진단되지 않은 분에게도.
   *
   * 진단명이 붙은 분은 규칙이 따로 막는다. 문제는 그 앞이다.
   * 항암·방사선치료 중 구강건조와 점막염만으로도 삼키기가 나빠지고,
   * 본인은 그것을 '연하곤란' 이라고 부르지 않는다. 떡은 질식 사고의 첫손이라
   * 그런 분께 앱이 먼저 권할 음식은 아니다.
   *
   * 다만 금기가 아니라 순서의 문제이므로, 직접 고르시는 것은 그대로 두고
   * 감점만 준다. 실제로 이 값에서 떡이 상위 2·4위에서 밀려났다.
   */
  const PENALTY: Partial<Record<string, number>> = {
    적색육: 12, 직화구이: 8, 초가공식품: 12, 튀김: 10, 가공육: 30,
    고지방: 5, 포화지방높음: 5, 고나트륨: 8, 고당: 6, 염장: 20,
    거친질감: 3, 점착성: 14
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
    effectiveLossPct(patient) >= 5 || bmi < 18.5 ||
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
    /*
     * 상에 오르는 것만 후보로 둔다.
     *
     * 예전에는 자료의 form: 'ingredient' 를 그대로 '추천하면 안 되는 것' 으로 썼다.
     * 그런데 그 둘은 다른 이야기였다 — 쌀밥도 김치도 두부도 김도 자료에서는
     * 재료로 적혀 있다. 그래서 한식 식단이라면서 밥이 스무 날 동안 한 번도
     * 나오지 않았고 김치와 나물도 함께 빠졌다. 488종 중 148종이 그렇게 사라졌다.
     *
     * 과일에서 한 번, 조리된 생선·고기에서 또 한 번, 이번이 세 번째다.
     * 그때마다 예외를 덧붙여 왔는데 그 방식으로는 다음번에 또 놓친다.
     * 이제는 반대로 적는다 — 무엇이 재료인지를 한곳(isIngredientOnly)에 밝히고
     * 나머지는 상에 오른다고 본다.
     */
    if (isIngredientOnly(f)) continue

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

    /*
     * 죽은 아플 때 먹는 것이다.
     *
     * 죽 한 그릇은 단백질이 12 g 이라 밥 한 공기(5~7 g)보다 점수가 높다.
     * 그래서 치료를 마치고 잘 지내시는 분께도 아침에 녹두죽, 점심에 흑임자죽이
     * 매일 올라왔다 — 한식 식단이라면서 밥이 스무 날 동안 한 번도 나오지 않았다.
     *
     * 삼키기 어렵거나 입안이 헐었거나 속이 메스꺼운 분께는 죽이 맞다.
     * 그렇지 않은 분께는 밥이 맞다. 금기가 아니라 순서의 문제이므로 감점만 준다 —
     * 직접 고르시는 것은 그대로 두고, 다른 것이 없으면 여전히 나온다.
     */
    if (!needsSoft && f.group === '밥·면·죽 요리' && /죽$|미음/.test(f.name)) penalty += 22

    /*
     * 잦은 소량으로 드셔야 하는 분께는 큰 접시 자체를 덜 권한다.
     *
     * 위를 잘라 내셨거나 입맛이 없는 분께 닭백숙 한 그릇(390 kcal)이 저녁에 놓이면,
     * 거기에 밥이 더해져 한 끼가 하루의 40 % 를 넘는다. 다 짜고 나서 옮겨 담아
     * 고치려 했지만, 옮길 곳마다 이미 밥이 있어 갈 데가 없었다.
     * 나중에 나누는 것보다 처음부터 작은 것을 고르는 편이 낫다.
     * 같은 닭이라도 백숙 대신 닭가슴살 한 접시(165 kcal)면 충분하다.
     */
    if (grazing) {
      const per = (f.per100.kcal * f.serving.g) / 100
      if (per > 300) penalty += Math.min(30, (per - 300) / 12)
    }

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

    const micro: Partial<Record<NutrientKey, number>> = {}
    for (const m of micros) micro[m.key] = c[m.key] ?? 0

    out.push({ food: f, bonus, penalty, prefers, seasonal, kcal, protein, fiber, na: c.na ?? 0, micro, satiety })
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
  room: { kcal: number; na: number; protein: number; fiber: number },
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
  groupCap = GROUP_CAP,
  /**
   * 이분에게만 세는 미량영양소의 남은 몫.
   *
   * need = 채워야 남은 양(칼슘·철), room = 아직 쓸 수 있는 양(칼륨·인).
   * 해당 사항이 없으면 빈 배열이라 점수가 그대로다.
   */
  micro: { key: NutrientKey; need: number; room: number }[] = [],
  /**
   * 단백질에 뚜껑을 씌울지 — 신기능이 떨어진 분에게만 참이다.
   *
   * 모두에게 씌워 봤더니 열량 미달이 0.1 % 에서 0.9 % 로 늘었다.
   * 열량을 낼 만한 것이 대개 단백질도 함께 지고 오기 때문이다.
   * 그 맞바꿈은 하지 않는다 — 자세한 사정은 아래 걸러 내는 자리에 적어 두었다.
   */
  renalCap = false,
  /** '다시 구성' 을 누르셨는가 — 그때는 엇비슷한 후보를 넓게 본다 */
  retry = false
): Filler | undefined {

  const scored: { c: Cand; score: number }[] = []
  for (const c of all) {
    if (exclude.has(c.food.id)) continue
    if ((groupCount.get(c.food.group) ?? 0) >= groupCap) continue
    if (c.kcal > room.kcal) continue
    if (c.na > naCap) continue
    /*
     * 단백질에도 뚜껑을 씌운다.
     *
     * 값을 매기는 것만으로는 모자랐다. 벌점을 여덟 배로 올려도 하루 단백질이
     * 목표 상단의 1.2배에 머물렀다 — 한 접시가 지고 오는 단백질이 워낙 커서,
     * 열량을 채우려고 한 가지를 더 집을 때마다 20~50 g 씩 따라 들어온 탓이다.
     * 상한을 이미 채웠으면 단백질이 적은 것 중에서 고르게 한다.
     * 죽·과일·채소·미숫가루는 그대로 통과하므로 열량을 채울 길은 남아 있다.
     */
    /*
     * 단백질 뚜껑은 신장이 걸리는 분에게만 씌운다.
     *
     * 처음에는 모두에게 씌웠다. 그랬더니 단백질 과다가 48 % 에서 38 % 로 줄기는 했는데,
     * 열량 미달이 0.1 % 에서 0.9 % 로 늘었다. 열량을 낼 만한 것이 대개
     * 단백질도 함께 지고 오기 때문이다.
     *
     * 그 맞바꿈은 하면 안 된다. 여기서 '과다' 라고 부른 1.25배는 체중 1 kg 당
     * 1.9 g 쯤이고, ESPEN 은 2.0 g/kg 까지를 안전하다고 본다.
     * 반면 열량 부족은 암 환자에게 악액질로 이어지는 첫 단계다.
     * 안전한 것을 줄이자고 위험한 것을 늘릴 이유가 없다.
     *
     * 신기능이 떨어진 분은 다르다. 그분께는 단백질이 실제로 부담이므로
     * 그때만 뚜껑을 씌우고, 나머지 분께는 아래 protCost 로 값만 매긴다.
     */
    /*
     * 신장이 걸리는 분에게도 열량은 필요하다.
     *
     * 뚜껑만 꽉 조였더니 130 kg 이신 분(신기능저하·복수·설사·와파린)이
     * 2,670 kcal 목표에 2,123 에서 멈췄다. 단백질을 아끼자고 열량을 굶기면
     * 그것대로 위험하다. 크게 모자란 동안에는 조금 열어 둔다.
     */
    if (renalCap && c.protein > Math.max(6, room.protein + (need.kcal > 1200 ? 14 : 0))) continue
    /*
     * 저잔사 기간에는 섬유가 많은 것을 받지 않는다.
     * 남은 여유를 크게 넘기지만 않으면 되므로, 조금씩 여러 가지는 그대로 들어온다.
     */
    if (c.fiber > Math.max(1.0, room.fiber)) continue
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

    /*
     * 미량영양소를 점수에 반영한다.
     *
     * 여기까지 오기 전에는 앱이 "칼슘 1,000 mg 을 맞추세요" 라고 말해 놓고
     * 정작 추천에서는 칼슘을 한 번도 쳐다보지 않았다. 실제로 아로마타제 억제제를
     * 드시는 분의 하루가 817 mg 으로 끝나곤 했다.
     *
     * 계산을 아래 게이트보다 먼저 한다. 열량·단백질이 다 찬 뒤에는 fill 이 0 이라
     * 모든 후보가 그 자리에서 걸러졌고, 그래서 우유 한 잔(칼슘 226 mg)을 더할
     * 기회조차 없었다. 남은 것이 칼슘뿐일 때는 칼슘이 통과 사유가 되어야 한다.
     */
    let microFill = 0
    let microCost = 0
    for (const m of micro) {
      const got = c.micro[m.key] ?? 0
      if (got <= 0) continue
      if (m.need > 0) microFill += Math.min(got, m.need) / m.need
      /*
       * 상한이 있는 것(칼륨·인)은 남은 몫에 견주어 값을 매긴다.
       * 이미 넘긴 뒤라면 더 얹는 것 자체가 비싸므로 고정 비용을 크게 준다.
       */
      if (m.room < Infinity) microCost += m.room > 0 ? got / m.room : got / 200
    }

    /*
     * 열량·단백질이 다 찬 뒤(fill 이 0)에는 미량영양소만 남는다.
     * 그때는 실제로 도움이 되는 것만 받는다 — 칼슘 13 mg 짜리 살구를
     * "칼슘을 채우러" 올리는 것은 채우는 시늉일 뿐이다.
     */
    if (fill <= 0.01 ? microFill < 0.08 : fill + microFill <= 0.01) continue

    // 나트륨은 남은 예산에 견주어 값을 매긴다. 예산이 빠듯할수록 비싸진다.
    const naCost = c.na / Math.max(150, room.na)
    /*
     * 단백질도 위가 있다.
     *
     * 모자란 쪽만 보고 있었더니, 열량을 채우려고 고단백 식품을 계속 집어
     * 하루 단백질이 목표 상단의 1.3배까지 갔다. 체중 1 kg 당 2.3~2.7 g 이면
     * ESPEN 이 말하는 상한(2.0)을 넘고, 신기능이 떨어진 분께는 위험하다.
     * 이미 넘긴 뒤에 물리면 늦다. 처음에는 그렇게 했는데 소용이 없었다 —
     * 닭가슴살 31 g 을 놓을 때도, 닭백숙 51 g 을 얹을 때도 아직 상한 아래라
     * 아무 값이 붙지 않았고, 값이 붙기 시작할 때는 이미 120 g 을 넘긴 뒤였다.
     * 그러니 '이 한 가지가 상한을 얼마나 밀어내는가' 로 물린다.
     * 모자란 동안에는 fill 항이 훨씬 크므로 이 비용이 방해가 되지 않는다.
     */
    const protCost = Math.max(0, c.protein - Math.max(0, room.protein)) / 20
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
     * 국 한 그릇 가점.
     *
     * 한국 밥상은 밥과 국이 기본인데, 국은 완성품 한 그릇에 나트륨이 많아
     * 후보 경쟁에서 늘 밀렸다. 건더기 위주 형태를 만들어 나트륨 문제는 풀었지만,
     * 열량이 낮아(26~74 kcal) '모자란 만큼 채운다' 는 점수에서는 여전히 불리하다.
     * 실제로 드시는 상차림에 가깝도록, 그날 아직 국이 없을 때만 가점한다.
     * (이 단계에서는 어느 끼니에 놓일지가 아직 정해지지 않아 하루 단위로 본다.)
     */
    const soupsToday = MEAL_SLOTS.reduce(
      (n, sl) => n + meals[sl].filter((e) => e.food.group === '국·탕·찌개').length,
      0
    )
    const soupBonus = c.food.group === '국·탕·찌개' && soupsToday === 0 ? 26 : 0

    /*
     * 상차림의 짜임새.
     *
     * 영양만 보고 고르면 억지스러운 조합이 나온다 — 밥에 복숭아, 밥에 밥.
     * 한국 상차림은 밥·국·반찬이 한 벌이고, 그 안에서 자리마다 할 일이 다르다.
     * 그러니 '지금 이 상에 무엇이 모자란가' 를 점수에 넣는다.
     *
     * 아직 놓일 끼니가 정해지지 않았으므로, 이 후보가 갈 만한 끼니 가운데
     * 가장 비어 있는 곳을 기준으로 본다. 크게 주지 않는다 —
     * 영양을 뒤집을 항이 아니라 엇비슷할 때 상차림다운 쪽을 고르게 하는 정도다.
     */
    const role = mealRole(c.food)
    let harmony = 0
    for (const sl of slotsFor(c.food)) {
      if (sl === '간식') continue
      const here = meals[sl]
      if (here.length === 0) continue
      const roles = here.map((e) => mealRole(e.food))
      const hasStaple = roles.some((r) => r === 'staple' || r === 'onedish')
      const hasDish = roles.some((r) => r === 'soup' || r === 'main' || r === 'side')

      let v = 0
      /* 밥만 놓인 상에는 국이나 반찬이 절실하다 */
      if (hasStaple && !hasDish && (role === 'soup' || role === 'main' || role === 'side')) v = 30
      /* 반찬만 있고 밥이 없으면 밥을 부른다 */
      else if (!hasStaple && hasDish && role === 'staple') v = 22
      /* 이미 갖춰진 상에 후식을 더 얹는 것은 급하지 않다 */
      else if (role === 'dessert' && roles.includes('dessert')) v = -14
      /* 주식이 이미 있는데 또 주식 — 밥 두 공기 */
      else if (hasStaple && (role === 'staple' || role === 'onedish')) v = -40
      harmony = Math.max(harmony, v)
    }

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
    /*
     * 다만 미량영양소를 열량·단백질보다 앞세우지는 않는다.
     * 치료 중 먼저 무너지는 것은 에너지와 단백질이고(ESPEN),
     * 칼슘이 조금 모자란 것은 그 다음 문제다.
     */
    const score = fill * 80 + microFill * 60 + c.bonus * 0.5 + seasonBonus + soupBonus + harmony
      - fade - c.penalty * 9 - naCost * 25 - kcalCost * 14 - crossPenalty - microCost * 30 - protCost * 40
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
  const tol = retry ? RETRY_TOLERANCE : ROTATE_TOLERANCE
  const width = retry ? RETRY_POOL : ROTATE_POOL
  let pool = scored.filter((x) => x.score >= top - tol).slice(0, width)
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
  /** '다시 구성' 을 누르셨는가 */
  retry: boolean,
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
    if (meals[slot].filter((e) => e.food.group === c.food.group).length >= capG) return false
    /*
     * 한 끼에 주식은 하나다 — placeIn 에도 같은 규칙이 있다.
     * 여기서 빠뜨렸더니 아침에 보리밥과 흑미밥이 나란히 오르는 날이 남아 있었다.
     */
    const r = mealRole(c.food)
    if (r === 'staple' || r === 'onedish') {
      const taken = meals[slot].some((e) => {
        const er = mealRole(e.food)
        return er === 'staple' || er === 'onedish'
      })
      if (taken) return false
    }
    return true
  }
  const fits = fresh.filter(
    /*
     * 여기도 곁들임 상한을 본다.
     * placeIn 에만 걸어 두었더니 이 경로로 들어온 것들이 그대로 통과해,
     * "단호박(찐 것) + 군고구마" 나 "팥(삶은 것) + 군고구마" 같은 끼니가 남았다.
     */
    (c) => !exclude.has(c.food.id) && slotsFor(c.food).includes(slot) && roomForGroup(c) &&
           !sideClash(meals, slot, c.food)
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
    const near = ranked
      .filter((x) => rank(x) >= rank(ranked[0]) - (retry ? RETRY_TOLERANCE : ROTATE_TOLERANCE))
      .slice(0, retry ? RETRY_POOL : ROTATE_POOL)
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
  naUnknown: string[] = [],
  /** 미량영양소별로 값이 없는 식품의 이름들 */
  microUnknown: Partial<Record<NutrientKey, string[]>> = {}
): DayNote[] {
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const naLimit = profile.target.naLimit ?? 2000
  const notes: DayNote[] = []

  const kcal = totals.kcal ?? 0
  const protein = totals.protein ?? 0
  const na = totals.na ?? 0

  if (kcal < target.kcal[0]) {
    /*
     * 제한이 여러 겹으로 걸린 분은 채우고 싶어도 채울 것이 없다.
     *
     * 신기능이 떨어져 단백질·칼륨·인을 눌러야 하고, 설사로 섬유까지 줄여야 하며,
     * 복수가 있으면 나트륨도 낮춰야 한다. 그 넷을 다 지키고 남는 음식이
     * 몇 가지 되지 않는다. 실제로 130 kg 이신 분이 2,670 kcal 목표에
     * 2,124 에서 멈췄다.
     *
     * 그럴 때 "더 드세요" 만 적으면, 지키라는 대로 지킨 분께 못 지켰다고 하는 셈이다.
     * 왜 채우기 어려운지 밝히고, 그 답이 식사 밖에 있다는 것까지 말한다.
     */
    const limits: string[] = []
    if (patient.conditions.includes('신기능저하')) limits.push('신장(단백질·칼륨·인)')
    if (patient.conditions.includes('설사') || patient.conditions.includes('장루보유')) limits.push('저잔사(식이섬유)')
    if (patient.conditions.includes('복수')) limits.push('복수(나트륨)')
    if (patient.conditions.includes('간성뇌증위험')) limits.push('간성뇌증')

    notes.push(limits.length >= 2
      ? { tone: 'low', topic: '에너지',
          text: `목표(${target.kcal[0]}~${target.kcal[1]} kcal)보다 ${Math.round(target.kcal[0] - kcal)} kcal 부족합니다. ` +
            `${limits.join(' · ')} 제한이 함께 걸려 있어, 그 조건을 다 지키면서 열량을 채울 만한 음식이 많지 않습니다. ` +
            '식사만으로 메우기 어려우니 담당 선생님·영양팀과 경구영양보충제나 경관영양을 상의해 보세요. ' +
            '어느 제한을 얼마나 풀지는 채혈 결과를 보고 정할 일입니다.' }
      : { tone: 'low', topic: '에너지',
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
  } else if (protein > target.protein[1] * 1.25) {
    /*
     * 넘친 것도 말해야 한다.
     *
     * 예전에는 하단만 보고 "충족합니다" 로 끝냈다. 그래서 목표 62~78 g 인 분께
     * 111 g 을 내놓고도 '적정' 이라고 적었다. 위험해서가 아니라,
     * 앱이 제 입으로 세운 목표를 스스로 부정하면 나머지 숫자도 믿기 어려워진다.
     *
     * 다만 겁을 주지는 않는다 — 암 환자에게 단백질이 조금 넘치는 것은
     * 모자란 것보다 훨씬 나은 쪽이다. 신장이 걸리는 분만 따로 짚는다.
     */
    const perKg = protein / Math.max(1, dosingWeight(patient))
    const renal = patient.conditions.includes('신기능저하')
    notes.push({ tone: renal ? 'over' : 'info', topic: '단백질',
      text: `${Math.round(protein)} g — 목표(${target.protein[0]}~${target.protein[1]} g)보다 많습니다. ` +
        `체중 1 kg 당 ${perKg.toFixed(1)} g 입니다. ` +
        (renal
          ? '신장 기능이 떨어져 있으면 단백질이 많을수록 부담이 됩니다. ' +
            '치료 중 단백질을 줄이는 것도 위험하므로, 얼마가 맞는지는 채혈 결과를 보고 담당 선생님과 정하셔야 합니다.'
          : '암 환자에게는 모자란 것보다 나은 쪽이고 2.0 g/kg 까지는 대체로 안전하다고 봅니다. ' +
            '다만 신장 기능이 떨어져 있다면 이야기가 달라지니, 해당되시면 내 정보에 표시해 주세요.') })
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
   * 이분에게만 해당하는 미량영양소.
   *
   * 신기능이 떨어진 분의 칼륨·인, 골밀도가 떨어지는 치료를 받는 분의 칼슘,
   * 위를 잘라 낸 분의 철. 해당 사항이 없으면 한 줄도 늘지 않는다.
   * 늘 넷만 보던 화면에 갑자기 서른 줄이 뜨면 정작 중요한 것이 묻힌다.
   */
  for (const m of microTargets(patient)) {
    const got = totals[m.key]
    /*
     * 값이 하나도 없으면 "0 mg 이라 부족합니다" 가 되어 버린다.
     * 담으신 것이 없는 것과 자료에 값이 없는 것은 다른 이야기다.
     */
    if (got === undefined) continue
    const v = Math.round(got)

    if (m.max !== undefined && got > m.max) {
      /*
       * 단백질과 부딪치는 기준은, 단백질을 채운 날이면 사정을 설명한다.
       * 인 1,000 mg 은 암 환자의 단백질 목표와 애초에 양립하지 않는다.
       */
      const met =
        (m.tensionWith === 'protein' && protein >= target.protein[0]) ||
        (m.tensionWith === 'kcal' && kcal >= target.kcal[0])
      const tension =
        m.tensionWith === 'protein'
          ? `오늘 단백질 ${Math.round(protein)} g 을 채우셨다면 이건 피하기 어렵습니다 — ` +
            '단백질 1 g 마다 인이 13~15 mg 씩 따라 들어오기 때문입니다. ' +
            '치료 중에는 단백질을 줄이는 쪽이 더 위험하므로, 인은 식사를 깎기보다 ' +
            '가공식품의 인산염 첨가물을 줄이고 필요하면 인결합제로 잡는 것이 순서입니다. ' +
            '실제 기준은 채혈에서 나오는 혈중 인 수치이니 담당 선생님과 함께 보세요.'
          : `오늘 ${Math.round(kcal)} kcal 을 채우셨다면 이 정도는 따라옵니다 — ` +
            '칼륨은 특정 음식에 몰려 있지 않고 거의 모든 음식에 조금씩 들어 있어서, ' +
            '드시는 양이 늘면 함께 늘어납니다. 치료 중에 열량을 줄이는 쪽이 더 위험합니다. ' +
            '그래도 손댈 곳은 있습니다 — 채소는 잘게 썰어 데친 뒤 물을 버리면 칼륨이 상당히 줄고, ' +
            '바나나·감자·건과일·저염소금(염화칼륨)처럼 특히 높은 것은 빈도를 줄일 수 있습니다. ' +
            '실제 기준은 채혈에서 나오는 혈중 칼륨 수치이니 담당 선생님과 함께 보세요.'
      notes.push(met
        ? { tone: 'info', topic: m.label,
            text: `${v} ${m.unit} 입니다. 신장내과 기준(${m.max} ${m.unit})보다 많지만, ${tension}` }
        : { tone: 'over', topic: m.label,
            text: `${v} ${m.unit} — 기준(${m.max} ${m.unit})을 넘습니다. ${m.why}` })
    } else if (m.min !== undefined && got < m.min) {
      notes.push({ tone: 'low', topic: m.label,
        text: `${v} ${m.unit} 으로 ${m.min} ${m.unit} 에 못 미칩니다. ${m.why}` })
    } else {
      const range = m.min !== undefined && m.max !== undefined
        ? `${m.min}~${m.max} ${m.unit}`
        : m.min !== undefined ? `${m.min} ${m.unit} 이상` : `${m.max} ${m.unit} 이하`
      notes.push({ tone: 'good', topic: m.label, text: `${v} ${m.unit} — 기준(${range}) 안에 있습니다.` })
    }

    /*
     * 그 영양소 값이 없는 음식이 섞여 있으면 합계가 실제보다 적다.
     * "기준 안에 있습니다" 라고 안심시켜 놓고 실제로는 넘겼을 수 있으므로 밝힌다.
     * 나트륨에서 하던 것과 같은 이유다.
     */
    const blind = microUnknown[m.key] ?? []
    if (blind.length > 0) {
      const head = blind.slice(0, 3).join('·')
      const subject = blind.length > 3 ? `${head} 외 ${blind.length - 3}가지` : head
      notes.push({ tone: 'info', topic: `${m.label} 빠진 값`,
        text: `${subject}${topicParticle(subject)} 자료에 ${m.label} 값이 없어 위 합계에 잡히지 않았습니다.` })
    }
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

/**
 * 담으신 것 중, 각 미량영양소 값이 자료에 없는 음식의 이름.
 *
 * 나트륨에서 하던 것과 같다. 값이 없는 음식은 합계에 0 으로 잡히므로
 * "기준 안에 있습니다" 가 사실이 아닐 수 있다. 그 사실을 감추지 않는다.
 */
export function microUnknownNames(
  items: SelectedItem[],
  patient: PatientContext
): Partial<Record<NutrientKey, string[]>> {
  const out: Partial<Record<NutrientKey, string[]>> = {}
  for (const m of microTargets(patient)) {
    const names: string[] = []
    for (const it of items) {
      const f = FOOD_BY_ID[it.foodId]
      if (f && f.per100[m.key] === undefined && !names.includes(f.name)) names.push(f.name)
    }
    if (names.length > 0) out[m.key] = names
  }
  return out
}
