/**
 * 식품영양성분DB 전량 수집.
 *
 *   node scripts/fetch-nutrition.mjs
 *
 * 페이지당 500건이 상한이고 전체 32만 건이므로 약 640회 요청한다.
 * 개발계정 일일 한도가 10,000회라 여유가 있다.
 *
 * 중간에 끊겨도 이어받을 수 있도록 페이지 단위로 저장한다.
 * 이미 받은 페이지는 건너뛰므로 그냥 다시 실행하면 된다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, serviceKey } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw')
const ENDPOINT = 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02'
const PAGE_SIZE = 500

const env = loadEnv(ROOT)
const KEY = serviceKey(env.DATA_GO_KR_KEY)
if (!env.DATA_GO_KR_KEY) { console.error('DATA_GO_KR_KEY 가 비어 있습니다.'); process.exit(1) }

fs.mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(pageNo, attempt = 1) {
  const url = `${ENDPOINT}?serviceKey=${KEY}&pageNo=${pageNo}&numOfRows=${PAGE_SIZE}&type=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    const json = await res.json()
    if (json?.body?.items) return json
    throw new Error(json?.header?.resultMsg || '예상과 다른 응답')
  } catch (e) {
    // 공공 API 는 간헐적으로 끊긴다. 지수 백오프로 세 번까지 다시 시도한다.
    if (attempt >= 4) throw e
    await sleep(1000 * attempt * attempt)
    return fetchPage(pageNo, attempt + 1)
  }
}

const first = await fetchPage(1)
const total = first.body.totalCount
const lastPage = Math.ceil(total / PAGE_SIZE)
console.log(`전체 ${total.toLocaleString()}건 · ${lastPage}페이지 (페이지당 ${PAGE_SIZE}건)`)

let done = 0
let skipped = 0
const started = Date.now()

for (let p = 1; p <= lastPage; p++) {
  const file = path.join(OUT, `page-${String(p).padStart(4, '0')}.json`)
  if (fs.existsSync(file)) { skipped++; continue }

  const json = p === 1 ? first : await fetchPage(p)
  fs.writeFileSync(file, JSON.stringify(json.body.items))
  done++

  if (done % 20 === 0 || p === lastPage) {
    const elapsed = (Date.now() - started) / 1000
    const rate = done / elapsed
    const left = Math.round((lastPage - p) / Math.max(rate, 0.01))
    process.stdout.write(
      `\r  ${p}/${lastPage} 페이지  (새로 받음 ${done} · 건너뜀 ${skipped})  남은 시간 약 ${Math.ceil(left / 60)}분   `
    )
  }
  // 서버 부하를 피하기 위한 간격
  await sleep(120)
}

console.log(`\n완료. 새로 받은 페이지 ${done}개, 이미 있던 페이지 ${skipped}개.`)
console.log(`저장 위치: data/raw/`)
