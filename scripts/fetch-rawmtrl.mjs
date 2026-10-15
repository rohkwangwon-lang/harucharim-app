/**
 * 품목제조보고 원재료(C002) 수집 — 알레르기 2단계(2026-10-15).
 *
 *   node scripts/fetch-rawmtrl.mjs
 *
 * 식품안전나라 C002 '식품(첨가물)품목제조보고(원재료)'. 품목보고번호(PRDLST_REPORT_NO)마다
 * 원재료명(RAWMTRL_NM)이 쉼표로 이어져 있다. 이름만 보던 알레르기 판정을 원재료로 넓히는 데 쓴다.
 * 필요한 두 칸만 남겨 페이지마다 저장한다 — 중간에 끊겨도 받은 페이지는 건너뛰고 이어 받는다.
 * 식품안전나라는 낮 시간대에 응답이 느리거나 끊기기도 한다(I2570 수집 때 12~19시).
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw-rawmtrl')
const PAGE = 1000

const env = loadEnv(ROOT)
const KEY = env.FOODSAFETY_KEY
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchRange(start, end, attempt = 1) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${KEY}/C002/json/${start}/${end}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
    const body = (await res.json()).C002
    if (body?.row) return body
    const code = body?.RESULT?.CODE
    if (code === 'INFO-200') return { row: [] }
    if (code === 'ERROR-503' && attempt < 8) { await sleep(10000 * attempt); return fetchRange(start, end, attempt + 1) }
    throw new Error(body?.RESULT?.MSG || '예상과 다른 응답')
  } catch (e) {
    if (attempt >= 6) throw e
    await sleep(3000 * attempt)
    return fetchRange(start, end, attempt + 1)
  }
}

const first = await fetchRange(1, 1)
const total = Number(first.total_count)
if (!total) { console.error('총 건수를 받지 못했습니다.'); process.exit(1) }
const lastPage = Math.ceil(total / PAGE)
console.log(`품목제조보고 원재료 ${total.toLocaleString()}건 · ${lastPage}페이지`)

let done = 0
for (let p = 1; p <= lastPage; p++) {
  const file = path.join(OUT, `page-${String(p).padStart(5, '0')}.json`)
  if (fs.existsSync(file)) continue
  const start = (p - 1) * PAGE + 1
  const body = await fetchRange(start, start + PAGE - 1)
  const rows = (body.row || [])
    .map((r) => ({ n: r.PRDLST_REPORT_NO, m: r.RAWMTRL_NM }))
    .filter((r) => r.n && r.m)
  fs.writeFileSync(file, JSON.stringify(rows))
  done++
  if (done % 20 === 0 || p === lastPage) console.log(`  ${p}/${lastPage} (새로 ${done})`)
  await sleep(120)
}
console.log('완료. data/raw-rawmtrl/ 에 저장했습니다.')
