import type { Food, FoodGroup, FoodTag, NutrientKey, Nutrients } from '../types'
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

export function unpack(p: PackedFoods, idPrefix: string): Food[] {
  const out: Food[] = new Array(p.items.length)
  for (let i = 0; i < p.items.length; i++) {
    const [name, gi, servingG, tagIdx, vals, maker, reportNo] = p.items[i]
    const per100 = {} as Nutrients
    for (let c = 0; c < vals.length; c++) {
      const v = vals[c]
      if (v !== null && v !== undefined) per100[p.cols[c] as NutrientKey] = v
    }
    // 에너지만은 있어야 계산이 성립한다. 나머지는 없으면 없는 대로 둔다 —
    // 0 으로 채우면 신고하지 않은 성분이 '들어 있지 않다'로 바뀐다.
    if (per100.kcal === undefined) per100.kcal = 0

    const food: Food = {
      id: `${idPrefix}${i}`,
      name,
      group: p.groups[gi] as FoodGroup,
      form: 'processed',
      serving: { g: servingG, label: `1회 제공량 ${servingG} g` },
      per100,
      tags: tagIdx.map((t) => p.tags[t] as FoodTag),
      src: 'kfda',
      auto: true
    }
    if (maker) food.maker = String(maker)
    if (reportNo) food.reportNo = String(reportNo)
    out[i] = food
  }
  return out
}

/** 번들에 포함된 핵심 식품 — 인터넷 없이도 항상 쓸 수 있다 */
export const GENERATED_CORE: Food[] = unpack(packed as unknown as PackedFoods, 'kf-')
