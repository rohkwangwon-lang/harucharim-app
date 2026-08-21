/**
 * 유통바코드(I2570) 수집.
 *
 *   node scripts/fetch-barcode-i2570.mjs
 *
 * C005(바코드연계제품정보)와 다른 표라, 겹치지 않는 제품이 있다.
 * 식품안전나라는 12~19시에 응답하지 않으므로 그 시간대는 피해야 한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw-barcode-i2570')
const PAGE = 1000

const env = loadEnv(ROOT)
const KEY = env.FOODSAFETY_KEY_BARCODE || env.FOODSAFETY_KEY
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchRange(start, end, attempt = 1) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${KEY}/I2570/json/${start}/${end}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(40000) })
    const body = (await res.json()).I2570
    if (body?.row) return body
    const code = body?.RESULT?.CODE
    if (code === 'INFO-200') return { row: [] }
    if (code === 'ERROR-503' && attempt < 8) { await sleep(10000 * attempt); return fetchRange(start, end, attempt + 1) }
    throw new Error(body?.RESULT?.MSG || '예상과 다른 응답')
  } catch (e) {
    if (attempt >= 5) throw e
    await sleep(2000 * attempt)
    return fetchRange(start, end, attempt + 1)
  }
}

const first = await fetchRange(1, 1)
const total = Number(first.total_count)
if (!total) { console.error('총 건수를 받지 못했습니다. 시간대 제한(12~19시)일 수 있습니다.'); process.exit(1) }
const lastPage = Math.ceil(total / PAGE)
console.log(`유통바코드 ${total.toLocaleString()}건 · ${lastPage}페이지`)

let done = 0, skipped = 0
for (let p = 1; p <= lastPage; p++) {
  const file = path.join(OUT, `page-${String(p).padStart(4, '0')}.json`)
  if (fs.existsSync(file)) { skipped++; continue }
  const start = (p - 1) * PAGE + 1
  const body = await fetchRange(start, start + PAGE - 1)
  const rows = (body.row || [])
    .map((r) => ({ b: r.BRCD_NO, n: r.PRDLST_REPORT_NO, p: r.PRDT_NM || r.PRDLST_NM, c: r.CMPNY_NM }))
    .filter((r) => r.b && r.n)
  fs.writeFileSync(file, JSON.stringify(rows))
  done++
  if (done % 10 === 0 || p === lastPage) process.stdout.write(`\r  ${p}/${lastPage} (새로 ${done})   `)
  await sleep(150)
}
console.log(`\n완료. data/raw-barcode-i2570/ 에 저장했습니다.`)
