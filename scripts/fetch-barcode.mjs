/**
 * 바코드 ↔ 품목보고번호 매핑 수집 (식품안전나라 C005).
 *
 *   node scripts/fetch-barcode.mjs
 *
 * 이 표가 있어야 스캔한 바코드로 우리 영양 데이터를 찾아갈 수 있다.
 * 식품안전나라는 09~19시에 응답이 불안정하므로 그 시간대는 피하는 편이 낫다.
 * 페이지 단위로 저장해 중간에 끊겨도 다시 실행하면 이어받는다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw-barcode')
const PAGE = 1000

const env = loadEnv(ROOT)
const KEY = env.FOODSAFETY_KEY_PRODUCT || env.FOODSAFETY_KEY
if (!KEY) { console.error('식품안전나라 키가 없습니다.'); process.exit(1) }

fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchRange(start, end, attempt = 1) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${KEY}/C005/json/${start}/${end}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(40000) })
    const d = await res.json()
    const body = d.C005
    if (body?.row) return body
    // 09~19시 제한(ERROR-503)이면 잠시 쉬었다 다시 시도한다
    const code = body?.RESULT?.CODE
    if (code === 'ERROR-503' && attempt < 6) { await sleep(5000 * attempt); return fetchRange(start, end, attempt + 1) }
    if (code === 'INFO-200') return { row: [] }   // 데이터 없음 = 끝
    throw new Error(body?.RESULT?.MSG || '예상과 다른 응답')
  } catch (e) {
    if (attempt >= 5) throw e
    await sleep(1500 * attempt)
    return fetchRange(start, end, attempt + 1)
  }
}

const first = await fetchRange(1, 1)
const total = Number(first.total_count)
const lastPage = Math.ceil(total / PAGE)
console.log(`바코드 매핑 ${total.toLocaleString()}건 · ${lastPage}페이지`)

let done = 0, skipped = 0
const started = Date.now()

for (let p = 1; p <= lastPage; p++) {
  const file = path.join(OUT, `page-${String(p).padStart(4, '0')}.json`)
  if (fs.existsSync(file)) { skipped++; continue }

  const start = (p - 1) * PAGE + 1
  const body = await fetchRange(start, start + PAGE - 1)
  // 필요한 열만 남긴다. 원본 전체를 두면 용량만 커진다.
  const rows = (body.row || []).map((r) => ({
    b: r.BAR_CD,
    n: r.PRDLST_REPORT_NO,
    p: r.PRDLST_NM,
    c: r.BSSH_NM
  })).filter((r) => r.b && r.n)
  fs.writeFileSync(file, JSON.stringify(rows))
  done++

  if (done % 10 === 0 || p === lastPage) {
    const rate = done / ((Date.now() - started) / 1000)
    const left = Math.round((lastPage - p) / Math.max(rate, 0.01) / 60)
    process.stdout.write(`\r  ${p}/${lastPage} 페이지 (새로 ${done} · 건너뜀 ${skipped}) 남은 시간 약 ${left}분   `)
  }
  await sleep(150)
}
console.log(`\n완료. data/raw-barcode/ 에 저장했습니다.`)
