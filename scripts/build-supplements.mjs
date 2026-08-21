/**
 * 건강기능식품 원본을 앱이 쓰는 형태로 만든다.
 *
 *   node scripts/build-supplements.mjs
 *
 * 4만 5천 건을 그대로 넣으면 번들이 감당하지 못한다.
 * 제품명·업체·기능성만 남기고 눌러서 담고, 임상 판단은 앱에서 원료 규칙으로 붙인다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data/raw-supplement')

/** 기능성 문구가 길어 앞부분만 남긴다. 표시와 분류에는 충분하다. */
const trimFn = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)

const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.json')).sort()
const rows = []
const seen = new Set()
let skipped = 0

for (const f of files) {
  for (const it of JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'))) {
    const name = String(it.PRDUCT ?? '').trim()
    const maker = String(it.ENTRPS ?? '').trim()
    if (!name) { skipped++; continue }

    // 같은 업체의 같은 제품명은 한 번만
    const key = `${name}|${maker}`
    if (seen.has(key)) { skipped++; continue }
    seen.add(key)

    rows.push([
      name,
      maker,
      trimFn(it.MAIN_FNCTN),
      String(it.STTEMNT_NO ?? ''),
      String(it.SRV_USE ?? '').replace(/\s+/g, ' ').slice(0, 60)
    ])
  }
}

fs.mkdirSync(path.join(ROOT, 'public/data'), { recursive: true })
const dest = path.join(ROOT, 'public/data/supplements-extended.json')
fs.writeFileSync(dest, JSON.stringify({ cols: ['name', 'maker', 'fn', 'no', 'use'], items: rows }))

const size = fs.statSync(dest).size
console.log(`건강기능식품 ${rows.length.toLocaleString()}건 (중복·이름없음 ${skipped.toLocaleString()}건 제외)`)
console.log(`supplements-extended.json ${(size / 1024 / 1024).toFixed(1)} MB`)
