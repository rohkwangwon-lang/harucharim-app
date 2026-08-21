/**
 * 수집한 원본(data/raw)을 앱이 쓰는 형태로 변환한다.
 *
 *   node scripts/build-food-db.mjs
 *
 * 출력은 둘로 나눈다.
 *   src/data/foods/generated-core.json  — 음식·품목대표. 번들에 포함해 오프라인 보장
 *   public/data/foods-extended.json     — 상용 가공식품. 최초 실행 때 한 번 내려받아 기기에 저장
 *
 * 임상 태그는 성분값으로 판정할 수 있는 것만 붙인다.
 * '생식'처럼 잘못 붙으면 위험한 태그는 분류가 명확할 때만 허용하고,
 * 나머지는 비워 둔 채 auto 표시를 남겨 수작업 데이터와 구분한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { AMT_MAP, EXTRA_MAP, GROUP_MAP } from './nutrient-map.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data/raw')

const num = (v) => {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * "900.000g" → 900
 *
 * 원본에 1 g 짜리 밀키트처럼 명백히 잘못된 값이 섞여 있다.
 * 그대로 두면 "1회 제공량 1 g · 1 kcal" 같은 무의미한 표시가 나오므로,
 * 사람이 한 번에 먹는 양으로 보기 어려운 값은 버리고 100 g 기준으로 되돌린다.
 */
function parseServing(z) {
  if (!z || z === 'null') return undefined
  const m = String(z).match(/([\d.]+)\s*(g|ml|mL|㎖|㎎)?/)
  if (!m) return undefined
  const n = Number(m[1])
  if (!Number.isFinite(n)) return undefined
  if (n < 5 || n > 3000) return undefined
  return Math.round(n)
}

/** 성분값으로만 판정하는 태그 — 이름 추측이 없어 안전하다 */
function nutrientTags(n, extra) {
  const t = []
  if (n.na >= 600) t.push('고나트륨')
  if (n.sugar >= 15) t.push('고당')
  if (n.fat >= 20) t.push('고지방')
  if (n.satFat >= 5) t.push('포화지방높음')
  if (n.protein >= 15) t.push('고단백')
  if (n.fiber >= 5) t.push('고식이섬유')
  if (n.k >= 300) t.push('고칼륨')
  if (n.p >= 200) t.push('고인')
  if (n.ca >= 150) t.push('고칼슘')
  if (n.fe >= 3) t.push('철분풍부')
  if (n.omega3 >= 1 || extra.epaDha >= 500) t.push('오메가3풍부')
  if (n.vitK >= 100) t.push('고비타민K')
  if (extra.caffeine >= 10) t.push('카페인')
  if (n.kcal >= 300) t.push('고열량밀도')
  return t
}

/**
 * 분류가 확실할 때만 붙이는 태그.
 * 이름에 든 낱말로 추측하면 '오이지'를 '오이'로 보는 식의 오류가 나므로,
 * 대분류가 그 자체로 성질을 규정하는 경우에만 붙인다.
 */
function categoryTags(cat1, name) {
  const t = []
  if (cat1 === '김치류') t.push('발효', '염장', '고나트륨')
  if (cat1 === '젓갈류') t.push('발효', '염장', '고나트륨')
  if (cat1 === '장아찌·절임류') t.push('염장', '고나트륨')
  if (cat1 === '주류') t.push('알코올')
  if (cat1 === '유가공품류') t.push('유당함유')
  if (cat1 === '튀김류') t.push('튀김', '고지방')
  if (cat1 === '차류') t.push('수분보충')
  if (cat1 === '특수용도식품') t.push('부드러움')
  // 이름 판정은 통째로 일치하는 명확한 경우만
  if (/(^|_)(회|육회|물회)$/.test(name) || /_회$/.test(name)) t.push('생식')
  return t
}

const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.json')).sort()
if (files.length === 0) { console.error('data/raw 가 비어 있습니다. 먼저 fetch-nutrition.mjs 를 실행하세요.'); process.exit(1) }
console.log(`원본 ${files.length}개 파일을 읽습니다…`)

const core = []
const extended = []
const catCount = {}
const seen = new Set()
let skippedNoKcal = 0
let skippedDup = 0
let skippedBadValue = 0

for (const f of files) {
  const items = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'))
  for (const it of items) {
    const name = (it.FOOD_NM_KR || '').trim()
    if (!name) continue

    const n = {}
    for (const [src, key] of Object.entries(AMT_MAP)) {
      const v = num(it[src])
      if (v !== undefined) n[key] = v
    }
    const extra = {}
    for (const [src, key] of Object.entries(EXTRA_MAP)) {
      const v = num(it[src])
      if (v !== undefined) extra[key] = v
    }

    /*
     * 물리적으로 불가능한 값은 원본 오류다. 100 g 안에 100 g 넘는 성분이 있을 수 없고,
     * 가장 열량이 높은 순수 지방도 900 kcal 을 넘지 못한다.
     * 이런 자료가 섞이면 "단백질 374 g 보충" 같은 엉뚱한 계산이 나온다.
     */
    const impossible =
      (n.protein ?? 0) > 100 || (n.fat ?? 0) > 100 || (n.carb ?? 0) > 100 ||
      (n.kcal ?? 0) > 900 || (n.na ?? 0) > 40000 ||
      (n.protein ?? 0) < 0 || (n.fat ?? 0) < 0 || (n.carb ?? 0) < 0
    if (impossible) { skippedBadValue++; continue }

    // 에너지가 없거나 사실상 0 인 자료는 계산에 쓸 수 없다.
    // (물·차처럼 진짜 0 인 것은 음료 분류라 따로 살린다.)
    if (n.kcal === undefined) { skippedNoKcal++; continue }
    if (n.kcal <= 1 && (it.FOOD_CAT1_NM || '') !== '음료류' && (it.FOOD_CAT1_NM || '') !== '음료 및 차류' && (it.FOOD_CAT1_NM || '') !== '다류') {
      skippedNoKcal++; continue
    }
    if (n.carb === undefined) n.carb = 0
    if (n.protein === undefined) n.protein = 0
    if (n.fat === undefined) n.fat = 0
    if (n.na === undefined) n.na = 0

    const cat1 = it.FOOD_CAT1_NM || ''
    catCount[cat1] = (catCount[cat1] || 0) + 1

    const isCore = it.DB_GRP_NM === '음식' || it.DB_CLASS_NM === '품목대표'
    // 같은 제품의 용량·포장 변형이 매우 많다. 이름에서 그 부분을 걷어내고 중복을 지운다.
    //   "○○ 초코파이 (12개입, 420g)" → "○○ 초코파이"
    const norm = name
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\d+\s*(g|kg|ml|mL|L|개입|입|매|팩|봉|캔|병)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const dupKey = `${norm}|${it.MAKER_NM || ''}`
    if (seen.has(dupKey)) { skippedDup++; continue }
    seen.add(dupKey)

    const servingG = parseServing(it.Z10500) ?? 100
    const tags = [...new Set([...nutrientTags(n, extra), ...categoryTags(cat1, name)])]
    if (it.DB_GRP_NM === '가공식품') tags.push('초가공식품')

    const rec = {
      id: `kfda-${it.FOOD_CD}`,
      name,
      group: GROUP_MAP[cat1] || '가공식품',
      form: it.DB_GRP_NM === '음식' ? 'dish' : 'processed',
      servingG,
      per100: n,
      tags: [...new Set(tags)],
      auto: true
    }
    if (it.MAKER_NM && it.MAKER_NM !== 'null') rec.maker = it.MAKER_NM
    if (it.ITEM_REPORT_NO) rec.reportNo = it.ITEM_REPORT_NO
    if (extra.iodine !== undefined) rec.iodine = extra.iodine

    ;(isCore ? core : extended).push(rec)
  }
}

console.log('')
console.log(`핵심(음식·품목대표) : ${core.length.toLocaleString()}건`)
console.log(`확장(상용 가공식품) : ${extended.length.toLocaleString()}건`)
console.log(`제외 — 에너지 없음 ${skippedNoKcal.toLocaleString()} · 중복 ${skippedDup.toLocaleString()} · 불가능한 값 ${skippedBadValue.toLocaleString()}`)
console.log('')
console.log('식품 대분류 상위 25 (매핑 확인용):')
for (const [k, v] of Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  const mapped = GROUP_MAP[k]
  console.log(`  ${String(v).padStart(6)}  ${k.padEnd(24)} → ${mapped || '⚠️ 미매핑 → 가공식품'}`)
}

/**
 * 열 이름을 매 건마다 반복하면 용량의 절반이 키 문자열이 된다.
 * 그래서 열 목록을 한 번만 적고 값은 배열로 내보낸다. 로더에서 다시 객체로 편다.
 */
const NUTRIENT_COLS = [
  'kcal','carb','sugar','fiber','protein','fat','satFat','transFat','omega3','chol',
  'na','k','ca','p','mg','fe','zn','se','vitA','vitD','vitE','vitK','vitC',
  'b1','b2','b3','b6','folate','b12'
]

function pack(list) {
  const groups = []
  const tags = []
  const gi = (g) => { let i = groups.indexOf(g); if (i < 0) { groups.push(g); i = groups.length - 1 } return i }
  const ti = (t) => { let i = tags.indexOf(t); if (i < 0) { tags.push(t); i = tags.length - 1 } return i }

  const items = list.map((r) => {
    const vals = NUTRIENT_COLS.map((c) => {
      const v = r.per100[c]
      if (v === undefined) return null
      // 소수점을 줄이면 용량이 눈에 띄게 준다. 임상 판단에 필요한 자릿수는 남긴다.
      return v >= 100 ? Math.round(v) : Math.round(v * 100) / 100
    })
    // 뒤쪽 빈 값은 잘라 낸다
    while (vals.length && vals[vals.length - 1] === null) vals.pop()
    return [
      r.name,
      gi(r.group),
      r.servingG,
      r.tags.map(ti),
      vals,
      r.maker || 0,
      r.reportNo || 0
    ]
  })
  return { cols: NUTRIENT_COLS, groups, tags, items }
}

fs.mkdirSync(path.join(ROOT, 'src/data/foods'), { recursive: true })
fs.mkdirSync(path.join(ROOT, 'public/data'), { recursive: true })

const corePath = path.join(ROOT, 'src/data/foods/generated-core.json')
const extPath = path.join(ROOT, 'public/data/foods-extended.json')
fs.writeFileSync(corePath, JSON.stringify(pack(core)))
fs.writeFileSync(extPath, JSON.stringify(pack(extended)))

const mb = (p) => (fs.statSync(p).size / 1024 / 1024).toFixed(1)
console.log('')
console.log(`generated-core.json  ${mb(corePath)} MB · ${core.length.toLocaleString()}건  (번들 포함)`)
console.log(`foods-extended.json  ${mb(extPath)} MB · ${extended.length.toLocaleString()}건  (최초 1회 내려받음)`)
console.log('')
console.log('gzip 후 예상 크기를 재려면: gzip -c <파일> | wc -c')
