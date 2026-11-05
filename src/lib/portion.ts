/**
 * 담은 양을 사람이 읽는 말로 옮긴다.
 *
 * 상에 반찬 두세 가지를 올리려면 한 접시씩 덜 담아야 한다 —
 * 더 먹는 것이 아니라 나눠 먹는 것이라, 엔진이 0.5 인분을 놓는 자리가 생겼다.
 * 그런데 화면에는 그것이 "1접시 × 0.5" 로 나왔다. 산수처럼 보이지 밥상처럼 보이지 않는다.
 *
 * 처음에는 뒤에 '반' 을 붙였다. 그랬더니 '밥 1공기' 가 '밥 1공기 반' 이 되었다 —
 * 반 공기를 담으라는 말인데 한 공기 반으로 읽힌다. 양을 세 배로 잘못 읽게 만드는 표기다.
 * 그래서 단위 앞에 넣는다. '밥 1공기' → '밥 반 공기'.
 *
 * 낱말이 이 꼴에 맞지 않으면(예: '1/2모') 억지로 만들지 않고 곱셈으로 둔다 —
 * 어색한 편이 잘못 읽히는 것보다 낫다.
 */
export function portionLabel(label: string, servings: number): string {
  if (servings === 1) return label
  if (servings === 0.5) {
    /* '밥 1공기' → '밥 반 공기' · '1접시' → '반 접시'. 단, '1/2모' 같은 분수는 건드리지 않는다 */
    const m = /^(.*?)1(?!\s*\/)\s*([가-힣]+)$/.exec(label)
    if (m) return `${m[1]}반 ${m[2]}`
  }
  return `${label} × ${servings}`
}

/**
 * 시판 식품의 '1회 기준' 이 한 번에 드시는 양이 아니라 제품 한 통 전체일 수 있는가.
 *
 * 식약처 자료의 1회 섭취참고량이 없는 제품은 제품 전체 무게가 '1회' 로 들어와 있다. 볶음참깨 200 g(1,120 kcal),
 * 액젓 100 g(나트륨 8,783 mg) 같은 값이 그대로 합계에 더해진다. 값을 지어낼 수는 없으니 그렇게 알려 드린다.
 * 어느 행이 그런지 자료에 표시가 없어, 한 끼로 보기에 많은 양만 고른다 — 열량 500 kcal, 나트륨 2,000 mg(하루 상한).
 */
export function mayBeWholePack(food: { id: string; serving: { g: number }; per100: { kcal?: number; na?: number } }): boolean {
  const per = food.serving.g / 100
  /* 공공자료의 액젓·소스는 양을 몰라 100 g 으로 적혀 있다. 국밥 한 그릇처럼 정말 짠 한 끼와 가르려 100 g 만 본다 */
  if (food.id.startsWith('kf-')) return food.serving.g === 100 && (food.per100.na ?? 0) >= 2000
  if (!food.id.startsWith('kx-')) return false
  return (food.per100.kcal ?? 0) * per >= 500 || (food.per100.na ?? 0) * per >= 2000
}

/** 목록에 짧게 붙이는 말 */
export const WHOLE_PACK_SHORT = '제품 한 통 전체의 양일 수 있습니다'

/** 음식 상세에 적는 말 */
export const WHOLE_PACK_NOTE =
  '이 양은 한 번에 드시는 양이 아니라 제품 한 통(한 봉지) 전체의 양일 수 있습니다. ' +
  '조금만 드셨다면 실제 열량과 나트륨은 여기 적힌 것보다 훨씬 적습니다.'

