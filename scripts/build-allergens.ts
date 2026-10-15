/**
 * 원재료로 찾은 알레르기 색인 만들기 — 알레르기 2단계(2026-10-15).
 *
 *   node scripts/fetch-rawmtrl.mjs                       # C002 원재료를 data/raw-rawmtrl/ 로
 *   node_modules/.bin/jiti scripts/build-allergens.ts    # → public/data/allergens.json
 *
 * 앱에 있는 가공식품(기본 + 내려받는 것)과 바코드 제품의 품목보고번호만 남긴다 — 108만 건을 다 실을 이유가 없다.
 * 값은 알레르기 19항목의 비트(data/allergens.ts 의 ALLERGENS 차례). 0 은 "원재료를 보았는데 찾지 못함" 이다
 * (원재료를 못 받은 제품과 구별하려고 남긴다).
 */
import fs from 'node:fs'
import path from 'node:path'
import { ALLERGENS, allergenMaskOfIngredients } from '../src/data/allergens'
import { FOODS } from '../src/data/foods'

const ROOT = path.resolve(__dirname, '..')
const RAW = path.join(ROOT, 'data/raw-rawmtrl')
const OUT = path.join(ROOT, 'public/data/allergens.json')

/* 앱이 아는 품목보고번호 */
const want = new Set<string>()
for (const f of FOODS) if (f.reportNo) want.add(f.reportNo)
const ext = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/foods-extended.json'), 'utf8')) as { items: unknown[][] }
for (const r of ext.items) if (r[6]) want.add(String(r[6]))
const codes = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/barcodes.json'), 'utf8')) as { n?: string }[]
for (const c of codes) if (c.n) want.add(String(c.n))

const map = new Map<string, number>()
let rows = 0
const pages = fs.readdirSync(RAW).filter((f) => f.endsWith('.json')).sort()
for (const f of pages) {
  for (const r of JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')) as { n: string; m: string }[]) {
    rows++
    if (!want.has(r.n)) continue
    map.set(r.n, (map.get(r.n) ?? 0) | allergenMaskOfIngredients(r.m))
  }
}

const hit = [...map.values()]
const per = ALLERGENS.map((a, i) => `${a} ${hit.filter((m) => m & (1 << i)).length.toLocaleString()}`)
fs.writeFileSync(OUT, JSON.stringify({
  v: 1,
  names: ALLERGENS,
  source: '식품안전나라 C002 품목제조보고(원재료)',
  built: new Date().toISOString().slice(0, 10),
  pages: pages.length,
  map: Object.fromEntries(map)
}))
console.log(`원재료 ${rows.toLocaleString()}행(${pages.length}쪽) · 앱이 아는 품목보고번호 ${want.size.toLocaleString()} 가운데 원재료 확인 ${map.size.toLocaleString()} (${(map.size / want.size * 100).toFixed(1)} %)`)
console.log(`알레르기가 하나라도 보인 제품 ${hit.filter((m) => m).length.toLocaleString()}`)
console.log('항목별: ' + per.join(' · '))
console.log(`→ ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`)
