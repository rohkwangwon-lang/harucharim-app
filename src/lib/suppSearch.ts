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

/**
 * 같은 것을 다르게 적는 말. 어느 쪽으로 쳐도 찾는다('로열젤리' 0건, '로얄젤리' 1건이었다).
 * 다른 원료를 묶지 말 것 — 홍삼·인삼, 강황·울금은 별개다. 표기표는 찾기 전용이고 판정은 ingredientRules.ts 의 match 가 한다.
 */
const SAME_THING: string[][] = [
  ['로열젤리', '로얄젤리', '로얄제리', '로열제리'],
  ['밀크씨슬', '밀크시슬', '밀크티슬', '밀크씨틀', 'milkthistle'],
  ['쏘팔메토', '소팔메토', '쏘팔매토', '쏘우팔메토', 'sawpalmetto'],
  ['코큐텐', '코엔자임', '코엔자임큐텐', '코엔자임q10', 'coq10', '코큐10'],
  ['비타민c', '비타민씨'],
  ['비타민d', '비타민디'],
  ['오메가3', '오메가쓰리', '오메가삼', 'omega3'],
  ['피쉬오일', '피시오일', 'fishoil'],
  ['글루코사민', '글루코자민'],
  ['콘드로이친', '콘드로이틴'],
  ['엠에스엠', 'msm', '식이유황', '디메틸설폰', '메틸설포닐메탄'],
  ['스피루리나', '스피룰리나'],
  ['아스타잔틴', '아스타크산틴', '아스타산틴'],
  ['셀레늄', '셀렌', '셀레니움', 'selenium'],
  ['베타카로틴', '베타카로텐'],
  ['커큐민', '쿠르쿠민'],
  ['엽산', '폴산', '폴릭산', 'folate'],
  ['아연', '징크'],
  ['칼슘', '칼시움'],
  ['마그네슘', '마그네시움'],
  ['콜라겐', '콜라젠'],
  ['히알루론산', '히아루론산'],
  ['지아잔틴', '제아잔틴'],
  ['은행잎', '은행엽', '징코'],
  ['레시틴', '레시친'],
  ['멀티비타민', '종합비타민'],
  ['나이아신', '니아신'],
  ['크롬', '크로뮴', '크로미움'],
  ['망간', '망가니즈'],
  ['요오드', '아이오딘'],
  ['칼륨', '포타슘'],
  ['라이코펜', '리코펜'],
  ['글루타치온', '글루타티온'],
  ['크랜베리', '크렌베리'],
  ['치커리', '치코리'],
  ['에키네시아', '에키나시아'],
  ['프로바이오틱스', '유산균'],
  ['단백질', '프로틴'],
  ['나토키나제', '나토키나아제', '낫토키나제', '낫토키나아제'],
  ['펩타이드', '펩티드'],
  ['프로폴리스', '프로폴리즈'],
  ['알로에', '알로애'],
  ['가르시니아', '가르니시아'],
  ['폴리코사놀', '폴리코사올']
]

/**
 * 한쪽으로만 찾는 말. 거꾸로 찾으면 다른 낱말에 걸린다:
 * '비타민e' → '비타민이' 는 '멀티비타민이뮨', '비타민a' → '비타민에이' 는 '비타민에이스',
 * '비타민b' → '비타민비' 는 '멀티비타민비오틴', '비오틴' → '바이오틴' 은 '프로바이오틴'.
 */
const ONE_WAY: [string, string][] = [
  ['비타민이', '비타민e'], ['비타민에이', '비타민a'], ['비타민비', '비타민b'], ['비타민케이', '비타민k'],
  ['바이오틴', '비오틴']
]

const OTHER_SPELLINGS = new Map<string, string[]>()
for (const group of SAME_THING)
  for (const w of group) OTHER_SPELLINGS.set(w, group.filter((x) => x !== w))
for (const [from, to] of ONE_WAY) OTHER_SPELLINGS.set(from, [to])

/** 이 낱말과 같은 뜻의 표기들. 맨 앞은 친 그대로다. '세노비스밀크시슬' 처럼 낱말 속에 든 것도 바꾼다 */
export function spellings(word: string): string[] {
  const out = [word]
  for (const [key, others] of OTHER_SPELLINGS) {
    if (!word.includes(key)) continue
    for (const other of others) {
      const v = word.replace(key, other)
      if (!out.includes(v)) out.push(v)
    }
  }
  return out
}

/** 띄어쓰기·문장부호 표기가 제각각이라 글자와 숫자만 남겨 견준다 */
export const squeeze = (s: string) => s.toLowerCase().replace(/[^0-9a-z가-힣]/g, '')

/** 검색어를 낱말로 나눈다 */
export function suppWords(query: string): string[] {
  const out: string[] = []
  for (const raw of query.toLowerCase().split(/[\s,·/+&()[\]]+/)) {
    const w = squeeze(ALIAS[raw] ?? raw)
    if (!w || out.includes(w)) continue
    /* '비타민 씨', '밀크 시슬' — 띄어 쳐도 한 낱말로 본다 */
    if (out.length && OTHER_SPELLINGS.has(out[out.length - 1] + w)) out[out.length - 1] += w
    else out.push(w)
  }
  return out
}

/** 낱말이 모두 들어 있으면 그 가운데서의 순서를, 아니면 null */
function rank(wanted: string[][], name: string, hay: string): number | null {
  const words: string[] = []
  for (const alts of wanted) {
    const w = alts.find((a) => hay.includes(a))
    if (w === undefined) return null
    words.push(w)
  }
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

/**
 * 저장소 한 줄: 제품명, 업체, 기능성, 신고번호, 섭취법 — 수입품은 뒤에 제조국과 찾기용 영문 이름이 붙는다.
 * 수입품은 신고번호 칸이 비어 있고, 자료에 바코드가 없어 바코드로는 닿지 않는다.
 */
export type SuppRow = [string, string, string, string, string, string?, string?]

/** 통에 영문으로만 적힌 수입품도 찾도록 영문 이름·해외 제조사를 낱말표에 넣는다 */
export function toSuppIndexRow(i: number, r: SuppRow): SuppIndexRow {
  const name = squeeze(r[0])
  return { i, name, hay: name + squeeze(r[1]) + squeeze(r[6] ?? ''), reportNo: r[3] || '' }
}

/** 낱말을 모두 품은 제품을 찾고, 없는 낱말은 빼고 다시 찾아 무엇을 뺐는지 함께 돌려준다 */
export function matchSupplements(rows: SuppIndexRow[], words: string[], limit: number): SuppMatch {
  const soldAs = new Map<number, string>()
  const verified: number[] = []
  const brandInQuery = words.filter((w) => BRANDS.has(w))
  for (const v of VERIFIED_SOLD_AS) {
    if (!brandInQuery.includes(v.brand)) continue
    const rest = words.filter((w) => w !== v.brand)
    if (rest.length && !rest.every((w) => spellings(w).some((a) => v.word.includes(a)))) continue
    const row = rows.find((r) => r.reportNo === v.reportNo)
    if (row) { verified.push(row.i); soldAs.set(row.i, v.sold) }
  }

  const found = (ws: string[]) => {
    const wanted = ws.map(spellings)
    const hits: { i: number; r: number; len: number }[] = []
    for (const row of rows) {
      const r = rank(wanted, row.name, row.hay)
      if (r !== null) hits.push({ i: row.i, r, len: row.name.length })
    }
    return hits.sort((a, b) => a.r - b.r || a.len - b.len || a.i - b.i).map((h) => h.i)
  }

  let ids = found(words)
  let dropped: string[] = []
  if (ids.length === 0 && verified.length === 0) {
    dropped = words.filter((w) => {
      const alts = spellings(w)
      return !rows.some((r) => alts.some((a) => r.hay.includes(a)))
    })
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
