/**
 * 수입 건강기능식품 한글표시사항 전량 수집.
 *
 *   node scripts/fetch-supplements-imported.mjs
 *
 * 식약처_수입식품 제품별 한글표시사항(data.go.kr 15110214).
 * 조건 없이 부르면 서버가 40초 넘게 답하지 못하므로 제품구분으로 좁혀 받는다.
 * 받아 둔 쪽은 건너뛰니, 처음부터 다시 받으려면 data/raw-supplement-imported/ 를 지운다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, serviceKey } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw-supplement-imported')
const ENDPOINT = 'https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem'
const SIZE = 200

const KEY = serviceKey(loadEnv(ROOT).DATA_GO_KR_KEY)
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(pageNo, attempt = 1) {
  const q = new URLSearchParams({ pageNo: String(pageNo), numOfRows: String(SIZE), type: 'json', dclPrductSeCdNm: '건강기능식품' })
  try {
    const res = await fetch(`${ENDPOINT}?serviceKey=${KEY}&${q}`, { signal: AbortSignal.timeout(150000) })
    const json = await res.json()
    if (json?.header?.resultCode === '00') return json
    throw new Error(json?.header?.resultMsg || '예상과 다른 응답')
  } catch (e) {
    if (attempt >= 5) throw new Error(`${pageNo}쪽을 받지 못했습니다: ${e.message}`)
    await sleep(5000 * attempt)
    return fetchPage(pageNo, attempt + 1)
  }
}

const first = await fetchPage(1)
const total = first.body.totalCount
const last = Math.ceil(total / SIZE)
console.log(`수입 건강기능식품 ${total.toLocaleString()}행 · ${last}쪽`)
for (let p = 1; p <= last; p++) {
  const file = path.join(OUT, `page-${String(p).padStart(4, '0')}.json`)
  if (fs.existsSync(file)) continue
  const json = p === 1 ? first : await fetchPage(p)
  fs.writeFileSync(file, JSON.stringify((json.body.items ?? []).map((x) => x.item ?? x)))
  process.stdout.write(`\r  ${p}/${last}   `)
  await sleep(120)
}
console.log('\n완료. data/raw-supplement-imported/ 에 저장했습니다.')
