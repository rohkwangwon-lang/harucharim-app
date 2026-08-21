/**
 * 바코드 매핑을 앱이 쓰는 형태로 만든다.
 *
 *   node scripts/build-barcode.mjs
 *
 * 수집한 26만 건을 그대로 넣으면 대부분이 우리 영양 데이터에 없는 제품이라
 * 용량만 차지한다. 그래서 품목보고번호가 실제로 이어지는 것만 남긴다.
 * 이어지지 않는 것도 제품명은 알려 줄 수 있으므로, 이름만 남긴 채 함께 둔다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data/raw-barcode')
const RAW2 = path.join(ROOT, 'data/raw-barcode-i2570')
const EXT = path.join(ROOT, 'public/data/foods-extended.json')
const CORE = path.join(ROOT, 'src/data/foods/generated-core.json')

if (!fs.existsSync(RAW)) { console.error('data/raw-barcode 가 없습니다. fetch-barcode.mjs 를 먼저 실행하세요.'); process.exit(1) }

/** 제품명 비교용 정규화 — 띄어쓰기·괄호·용량 표기를 걷어낸다 */
const normName = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+\s*(g|kg|ml|mL|L|개입|입|매|팩|봉|캔|병)\b/gi, ' ')
    .replace(/[^0-9a-z가-힣]/g, '')
    .trim()

// 우리 영양 데이터의 품목보고번호와 제품명을 모은다.
// 보고번호가 어긋나도 제품명이 같으면 이어붙일 수 있다.
const reportNos = new Set()
const byName = new Map()
for (const f of [EXT, CORE]) {
  if (!fs.existsSync(f)) continue
  const packed = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const row of packed.items) {
    if (row[6]) reportNos.add(String(row[6]))
    const key = normName(row[0])
    if (key.length >= 3 && !byName.has(key)) byName.set(key, String(row[6] || ''))
  }
}
console.log(`영양 데이터: 품목보고번호 ${reportNos.size.toLocaleString()}개 · 제품명 ${byName.size.toLocaleString()}개`)

/** C005 와 I2570 두 표를 함께 읽는다. 서로 겹치지 않는 제품이 있다. */
const sources = []
for (const dir of [RAW, RAW2]) {
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    sources.push(path.join(dir, f))
  }
}
console.log(`원본 ${sources.length}개 파일`)

const out = []
const seen = new Set()
let matched = 0
let nameMatched = 0

/**
 * 원본 바코드 문자열을 정리한다.
 *
 * 손으로 입력된 자료라 이런 것들이 섞여 있다.
 *   '8801047501459ㅐ'          — 한글 자모가 붙음
 *   '8801094 842406'            — 가운데 공백
 *   '8801094123208\n8801094122409' — 한 칸에 두 개
 * 그대로 두면 스캔해도 영영 안 맞는다. 숫자만 남기고, 두 개면 둘로 나눈다.
 */
function cleanCodes(raw) {
  return String(raw)
    .split(/[\n\r,;]+/)
    .map((x) => x.replace(/\D/g, ''))
    .filter((x) => x.length >= 8 && x.length <= 14)
}

for (const f of sources) {
  for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  for (const code of cleanCodes(r.b)) {
    if (seen.has(code)) continue
    seen.add(code)
    let n = String(r.n)
    let linked = reportNos.has(n)
    if (!linked) {
      // 보고번호가 어긋나면 제품명으로 한 번 더 맞춰 본다
      const alt = byName.get(normName(r.p))
      if (alt) { n = alt; linked = true; nameMatched++ }
    }
    // 제품명이 없으면 스캔해도 "이게 뭐다" 를 말해 줄 수 없다. 넣지 않는다.
    const name = String(r.p || '').trim()
    if (!name) continue
    if (linked) matched++
    out.push({ b: code, n, p: name })
  }
  }
}

fs.mkdirSync(path.join(ROOT, 'public/data'), { recursive: true })
const dest = path.join(ROOT, 'public/data/barcodes.json')
fs.writeFileSync(dest, JSON.stringify(out))

const size = fs.statSync(dest).size
console.log(`바코드 ${out.length.toLocaleString()}건`)
console.log(`  영양성분까지 이어짐 ${matched.toLocaleString()}건 (그중 제품명으로 이은 것 ${nameMatched.toLocaleString()}건)`)
console.log(`barcodes.json ${(size / 1024 / 1024).toFixed(1)} MB`)
