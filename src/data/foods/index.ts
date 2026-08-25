import type { Food, FoodGroup } from '../types'
import { grains } from './grains'
import { legumes } from './legumes'
import { nuts } from './nuts'
import { vegetables } from './vegetables'
import { seaweedMushroom } from './seaweedMushroom'
import { fruits } from './fruits'
import { meat } from './meat'
import { poultryEgg } from './poultryEgg'
import { seafood } from './seafood'
import { dairy } from './dairy'
import { fatsSugar } from './fatsSugar'
import { soups } from './soups'
import { sidedish } from './sidedish'
import { riceNoodle } from './riceNoodle'
import { eatout } from './eatout'
import { beverages } from './beverages'
import { snacks } from './snacks'
import { processed } from './processed'
import { clinical } from './clinical'
import { vegetables2 } from './vegetables2'
import { fruits2 } from './fruits2'
import { dishes2 } from './dishes2'
import { misc2 } from './misc2'
import { western } from './western'
import { ramyeon } from './ramyeon'
import { gimbap } from './gimbap'
import { CUISINE_MAP, SEASON_MAP } from './seasonCuisine'
import { GENERATED_CORE } from './generated'

/** 손으로 검토해 태그를 붙인 식품. 검색에서 먼저 보여 준다. */
export const CURATED_FOODS: Food[] = [
  ...grains, ...legumes, ...nuts, ...vegetables, ...seaweedMushroom, ...fruits,
  ...meat, ...poultryEgg, ...seafood, ...dairy, ...fatsSugar,
  ...soups, ...sidedish, ...riceNoodle, ...eatout,
  ...beverages, ...snacks, ...processed, ...clinical,
  ...vegetables2, ...fruits2, ...dishes2, ...misc2, ...western,
  ...ramyeon, ...gimbap
].map((f) => ({
  // 제철·요리 계통은 seasonCuisine.ts 한 곳에서 관리하고 여기서 붙인다
  ...f,
  season: f.season ?? SEASON_MAP[f.id],
  cuisine: f.cuisine ?? CUISINE_MAP[f.id] ?? '한식'
}))

/**
 * 전체 식품 = 수작업 검토분 + 공공데이터 자동 수집분.
 * 수작업 검토분을 앞에 두어 검색 결과에서 먼저 걸리게 한다.
 */
export const FOODS: Food[] = [...CURATED_FOODS, ...GENERATED_CORE]

/** id → Food 조회용 인덱스 */
export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(
  FOODS.map((f) => [f.id, f])
)

/** 중복 id 는 데이터 오류이므로 개발 중 즉시 드러나게 한다 */
if (import.meta.env?.DEV) {
  const seen = new Set<string>()
  for (const f of FOODS) {
    if (seen.has(f.id)) console.error(`[foods] 중복 id: ${f.id}`)
    seen.add(f.id)
  }
}

/* ────────────────── 상에 오르는 것과 재료를 가른다 ────────────────── */

/**
 * 이것 하나로 상에 오를 수 있는가.
 *
 * 자료의 `form: 'ingredient'` 를 그대로 '추천하면 안 되는 것' 으로 써 왔는데,
 * 그 둘은 다른 이야기였다. 쌀밥도 김치도 두부도 김도 자료에서는 재료로 적혀 있다.
 * 그래서 한식 식단이라면서 밥이 스무 날 동안 한 번도 나오지 않았고,
 * 김치도 나물도 함께 빠졌다 — 488종 가운데 148종이 그렇게 사라졌다.
 * 과일에서 한 번, 조리된 단백질에서 또 한 번 겪은 것과 같은 오분류다.
 *
 * 이번에는 반대로 적는다. 무엇이 재료인지를 밝히고, 나머지는 상에 오른다고 본다.
 * 재료는 네 갈래뿐이다 — 기름·조미료, 장류, 손질 전의 것, 그리고 생고기·생선살.
 *
 * 생선회처럼 날로 먹는 것은 여기서 막지 않는다. 그건 '재료' 라서가 아니라
 * 호중구감소증 같은 상황에서 문제가 되는 것이므로 규칙이 따로 판단한다.
 */
const SEASONING = /^(된장|고추장|간장|쌈장|춘장|초고추장|저염된장|멸치액젓|소금|설탕|꿀|식초|케첩|마요네즈)$/
const RAW_MARK = /\((생쌀|가루|건면|분쇄|생물|살)\)|사리|전분$|^들깨\(가루\)$/
/** 조리 표시가 없으면 아직 재료인 갈래 — 굽거나 삶기 전의 고기·생선 */
const RAW_PROTEIN_GROUPS = new Set<FoodGroup>(['육류', '가금류·난류'])
const COOKED_MARK = /\((구이|데친 것|찐 것|삶은 것|조림|볶음|찜|훈제)\)/
/** 손질만 해 두고 요리에 넣는 수산물 */
const SEAFOOD_STOCK = /^(멸치\(마른 것\)|북어\(황태\)|대구\(살\)|동태\(생물\)|알탕용 명태알|바지락|홍합|전복|해삼)$/

export function isIngredientOnly(f: Food): boolean {
  /* 기름과 당류, 조미료는 그 자체로 먹지 않는다 */
  if (f.group === '유지·당류') return true
  if (SEASONING.test(f.name)) return true
  /* 아직 손질 전이거나 가루·건면인 것 */
  if (RAW_MARK.test(f.name)) return true
  /*
   * '불린 것' 은 이미 손질을 마친 상태다 — 고사리나물은 그대로 상에 오른다.
   * 반면 '생것' 과 '말린 것' 은 아직 요리 전이다.
   */
  if (/\((생것|말린 것)\)$/.test(f.name) && f.group !== '해조·버섯' && f.group !== '채소') return true
  /* 굽거나 삶기 전의 고기 */
  if (RAW_PROTEIN_GROUPS.has(f.group) && f.form === 'ingredient' && !COOKED_MARK.test(f.name)) {
    /* 달걀·치즈처럼 그대로 먹는 것은 예외 — 이름에 조리가 없어도 상에 오른다 */
    if (!/달걀|계란|메추리알/.test(f.name)) return true
  }
  /* 국물이나 조림에 넣는 수산물 */
  if (SEAFOOD_STOCK.test(f.name)) return true
  /* 우유·유제품 중 조리에 쓰는 것 */
  if (/^(생크림|탈지분유)$/.test(f.name)) return true
  return false
}
