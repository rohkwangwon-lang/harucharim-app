/**
 * 시판 영양제 찾기 — 낱말 판단만 모은 곳. 저장소를 모르므로 검사에서 그대로 부른다.
 *
 * 예전에는 이름의 앞머리만 보아 '칼슘 마그네슘' 은 찾고 '마그네슘 칼슘' 은 0건이었다.
 * 식약처 자료는 제조사가 신고한 이름이라 판매 브랜드가 없는 일이 많다.
 * 통에 'CENOVIS 마그네슘' 이라 적힌 제품이 자료에는 (주)서흥의 '마그네슘' 이다(2026-11-04 사용자 보고).
 */

/** 통에 영문으로 함께 적힌 말. 자료의 이름은 한글이라 그대로는 찾지 못한다 */
const ALIAS: Record<string, string> = {
  magnesium: '마그네슘', calcium: '칼슘', zinc: '아연', vitamin: '비타민', omega: '오메가',
  probiotics: '프로바이오틱스', lutein: '루테인', iron: '철', collagen: '콜라겐', cenovis: '세노비스'
}

/**
 * 통 사진·바코드로 짝을 확인한 판매 이름. 신고번호로 잇는다.
 * 비슷해 보인다는 까닭으로 더하지 말 것 — 다른 제품의 판정을 보여 드리게 된다.
 */
export const VERIFIED_SOLD_AS: { brand: string; word: string; sold: string; reportNo: string; evidence: string }[] = [
  {
    brand: '세노비스', word: '마그네슘', sold: '세노비스 마그네슘', reportNo: '20040020006932',
    evidence: '통 사진(2026-11-04) 바코드 8806107513502 · 마그네슘 284 mg, 1,000 mg 정 ↔ C005 같은 바코드의 신고번호 · 신고 기준규격 284 mg/1 g'
  }
]

const BRANDS = new Set(VERIFIED_SOLD_AS.map((v) => v.brand))

/** 띄어쓰기·문장부호 표기가 제각각이라 글자와 숫자만 남겨 견준다 */
export const squeeze = (s: string) => s.toLowerCase().replace(/[^0-9a-z가-힣]/g, '')

/** 검색어를 낱말로 나눈다 */
export function suppWords(query: string): string[] {
  const out: string[] = []
  for (const raw of query.toLowerCase().split(/[\s,·/+&()[\]]+/)) {
    const w = squeeze(ALIAS[raw] ?? raw)
    if (w && !out.includes(w)) out.push(w)
  }
  return out
}

/** 낱말이 모두 들어 있으면 그 가운데서의 순서를, 아니면 null */
function rank(words: string[], name: string, hay: string): number | null {
  if (!words.every((w) => hay.includes(w))) return null
  const joined = words.join('')
  if (name === joined) return 0
  if (name.startsWith(joined)) return 1
  if (words.every((w) => name.includes(w))) return 2
  return 3
}

export interface SuppIndexRow {
  /** 저장소에서의 번호 */
  i: number
  /** squeeze 한 제품명 */
  name: string
  /** squeeze 한 제품명 + 제조사 */
  hay: string
  reportNo: string
}

export interface SuppMatch {
  /** 앞선 것부터 저장소 번호 */
  ids: number[]
  /** 어떤 제품 이름에도 없어 빼고 찾은 낱말 */
  dropped: string[]
  /** 저장소 번호 → 통에 적힌 판매 이름 */
  soldAs: Map<number, string>
}

/** 낱말을 모두 품은 제품을 찾고, 없는 낱말은 빼고 다시 찾아 무엇을 뺐는지 함께 돌려준다 */
export function matchSupplements(rows: SuppIndexRow[], words: string[], limit: number): SuppMatch {
  const soldAs = new Map<number, string>()
  const verified: number[] = []
  const brandInQuery = words.filter((w) => BRANDS.has(w))
  for (const v of VERIFIED_SOLD_AS) {
    if (!brandInQuery.includes(v.brand)) continue
    const rest = words.filter((w) => w !== v.brand)
    if (rest.length && !rest.every((w) => v.word.includes(w))) continue
    const row = rows.find((r) => r.reportNo === v.reportNo)
    if (row) { verified.push(row.i); soldAs.set(row.i, v.sold) }
  }

  const found = (ws: string[]) => {
    const hits: { i: number; r: number; len: number }[] = []
    for (const row of rows) {
      const r = rank(ws, row.name, row.hay)
      if (r !== null) hits.push({ i: row.i, r, len: row.name.length })
    }
    return hits.sort((a, b) => a.r - b.r || a.len - b.len || a.i - b.i).map((h) => h.i)
  }

  let ids = found(words)
  let dropped: string[] = []
  if (ids.length === 0 && verified.length === 0) {
    dropped = words.filter((w) => !rows.some((r) => r.hay.includes(w)))
    const kept = words.filter((w) => !dropped.includes(w))
    /* 남은 낱말끼리 함께 드는 제품이 없으면 지어내지 않는다 */
    ids = dropped.length && kept.length ? found(kept) : []
  } else if (verified.length) {
    /* 브랜드는 자료에 없는 말이므로, 확인된 제품을 앞에 두고 뒤는 잇지 않는다 */
    dropped = []
  }
  const merged = [...verified, ...ids.filter((i) => !verified.includes(i))]
  return { ids: merged.slice(0, limit), dropped, soldAs }
}

/** 신고번호에 확인된 판매 이름이 있으면 돌려준다 */
export const soldAsByReportNo = (reportNo: string) =>
  VERIFIED_SOLD_AS.find((v) => v.reportNo === reportNo)?.sold
