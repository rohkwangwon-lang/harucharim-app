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

export function matchMedicines(rows: [string, string][], query: string, limit = 6): MedicineMatch {
  const words = suppWords(query).map(key)
  if (words.join('').length < 2) return { items: [], total: 0, named: false }
  const joined = words.join('')
  const hits: { m: Medicine; starts: boolean }[] = []
  for (const [name, company] of rows) {
    const n = key(name)
    const hay = n + key(company)
    if (words.every((w) => hay.includes(w))) hits.push({ m: { name, company }, starts: n.startsWith(joined) })
  }
  hits.sort((a, b) => Number(b.starts) - Number(a.starts) || a.m.name.length - b.m.name.length)
  return { items: hits.slice(0, limit).map((h) => h.m), total: hits.length, named: hits.some((h) => h.starts) }
}

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
