import type { Food, FoodGroup, FoodTag, NutrientKey, Nutrients } from '../types'
import { displayName, drinkTag, sodiumTag, withAutoTags } from './autoTag'
import packed from './generated-core.json'

/**
 * 공공데이터에서 들여온 식품을 앱 형태로 편다.
 *
 * 저장할 때는 열 이름을 매 건마다 반복하지 않으려고 배열로 눌러 두었다.
 * (그대로 두면 용량의 절반이 키 문자열이다.)
 * 여기서 다시 객체로 펴서 나머지 코드가 기존 Food 와 똑같이 다루게 한다.
 */
export interface PackedFoods {
  cols: string[]
  groups: string[]
  tags: string[]
  items: [string, number, number, number[], (number | null)[], string | 0, string | 0][]
}

export type PackedRow = PackedFoods['items'][number]

/**
 * 받아 온 한 줄을 음식 하나로 푼다.
 *
 * 이 일을 하는 코드가 두 벌이었다 — 앱에 든 18,298종은 여기서, 내려받는 27만 종은
 * lib/foodStore.ts 에서 따로 풀었다. 그래서 고기에 잘못 붙던 '고식이섬유' 를 덜어 낼 때
 * 이쪽만 고쳐졌고, 27만 종은 그대로 남았다. 같은 일을 하는 자리가 둘이면 한쪽만 고쳐진다.
 * 이제 두 곳 모두 이 함수를 부른다.
 */
export function rowToFood(
  row: PackedRow,
  sc: { cols: string[]; groups: string[]; tags: string[] },
  id: string
): Food {
  const [name, gi, servingG, tagIdx, vals, maker, reportNo] = row
  const per100 = {} as Nutrients
  for (let c = 0; c < vals.length; c++) {
    const v = vals[c]
    if (v !== null && v !== undefined) per100[sc.cols[c] as NutrientKey] = v
  }
  // 에너지만은 있어야 계산이 성립한다. 나머지는 없으면 없는 대로 둔다 —
  // 0 으로 채우면 신고하지 않은 성분이 '들어 있지 않다'로 바뀐다.
  if (per100.kcal === undefined) per100.kcal = 0

  const group = sc.groups[gi] as FoodGroup
  /*
   * 간장 5 mL 는 300 mg 이라 1회 400 mg 기준에 못 미친다. 빌드가 '농도로 지킬 식품' 이라 표시해 둔 것은
   * 1회량과 상관없이 '고나트륨' 을 둔다. 표시 자체는 규칙에 없는 낱말이므로 여기서 없앤다.
   */
  const rawTags = tagIdx.map((t) => sc.tags[t] as FoodTag)
  const dense = rawTags.includes('나트륨농도높음' as FoodTag)
  const baseTags = dense ? rawTags.filter((t) => t !== ('나트륨농도높음' as FoodTag)) : rawTags
  const judged = sodiumTag(withAutoTags(name, baseTags, group), per100.na, servingG)
  const salted = dense && !judged.includes('고나트륨' as FoodTag) ? [...judged, '고나트륨' as FoodTag] : judged
  const food: Food = {
    id,
    /* 보이는 이름은 다듬고, 태그는 원본 이름으로 판정한다 */
    name: displayName(name),
    group,
    form: 'processed',
    /* 1회 섭취참고량인 것과 포장 무게인 것이 섞여 있어 '제공량' 이라 하지 않는다 */
    serving: { g: servingG, label: `1회 기준 ${servingG} g` },
    per100,
    tags: drinkTag(salted, name, group),
    src: 'kfda',
    auto: true
  }
  if (maker) food.maker = String(maker)
  if (reportNo) food.reportNo = String(reportNo)
  return food
}

export function unpack(p: PackedFoods, idPrefix: string): Food[] {
  const out: Food[] = new Array(p.items.length)
  for (let i = 0; i < p.items.length; i++) out[i] = rowToFood(p.items[i], p, `${idPrefix}${i}`)
  return out
}

export const GENERATED_CORE: Food[] = unpack(packed as unknown as PackedFoods, 'kf-')
