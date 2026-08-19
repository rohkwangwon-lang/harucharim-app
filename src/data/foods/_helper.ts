import type { Food, FoodGroup, FoodForm, FoodTag, Nutrients } from '../types'

interface Extra {
  aliases?: string[]
  gi?: number
  note?: string
  src?: Food['src']
}

/**
 * 식품 1건을 만드는 축약 생성기.
 * 인자 순서: id, 이름, 식품군, 형태, 1회제공량(g), 제공량표기, 100g당 성분, 태그, 기타
 *
 * per100 은 반드시 "가식부 100 g 당" 값이다. 조리 음식(dish)의 경우
 * 조리 후 완성품 100 g 기준으로 기입한다.
 */
export function F(
  id: string,
  name: string,
  group: FoodGroup,
  form: FoodForm,
  servingG: number,
  servingLabel: string,
  per100: Nutrients,
  tags: FoodTag[] = [],
  extra: Extra = {}
): Food {
  return {
    id,
    name,
    group,
    form,
    serving: { g: servingG, label: servingLabel },
    per100,
    tags,
    ...extra
  }
}
