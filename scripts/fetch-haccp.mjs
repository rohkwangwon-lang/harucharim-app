/**
 * HACCP 인증제품 표지정보 수집 — 알레르기 2단계 보강(2026-10-15).
 *
 *   node scripts/fetch-haccp.mjs
 *
 * 공공데이터포털 '식품의약품안전처_HACCP 제품이미지 및 포장지표기정보'(CertImgListServiceV3). 약 1만 5천 제품.
 * 원재료(rawmtrl)와 포장의 알레르기 표시(allergy)가 들어 있다.
 *
 * 알레르기 칸은 그대로 믿지 않는다 — 첫 제품부터 알레르기 '없음' 인데 원재료에 새우가 있었다(제조사가 적는 칸이다).
 * 그래서 원재료와 알레르기 칸을 한 줄로 이어 두고, 색인을 만들 때 원재료 판별식으로 함께 읽는다(빠짐없이 더하는 쪽).
 *
 * 키는 URL 인코딩하지 않고 그대로 보낸다 — 인코딩해서 보내면 '등록되지 않은 서비스키' 로 거절된다(2026-10-15 확인).
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw-haccp')
const ROWS = 100
const env = loadEnv(ROOT)
const KEY = env.DATA_GO_KR_KEY
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function page(no, attempt = 1) {
  const url = `https://apis.data.go.kr/B553748/CertImgListServiceV3/getCertImgListServiceV3?serviceKey=${KEY}&returnType=json&pageNo=${no}&numOfRows=${ROWS}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
    const j = await res.json()
    if (!j.body) throw new Error(JSON.stringify(j).slice(0, 200))
    return j.body
  } catch (e) {
    if (attempt >= 5) throw e
    await sleep(5000 * attempt)
    return page(no, attempt + 1)
  }
}

const first = await page(1)
const total = Number(first.totalCount || 0)
const pages = Math.ceil(total / ROWS)
let rows = 0
for (let p = 1; p <= pages; p++) {
  const body = p === 1 ? first : await page(p)
  const out = (body.items || []).map((it) => it.item ?? it)
    .map((x) => ({
      n: String(x.prdlstReportNo || '').trim(),
      m: [x.rawmtrl, x.allergy && !/^\s*(없음|해당\s*없음|-)\s*$/.test(x.allergy) ? x.allergy : ''].filter(Boolean).join(', ')
    }))
    .filter((r) => r.n && r.m)
  rows += out.length
  fs.writeFileSync(path.join(OUT, `haccp-${String(p).padStart(4, '0')}.json`), JSON.stringify(out))
  await sleep(300)
}
console.log(`HACCP 표지정보 ${total.toLocaleString()}건 · ${pages}쪽 · 저장 ${rows.toLocaleString()}행`)
