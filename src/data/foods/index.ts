import type { Food } from '../types'
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
