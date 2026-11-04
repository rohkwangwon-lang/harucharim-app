/**
 * 영양제 찾기에서 만나는 의약품.
 *
 * 삐콤씨·아로나민처럼 비타민으로 아는 제품 가운데 의약품이 많은데, 영양제 자료(건강기능식품)에는 없다.
 * "찾지 못했습니다" 로 끝나면 왜 없는지 모르고, '비콤씨' 를 치면 이름이 비슷한 다른 건강기능식품이 그 제품처럼 나왔다.
 *
 * 여기서는 이름만 알려 드린다. 판정은 하지 않는다 — 식약처 회신의 '식생활·영양관리 목적' 범위를 넘지 않기 위해서다.
 */
import { squeeze, suppWords } from './suppSearch'

export const MEDICINE_NOTICE =
  '건강기능식품이 아니라 의약품입니다. 이 앱은 의약품을 판정하지 않으니, 드시고 있거나 드실 계획이면 담당 의사와 상의하세요.'

export interface Medicine {
  name: string
  company: string
}

export interface MedicineMatch {
  items: Medicine[]
  total: number
  /** 치신 이름으로 시작하는 제품이 있다 — 비슷한 이름의 건강기능식품보다 앞에 알려야 한다 */
  named: boolean
}

/** '비콤씨' 로 쳐도 삐콤씨를 찾는다 */
const key = (s: string) => squeeze(s).replace(/삐/g, '비')

/** 통에 크게 적힌 이름. 괄호 속은 성분이라, '은행' 으로 징카민(은행엽건조엑스)을 찾으면 안 된다 */
const brandOf = (name: string) => key(name.split(/[([{]/)[0])

/** 두 글자 낱말은 이름 첫머리만 본다 — '아연' 이 눈모아연질캡슐·소프티아연고에 걸렸다 */
const inBrand = (brand: string, w: string) => (w.length <= 2 ? brand.startsWith(w) : brand.includes(w))

export function matchMedicines(rows: [string, string][], query: string, limit = 6): MedicineMatch {
  const words = suppWords(query).map(key)
  const joined = words.join('')
  if (joined.length < 2) return { items: [], total: 0, named: false }
  const hits: { m: Medicine; starts: boolean }[] = []
  for (const [name, company] of rows) {
    const brand = brandOf(name)
    const maker = key(company)
    /* 이름과 회사를 이어 붙여 찾지 않는다 — '리도카인'+'삼진제약' 이 '인삼' 에 걸렸다 */
    const rest = words.filter((w) => !maker.includes(w))
    /* 회사 이름만 친 것은 제품을 찾는 말이 아니다 — '종근당' 에 구충제가 나왔다 */
    if (!rest.length) continue
    if (inBrand(brand, joined) || rest.every((w) => inBrand(brand, w)))
      hits.push({ m: { name, company }, starts: brand.startsWith(joined) })
  }
  hits.sort((a, b) => Number(b.starts) - Number(a.starts) || a.m.name.length - b.m.name.length)
  return { items: hits.slice(0, limit).map((h) => h.m), total: hits.length, named: hits.some((h) => h.starts) }
}

/**
 * 안내를 결과 위에 둘 것인가. '비콤씨' 처럼 비슷한 이름이 몇 개 걸릴 때는 위에 두어 그 제품으로 오해하지 않게 한다.
 * '코큐텐' 처럼 건강기능식품이 많이 나오는 원료 이름에서는 찾던 것을 밀어내므로 아래에 둔다.
 */
export const medicineFirst = (match: MedicineMatch, resultCount: number) => match.named && resultCount <= 15

let load: Promise<[string, string][]> | null = null

/** 필요할 때 한 번 받는다. 못 받으면 빈 표 — 영양제 찾기는 그대로 돌아야 한다 */
function loadMedicines(): Promise<[string, string][]> {
  if (load) return load
  const base = import.meta.env.BASE_URL || '/'
  load = fetch(`${base}data/medicines.json`)
    .then(async (res) => (res.ok ? ((await res.json()) as { items: [string, string][] }).items : []))
    .catch(() => {
      load = null
      return []
    })
  return load
}

export async function findMedicines(query: string): Promise<MedicineMatch> {
  return matchMedicines(await loadMedicines(), query)
}
