/**
 * 원재료로 찾은 알레르기 색인 만들기 — 알레르기 2단계(2026-10-15).
 *
 *   node scripts/fetch-rawmtrl.mjs                       # C002 원재료를 data/raw-rawmtrl/ 로(API — 시간당 100회 한도, 약 11시간)
 *   또는 식품안전나라에서 C002 전체를 CSV 로 내려받아 data/raw-rawmtrl-csv/ 에 50,000행씩 JSON 으로 나눠 둔다(2026-10-15 이렇게 완성)
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
/*
 * 읽는 차례가 곧 우선순위다 — 뒤에 읽은 것이 앞의 것을 덮는다(원재료가 바뀌어 알레르기가 빠진 제품도 따라가게).
 * API 일부(raw-rawmtrl) → 전체 CSV(raw-rawmtrl-csv) → 매주 증분(raw-rawmtrl-inc, 날짜 차례).
 * HACCP 표지정보(raw-haccp)는 마지막에 '더하기' 로만 읽는다 — 그 알레르기 칸은 제조사가 적는 것이라 빠뜨린 경우가 있어,
 * 덮어쓰면 원재료로 찾은 것을 지우게 된다.
 */
const RAWS = [path.join(ROOT, 'data/raw-rawmtrl'), path.join(ROOT, 'data/raw-rawmtrl-csv'), path.join(ROOT, 'data/raw-rawmtrl-inc'), path.join(ROOT, 'data/raw-haccp')].filter((d) => fs.existsSync(d))
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
const pages = RAWS.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(d, f)))
for (const f of pages) {
  /* 한 파일 안에서는 합치고(한 제품이 여러 줄일 수 있다), 파일 사이에서는 뒤의 것이 덮는다 */
  const here = new Map<string, number>()
  for (const r of JSON.parse(fs.readFileSync(f, 'utf8')) as { n: string; m: string }[]) {
    rows++
    if (!want.has(r.n)) continue
    here.set(r.n, (here.get(r.n) ?? 0) | allergenMaskOfIngredients(r.m))
  }
  const additive = path.basename(path.dirname(f)) === 'raw-haccp'
  for (const [n, m] of here) map.set(n, additive ? (map.get(n) ?? 0) | m : m)
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
