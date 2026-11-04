/**
 * 바코드를 찍은 뒤 무엇을 할지 — 저장소와 화면 없이 판단만 한다(검사가 이 함수를 직접 부른다).
 *
 * 영양값을 바로 보여도 되는 것은 제 제품임이 확인된 경우뿐이다.
 * 이름이 비슷한 같은 회사 제품은 다른 제품일 수 있으므로 먼저 묻는다(2026-11-04).
 */
export type ScanOutcome = 'detail' | 'similar' | 'stale' | 'no-nutrition'

export function scanOutcome(hit: { hasFood: boolean; similar?: boolean; stale?: boolean; linkedByUser?: boolean }): ScanOutcome {
  // 사용자가 직접 이어 둔 것은 이미 확인을 받은 것이다
  if (hit.linkedByUser && hit.hasFood) return 'detail'
  if (hit.stale) return 'stale'
  if (!hit.hasFood) return 'no-nutrition'
  return hit.similar ? 'similar' : 'detail'
}

/**
 * 제품명을 찾기 칸에 넣을 말로 다듬는다.
 *
 * 바코드 자료의 이름에는 '새우젓3kg', '성빈식품 호호찰순대(순한맛) 냉동 500g X 1개' 처럼 용량과 포장이
 * 붙어 있어 그대로 넣으면 같은 이름의 제품도 못 찾는다. 줄이고 난 말이 너무 짧으면 원래 이름을 둔다.
 */
export function productSearchTerm(name: string): string {
  const t = String(name)
    .normalize('NFKC')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\bx\s*\d+\s*(ea|개)?/gi, ' ')
    .replace(/\d+(\.\d+)?\s*(kg|g|ml|l|ea)(?![a-z])/gi, ' ')
    .replace(/\d+\s*(개입|입|매|팩|봉|캔|병|개)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length >= 2 ? t : String(name).trim()
}

/** 띄어쓰기·기호까지 지운 꼴 — '등심돈까스' 와 '등심 돈까스' 가 서로 찾아지게 한다 */
export function squeezedName(name: string): string {
  return productSearchTerm(name).toLowerCase().replace(/[^0-9a-z가-힣]/g, '')
}
