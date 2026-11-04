/**
 * 영양제 찾기에서 '이것은 의약품입니다' 를 알려 드릴 이름표를 만든다.
 *
 *   node scripts/fetch-medicines.mjs
 *
 * 이름과 회사만 담는다. 효능·용법은 받아도 넣지 않는다 — 이 앱은 의약품을 판정하지 않는다
 * (식약처 회신의 '식생활·영양관리 목적' 범위. docs/법무/회신/).
 *
 * 식약처_의약품개요정보(e약은요, data.go.kr 15075057): 공급실적이 있는 일반의약품.
 * 활용신청 전에는 '등록되지 않은 서비스키' 로 거절되므로, 그때는 손으로 확인한 목록만으로 만든다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, serviceKey } from '../src/lib/env.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const ENDPOINT = 'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList'
const SIZE = 100
const KEY = serviceKey(loadEnv(ROOT).DATA_GO_KR_KEY)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** '(수출명:…)' 은 통에 없는 말이다. 수출 전용 품목은 살 수 없다 */
const cleanName = (s) => String(s ?? '').replace(/[(<]\s*수출명[^)>]*[)>]/g, '').trim()

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
  console.log(`전체 목록을 받지 못해 손으로 확인한 목록만 씁니다: ${e.message}`)
}

const items = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0], 'ko'))
const dest = path.join(ROOT, 'public/data/medicines.json')
fs.writeFileSync(dest, JSON.stringify({ cols: ['name', 'company'], complete, items }))
console.log(`medicines.json ${items.length.toLocaleString()}건 (${complete ? '전체' : '일부'}) · ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`)
