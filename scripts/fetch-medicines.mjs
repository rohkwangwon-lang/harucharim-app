/**
 * 영양제 찾기에서 '이것은 의약품입니다' 를 알려 드릴 이름표를 만든다.
 *
 *   node scripts/fetch-medicines.mjs
 *
 * 이름과 회사만 담는다. 효능·용법은 받아도 넣지 않는다 — 이 앱은 의약품을 판정하지 않는다
 * (식약처 회신의 '식생활·영양관리 목적' 범위. docs/법무/회신/).
 *
 * 식약처_의약품개요정보(e약은요, data.go.kr 15075057): 공급실적이 있는 일반의약품.
 * 2026-11-05 전체 받기 확인. 여기에 없는 품목은 의약품안전나라에서 손으로 확인한 목록(medicines-checked.json)으로 메운다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, serviceKey } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const ENDPOINT = 'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList'
const SIZE = 100
const KEY = serviceKey(loadEnv(ROOT).DATA_GO_KR_KEY)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 통에 없는 말을 덜어 낸다. 수출명은 표기가 제각각이다:
 * '(수출명:…)', '[수출명: …]', '{수출명:…}', '(수출, 군납명:…)', '(성분, 수출명:…)', 괄호 없는 ' 수출명: …',
 * '(싱가폴수출명 : …)', '(군납용 : …)', 수출명 글자 없이 ',다른이름(Name),…' 이 이어지는 것.
 */
function cleanName(raw) {
  let s = String(raw ?? '').replace(/\s+/g, ' ').trim()
  const cut = s.search(/[가-힣]*(수출|군납)/)
  if (cut >= 0) s = s.slice(0, cut)
  s = s.replace(/\),.*$/, ')').replace(/[\s,([{]+$/, '').replace(/>+$/, '').trim()
  const open = (s.match(/\(/g) ?? []).length
  const close = (s.match(/\)/g) ?? []).length
  return open > close ? s + ')' : s
}

async function page(no) {
  const q = new URLSearchParams({ pageNo: String(no), numOfRows: String(SIZE), type: 'json' })
  const res = await fetch(`${ENDPOINT}?serviceKey=${KEY}&${q}`, { signal: AbortSignal.timeout(60000) })
  const text = await res.text()
  if (!res.ok) throw new Error(/NOT_REGISTERED/.test(text) ? '활용신청이 아직 반영되지 않았습니다(15075057)' : `HTTP ${res.status}`)
  return JSON.parse(text)
}

const seen = new Map()
const add = (name, company) => {
  const n = cleanName(name)
  if (n && !/수출용|\(원료\)/.test(String(name))) seen.set(`${n}|${company}`, [n, String(company ?? '').trim()])
}
const checked = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/medicines-checked.json'), 'utf8'))
for (const [n, c] of checked.items) add(n, c)

let complete = false
try {
  const first = await page(1)
  const total = first.body.totalCount
  for (let p = 1; p <= Math.ceil(total / SIZE); p++) {
    const json = p === 1 ? first : await page(p)
    for (const it of json.body.items ?? []) add(it.itemName, it.entpName)
    await sleep(120)
  }
  complete = true
  console.log(`일반의약품 ${total.toLocaleString()}건을 받았습니다.`)
} catch (e) {
  console.log(`전체 목록을 받지 못했습니다: ${e.message}`)
}

const items = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0], 'ko'))
const dest = path.join(ROOT, 'public/data/medicines.json')
/* 받다 끊겼을 때 이미 있는 전체 목록을 일부로 덮어쓰지 않는다 */
if (!complete && fs.existsSync(dest) && JSON.parse(fs.readFileSync(dest, 'utf8')).complete) {
  console.log('있던 전체 목록을 그대로 둡니다.')
  process.exit(1)
}
fs.writeFileSync(dest, JSON.stringify({ cols: ['name', 'company'], complete, items }))
console.log(`medicines.json ${items.length.toLocaleString()}건 (${complete ? '전체' : '일부'}) · ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`)
