/**
 * 건강기능식품 품목제조신고 전량 수집.
 *
 *   node scripts/fetch-supplements.mjs
 *
 * 제품명·업체·주된 기능성·섭취 시 주의사항·기준규격이 들어 있다.
 * 특히 MAIN_FNCTN(주된 기능성)은 한국 건강기능식품 고시가 정한 문구라
 * 정형화되어 있어, 이것으로 제품을 기능별로 자동 분류할 수 있다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, serviceKey } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw-supplement')
const ENDPOINT = 'https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01'

const env = loadEnv(ROOT)
const KEY = serviceKey(env.DATA_GO_KR_KEY)
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(pageNo, rows, attempt = 1) {
  const url = `${ENDPOINT}?serviceKey=${KEY}&pageNo=${pageNo}&numOfRows=${rows}&type=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    const json = await res.json()
    if (json?.body?.items) return json
    throw new Error(json?.header?.resultMsg || '예상과 다른 응답')
  } catch (e) {
    if (attempt >= 4) throw e
    await sleep(1000 * attempt * attempt)
    return fetchPage(pageNo, rows, attempt + 1)
  }
}

// 한 번에 받을 수 있는 최대치를 먼저 확인한다
let PAGE = 100
for (const n of [500, 300, 100]) {
  const t = await fetchPage(1, n)
  if ((t.body.items?.length ?? 0) >= n) { PAGE = n; break }
}

const first = await fetchPage(1, PAGE)
const total = first.body.totalCount
const lastPage = Math.ceil(total / PAGE)
console.log(`건강기능식품 ${total.toLocaleString()}건 · ${lastPage}페이지 (페이지당 ${PAGE}건)`)

let done = 0, skipped = 0
const started = Date.now()

for (let p = 1; p <= lastPage; p++) {
  const file = path.join(OUT, `page-${String(p).padStart(4, '0')}.json`)
  if (fs.existsSync(file)) { skipped++; continue }

  const json = p === 1 ? first : await fetchPage(p, PAGE)
  // items 는 [{item:{...}}, ...] 또는 [{...}] 두 형태로 온다
  const rows = json.body.items.map((x) => x.item ?? x)
  fs.writeFileSync(file, JSON.stringify(rows))
  done++

  if (done % 20 === 0 || p === lastPage) {
    const rate = done / ((Date.now() - started) / 1000)
    const left = Math.round((lastPage - p) / Math.max(rate, 0.01) / 60)
    process.stdout.write(`\r  ${p}/${lastPage} (새로 ${done} · 건너뜀 ${skipped}) 남은 시간 약 ${left}분   `)
  }
  await sleep(120)
}
console.log(`\n완료. data/raw-supplement/ 에 저장했습니다.`)
