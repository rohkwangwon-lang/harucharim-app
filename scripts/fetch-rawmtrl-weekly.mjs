/**
 * 품목제조보고 원재료(C002) 주간 증분 수집 — 알레르기 색인 매주 갱신(2026-10-15).
 *
 *   node scripts/fetch-rawmtrl-weekly.mjs
 *
 * C002 는 변경일자(CHNG_DT) 조건을 주면 최근 7일 안에 바뀐 것만 돌려준다(조건이 없으면 시간당 100회 한도).
 * 6일 전부터 바뀐 것을 받아 data/raw-rawmtrl-inc/inc-날짜-쪽.json 으로 둔다. 일주일에 대개 5,000건 안팎(5쪽)이다.
 * 전체는 식품안전나라 CSV(data/raw-rawmtrl-csv/)로 한 번 받아 두었다 — 이것은 그 위에 얹는 증분이다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw-rawmtrl-inc')
const PAGE = 1000
const env = loadEnv(ROOT)
const KEY = env.FOODSAFETY_KEY
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const since = new Date(Date.now() - 6 * 86400000)
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const SINCE = ymd(since)
const TODAY = ymd(new Date())

async function fetchRange(start, end, attempt = 1) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${KEY}/C002/json/${start}/${end}/CHNG_DT=${SINCE}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
    const body = (await res.json()).C002
    if (body?.row) return body
    if (body?.RESULT?.CODE === 'INFO-200') return { row: [], total_count: 0 }
    throw new Error(body?.RESULT?.MSG || '예상과 다른 응답')
  } catch (e) {
    if (attempt >= 6) throw e
    await sleep(20000 * attempt)
    return fetchRange(start, end, attempt + 1)
  }
}

const first = await fetchRange(1, PAGE)
const total = Number(first.total_count || 0)
const pages = Math.ceil(total / PAGE)
let rows = 0
for (let p = 1; p <= pages; p++) {
  const body = p === 1 ? first : await fetchRange((p - 1) * PAGE + 1, p * PAGE)
  const out = (body.row || []).map((r) => ({ n: r.PRDLST_REPORT_NO, m: r.RAWMTRL_NM, d: r.CHNG_DT })).filter((r) => r.n && r.m)
  rows += out.length
  fs.writeFileSync(path.join(OUT, `inc-${TODAY}-${String(p).padStart(3, '0')}.json`), JSON.stringify(out))
  await sleep(2000)
}
console.log(`C002 증분 ${SINCE}~ : ${total.toLocaleString()}건 · ${pages}쪽 · 저장 ${rows.toLocaleString()}행`)
