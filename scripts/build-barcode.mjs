/**
 * 바코드 매핑을 앱이 쓰는 형태로 만든다.
 *
 *   node scripts/build-barcode.mjs
 *
 * 수집한 26만 건을 그대로 넣으면 대부분이 우리 영양 데이터에 없는 제품이라
 * 용량만 차지한다. 그래서 품목보고번호가 실제로 이어지는 것만 남긴다.
 * 이어지지 않는 것도 제품명은 알려 줄 수 있으므로, 이름만 남긴 채 함께 둔다.
 *
 * 잇는 차례 — 2026-11-04 에 '이름만 같으면 잇기' 를 버렸다.
 *   이름만 같은 바코드의 82 % 가 다른 회사 값을 보여 주고 있었다(바나나우유 푸르밀 → 명품디저트 403 kcal,
 *   멸치액젓 136 건 → 나트륨 0 인 한 회사 값). 번호로 정답을 아는 31,353 건으로 시험하면 크게 다른 값이
 *   현행 21.6 % · 이름+제조사 5.2 % · 같은 회사+이름 포함 9.9 % 였다.
 *     1. 번호 일치                      — 표시 없음. 제 제품의 값
 *     2. 건강기능식품 번호               — 표시 없음. 영양제 표에서 찾는다
 *     3. 'A/B' 처럼 번호가 둘 든 칸의 하나 — lk:'cell'. 제 제품의 값
 *     4. 이름 + 제조사 일치              — lk:'maker'. 그 회사의 행으로 잇는다
 *     5. 같은 회사 + 이름이 서로 포함됨   — lk:'similar'. 화면이 먼저 묻는다
 *   다른 회사 제품에는 잇지 않는다. 원래 번호를 그대로 두면 앱이 제품명만 알려 주고
 *   이름으로 찾아 고르게 한다. 도달률은 31 % → 약 20 % 로 줄지만 틀린 값을 조용히 보이는 것보다 낫다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data/raw-barcode')
const RAW2 = path.join(ROOT, 'data/raw-barcode-i2570')
const EXT = path.join(ROOT, 'public/data/foods-extended.json')

if (!fs.existsSync(RAW)) { console.error('data/raw-barcode 가 없습니다. fetch-barcode.mjs 를 먼저 실행하세요.'); process.exit(1) }

/** 제품명 비교용 정규화 — 띄어쓰기·괄호·용량 표기를 걷어낸다 */
const normName = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+\s*(g|kg|ml|mL|L|개입|입|매|팩|봉|캔|병)\b/gi, ' ')
    .replace(/[^0-9a-z가-힣]/g, '')
    .trim()

/** 제조사 비교용 — 법인 표기·공장 이름을 걷어내고, 이름이 바뀐 회사는 하나로 묶는다 */
function normMaker(raw) {
  let t = String(raw || '').normalize('NFKC').toLowerCase()
  if (!t || t === '0' || t === 'null') return ''
  t = t.split('/')[0]
  t = t.replace(/f\s*&\s*b|f\s*and\s*b/g, '에프앤비').replace(/롯데제과|롯데푸드|롯데웰푸드/g, '롯데웰푸드')
  t = t.replace(/\([^)]*\)|㈜|주식회사|유한회사|합자회사|합명회사|농업회사법인|어업회사법인|영농조합법인|사단법인|재단법인|협동조합|유한책임회사/g, ' ')
  t = t.replace(/\s+\S*(공장|지점|지사|사업장|영업소|센터|본점|본사|분사)\s*$/g, ' ')
  t = t.replace(/(제?\d*공장|본점|본사)$/g, '')
  return t.replace(/[^0-9a-z가-힣]/g, '')
}
function sameMaker(a, b) {
  const x = normMaker(a), y = normMaker(b)
  if (!x || !y) return false
  if (x === y) return true
  const [short, long] = x.length < y.length ? [x, y] : [y, x]
  return short.length >= 3 && long.includes(short)
}
/** 품목보고번호 앞 11 자리(연도+업소 인허가번호)는 만든 업소를 가리킨다 */
const licence = (no) => (/^\d{12,}$/.test(String(no)) ? String(no).slice(0, 11) : '')
const cellNos = (cell) => String(cell).split('/').map((x) => x.trim()).filter(Boolean)

/*
 * 영양 자료를 모은다. 앱은 내려받는 표(foods-extended)의 번호 칸으로만 값을 찾으므로 그 표만 본다.
 * (예전에는 앱에 든 기본 표의 번호로도 이어 87 건이 '이어졌는데 값이 안 나오는' 상태였다.)
 */
const rows = JSON.parse(fs.readFileSync(EXT, 'utf8')).items
const reportNos = new Set()
/** 번호 → 앱이 그 번호로 처음 만나는 행. 한 번호에 여러 행이면 앱은 이 행을 보여 준다 */
const firstRowOf = new Map()
/** 'A/B' 칸의 각 번호 → 칸 전체 */
const cellOf = new Map()
const rowsByName = new Map()
const rowsByMaker = new Map()
const rowsByLicence = new Map()
const keys = rows.map((row) => normName(row[0]))
const pushTo = (m, k, i) => { if (!m.has(k)) m.set(k, []); m.get(k).push(i) }
rows.forEach((row, i) => {
  const rn = String(row[6] || '')
  if (!rn) return
  reportNos.add(rn)
  if (firstRowOf.has(rn)) return // 앱이 보여 주지 않는 행으로는 잇지 않는다
  firstRowOf.set(rn, i)
  const nos = cellNos(rn)
  // 번호가 둘 든 칸, 그리고 뒤에 탭이 붙은 칸('19980476015263\t')은 그대로 견주면 안 맞는다
  if (nos.length > 1 || nos[0] !== rn) for (const no of nos) if (!cellOf.has(no)) cellOf.set(no, rn)
  if (keys[i].length >= 3) pushTo(rowsByName, keys[i], i)
  const m = normMaker(row[5])
  if (m) pushTo(rowsByMaker, m, i)
  for (const l of new Set(nos.map(licence).filter(Boolean))) pushTo(rowsByLicence, l, i)
})
console.log(`영양 데이터: 품목보고번호 ${reportNos.size.toLocaleString()}개 · 제품명 ${rowsByName.size.toLocaleString()}개`)

/** 이 행이 바코드 등록과 같은 회사의 것인가 */
function ownRow(i, r) {
  const row = rows[i]
  const l = licence(r.n)
  if (l && cellNos(row[6]).some((no) => licence(no) === l)) return true
  return sameMaker(r.c, row[5])
}

/** 같은 회사의 행 가운데 이름이 서로 포함되는 것 — 길이가 가장 가까운 것을 고른다 */
function similarRow(r) {
  const key = normName(r.p)
  if (key.length < 5) return undefined
  const pool = new Set(rowsByLicence.get(licence(r.n)) || [])
  for (const i of rowsByMaker.get(normMaker(r.c)) || []) pool.add(i)
  let best
  for (const i of pool) {
    const k = keys[i]
    if (k.length < 5 || !(k.includes(key) || key.includes(k))) continue
    if (best === undefined || Math.abs(k.length - key.length) < Math.abs(keys[best].length - key.length)) best = i
  }
  return best
}

/** 이름의 괄호 안 — 맛·등급·포장을 가르는 말이 여기 든다 */
const paren = (name) => (String(name).match(/\(([^)]*)\)/g) || []).join('').toLowerCase().replace(/[^0-9a-z가-힣]/g, '')

/** 이 등록을 어떤 번호로, 어떤 근거로 이을지 정한다 */
function linkOf(r) {
  const no = String(r.n)
  if (reportNos.has(no) || suppNos.has(no)) return { n: no }
  if (cellOf.has(no)) return { n: cellOf.get(no), lk: 'cell' }
  const own = (rowsByName.get(normName(r.p)) || []).filter((i) => ownRow(i, r))
  if (own.length) {
    /*
     * 비교 이름은 괄호를 걷어내므로 오복간장(청표)와 오복간장(금표)가 같아진다.
     * 괄호 안이 양쪽 다 있는데 다르면 다른 제품일 수 있으니 묻는 쪽으로 보낸다.
     */
    const note = paren(r.p)
    const same = own.find((i) => paren(rows[i][0]) === note) ?? own.find((i) => !note || !paren(rows[i][0]))
    if (same !== undefined) return { n: String(rows[same][6]), lk: 'maker' }
    return { n: String(rows[own[0]][6]), lk: 'similar' }
  }
  const near = similarRow(r)
  if (near !== undefined) return { n: String(rows[near][6]), lk: 'similar' }
  return { n: no }
}

/*
 * 건강기능식품 신고번호. 이 번호가 있으면 이미 제 제품을 가리키므로 이름으로 다시 잇지 않는다.
 * 예전에는 세노비스 마그네슘(서흥)의 바코드가 이름이 같은 다른 '마그네슘' 식품 번호로 바뀌어,
 * 찍어도 영양제에서 찾지 못했다(2026-11-04 사용자 보고).
 */
const suppNos = new Set(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/supplements-extended.json'), 'utf8')).items.map((x) => String(x[3]))
)

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
/** 바코드 → 지금까지 고른 후보 */
const chosen = new Map()
let matched = 0
let expiredDropped = 0

const TODAY = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))

/**
 * 이 등록이 아직 살아 있는가.
 *
 * 이 표에는 끝난 등록이 그대로 남아 있다. 바코드는 제품이 단종되면
 * 몇 해 뒤 다른 제품에 다시 쓰이기 때문에, 끝난 등록을 그대로 두면
 * 지금 파는 물건을 찍었는데 예전 물건이 나온다.
 * 실제로 펩시 제로를 찍었더니 1993 년에 등록된 헤이루사과사이다가 나왔다.
 */
function alive(r) {
  const end = Number(String(r.e || '').replace(/\D/g, '')) || 0
  const closed = Number(String(r.x || '').replace(/\D/g, '')) || 0
  if (end && end < TODAY) return false      // 유효기간이 지났다
  if (closed && closed < TODAY) return false // 업체가 문을 닫았다
  return true
}

/** 허가일자 — 같은 바코드에 여러 등록이 있으면 최근 것을 쓴다 */
function issued(r) {
  return Number(String(r.d || '').replace(/\D/g, '')) || 0
}

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
    /*
     * 예전에는 먼저 만난 것을 쓰고 나머지를 버렸다. 그래서 같은 바코드에
     * 끝난 등록과 살아 있는 등록이 같이 있으면 순서에 따라 엉뚱한 것이 뽑혔다.
     * 이제는 살아 있는 것을 우선하고, 그중에서도 최근에 허가된 것을 고른다.
     */
    const prev = chosen.get(code)
    if (prev) {
      const better =
        (alive(r) ? 1 : 0) - (alive(prev.raw) ? 1 : 0) ||
        issued(r) - issued(prev.raw)
      if (better <= 0) continue
    }
    // 제품명이 없으면 스캔해도 "이게 뭐다" 를 말해 줄 수 없다. 넣지 않는다.
    const name = String(r.p || '').trim()
    if (!name) continue
    chosen.set(code, { raw: r, name })
  }
  }
}

/* 잇는 일은 바코드마다 등록을 고른 뒤에 한다. 도중에 세면 덮어쓴 후보까지 들어가 숫자가 부푼다. */
const tally = { number: 0, supp: 0, cell: 0, maker: 0, similar: 0, none: 0 }
for (const [code, { raw: r, name }] of chosen) {
  const { n, lk } = linkOf(r)
  const kind = lk || (reportNos.has(n) ? 'number' : suppNos.has(n) ? 'supp' : 'none')
  tally[kind]++
  const old = !alive(r)
  if (old) expiredDropped++
  /* 값을 자동으로 보여 줘도 되는 것만 센다 — 'similar' 는 화면이 먼저 묻는다 */
  if (!old && reportNos.has(n) && lk !== 'similar') matched++
  /* 이름으로 이은 것은 원래 번호(o)와 회사(c)를 남긴다. 화면이 회사를 말하고, 검사가 다시 견준다 */
  const named = lk === 'maker' || lk === 'similar'
  out.push({ b: code, n, p: name, ...(old ? { old: 1 } : {}), ...(lk ? { lk } : {}), ...(named ? { o: String(r.n), c: String(r.c || '').trim() } : {}) })
}

fs.mkdirSync(path.join(ROOT, 'public/data'), { recursive: true })
const dest = path.join(ROOT, 'public/data/barcodes.json')
fs.writeFileSync(dest, JSON.stringify(out))

const size = fs.statSync(dest).size
console.log(`바코드 ${out.length.toLocaleString()}건`)
console.log(`  그중 등록이 끝난 것 ${expiredDropped.toLocaleString()}건 — 표시는 하되 '옛 등록'으로 알린다`)
console.log(`  살아 있는 등록 중 값을 바로 보여 주는 것 ${matched.toLocaleString()}건`)
console.log(`  잇기 근거 — 번호 ${tally.number.toLocaleString()} · 번호 칸 나눔 ${tally.cell.toLocaleString()} · 이름+제조사 ${tally.maker.toLocaleString()} · 같은 회사 비슷한 이름(확인 후) ${tally.similar.toLocaleString()} · 건강기능식품 ${tally.supp.toLocaleString()} · 제품명만 ${tally.none.toLocaleString()}`)
console.log(`barcodes.json ${(size / 1024 / 1024).toFixed(1)} MB`)
