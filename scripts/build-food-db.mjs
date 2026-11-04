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

/*
 * 원자료의 숫자 칸은 문자열이고 천 단위에 쉼표가 든다('1,315.000').
 * 쉼표를 떼지 않으면 숫자가 아닌 값이 되어 '값 없음' 으로 빠진다. 그래서 2026-11-04 까지 나트륨 1,000 mg/100 g
 * 이상이 전부 사라져 소금·간장·액젓의 나트륨이 '정보 없음' 이었고 고나트륨 경고도 함께 빠졌다(확장 20,030행·핵심 372행).
 * 가장 짠 식품일수록 값이 없어지는 오류였다.
 */
const num = (v) => {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

/*
 * 믿기 어려운 나트륨 값 — 값을 추정해 고치지 않고 '모름' 으로 둔다(2026-11-04).
 *
 * '주식회사 기림' 멸치액젓은 원자료부터 0.00 이고, 같은 분류의 중앙값은 수천 mg 이다. 0 으로 두면 하루 합계에
 * 아무 말 없이 0 으로 더해지지만, 비워 두면 '합계에 잡히지 않았습니다' 라고 밝힌다.
 * 원 제품의 표시를 보지 못했으니 참값은 모른다. g 으로 잘못 적었으리라는 짐작(새우젓 8)으로 고쳐 쓰지 않는다.
 *
 * 문턱은 임상 기준이 아니라 **이 자료에서 뽑은 값**이다 — 쉼표를 뗀 뒤 그 분류 중앙값의 10 %.
 * 분류는 이름이 아니라 원자료의 FOOD_REF_NM 으로 본다. 이름으로 보면 '간장제외' 밀키트·깨소금·소금빵이 걸린다.
 *
 *   SALT_FLOOR_SURE — 소금 없이 만들 수 없는 것. 비우고 고나트륨도 붙인다
 *   SALT_FLOOR_SOFT — 덜 짜게 담근 것이 실제로 있을 수 있는 것. 비우기만 한다(틀려도 '정보 없음' 으로 보일 뿐이다)
 *
 * 모든 짠 분류로 넓히면 쌀밥·곤약밥·발사믹까지 걸려 약 70 % 가 헛경보였다. 그래서 이 표 밖으로 넓히지 않는다.
 */
const SALT_FLOOR_SURE = {
  '장류/간장': 601, '장류/된장': 410, '장류/고추장': 240, '장류/혼합장': 264, '장류/춘장': 389,
  '수산가공식품류/젓갈/액젓': 164, '조미식품/소금': 1650
}
const SALT_FLOOR_SOFT = {
  '절임류 또는 조림류/배추김치': 59, '절임류 또는 조림류/기타김치': 60, '절임류 또는 조림류/물김치': 47,
  '절임류 또는 조림류/김칫속': 94, '절임류 또는 조림류/단무지/피클': 56, '절임류 또는 조림류/장아찌': 82
}
/* 분류는 그렇게 적혀 있어도 그 음식이 아닌 것, 설탕에 절여 실제로 낮을 법한 것 — 값을 그대로 둔다 */
const NOT_SALTED_FOOD = /매실|낫또|숙성회|고명|된장국|육수|올리브절임|메주가루|키트|전복내장/
/* 다른 분류에 든 액젓 — 행님아 까나리액젓은 '기타 소스류' 에 있고 336 mg 이다. 액젓 중앙값은 8,000 mg 이다 */
const FISH_SAUCE_NAME = /(액젓|어간장)$/

/** @returns {'ok'|'unknown'|'unknown-salty'} */
function judgeSodium(na, cat1, ref, name) {
  if (na === undefined) return 'ok'
  if (FISH_SAUCE_NAME.test(name) && na < 500) return 'unknown-salty'
  const key = `${cat1}/${ref}`
  if (na < (SALT_FLOOR_SURE[key] ?? 0) && !NOT_SALTED_FOOD.test(name)) return 'unknown-salty'
  if (na < (SALT_FLOOR_SOFT[key] ?? 0) && !NOT_SALTED_FOOD.test(name)) return 'unknown'
  return 'ok'
}

/*
 * 쉼표를 뗀 뒤 나트륨 외 칸에서 드러난 믿을 수 없는 값 — 칸만 비운다(2026-11-04).
 *
 * 쉼표로 되살아난 약 1,400 칸을 한 줄씩 보니 대부분 진짜 값이었다. 말린 고춧잎 비타민 K 8,702 µg,
 * 말린 다시마 칼륨 7,500 mg, 달걀노른자 가루 콜레스테롤 2,295 mg, 영양제형 제품의 비타민 D·B12 같은 것이다.
 * 그래서 칼륨·칼슘·인·콜레스테롤·비타민 K 는 자르지 않는다. 제한식을 하는 분께 빠뜨리는 쪽이 더 위험하다.
 * 아래 15 칸만 있을 수 없거나 단위 착각이 분명하다.
 *   vitC, omega3 — 100 g 안에 100 g 을 넘는다(비타민C3000 커큐민 117,453 mg, 정어리통조림 오메가3 1,150 g,
 *                  락토소이 두유 오메가3 225~273 g — 이 3 행은 쉼표와 상관없이 전부터 들어 있던 값이다)
 *   b1 — 아기 쌀과자에 100 g 당 15~18 g(아이배냇 4 행)
 *   b2, b3 — 쉐이크의 B2 2,205 mg, 효소 제품의 니아신 19,822 mg
 *   vitA — 100 g 당 레티놀 100 mg 을 넘는 4 행. 다이어트 식품 346,231 µg 처럼 원료 수준이다
 * 참값을 모르므로 고쳐 쓰지 않고 '정보 없음' 으로 둔다.
 */
const MICRO_LIMIT = { vitC: 100000, omega3: 100, b1: 5000, b2: 1000, b3: 10000, vitA: 100000 }
let microBlanked = 0

/**
 * "900.000g" → 900
 *
 * 원본에 1 g 짜리 밀키트처럼 명백히 잘못된 값이 섞여 있다.
 * 그대로 두면 "1회 제공량 1 g · 1 kcal" 같은 무의미한 표시가 나오므로,
 * 사람이 한 번에 먹는 양으로 보기 어려운 값은 버리고 100 g 기준으로 되돌린다.
 */
function parseServing(z) {
  if (!z || z === 'null') return undefined
  /*
   * '5,000.000g' 을 쉼표 앞에서 잘라 5 g 으로 읽고 있었다(9,948행). 5 kg 포장이 '1회 5 g' 이 되어 나트륨이 적게 잡혔다.
   * 이 칸은 명세상 1회 제공량이 아니라 '식품중량' — 포장 무게다. 1 kg 을 넘는 포장은 한 번 먹는 양일 수 없다.
   */
  if (String(z).includes(',')) return undefined
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
const naUnreliable = { over: 0, sure: 0, soft: 0, capped: 0 }

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
     * 나트륨이 순수 소금(약 39,340 mg/100 g)을 넘는 행 — 쉼표를 고치자 둘이 드러났다(사천짜차이 47,300 · 소금꽃 40,626).
     * 행을 빼면 안 된다. 앱은 '몇 번째 행' 으로 음식을 찾으므로(kx-·kf-) 빼면 뒤 번호가 모두 밀려,
     * 저장된 기록과 이어 둔 바코드가 엉뚱한 음식을 가리킨다. 나트륨만 비우고 짠 식품으로 표시한다.
     */
    const naOver = (n.na ?? 0) > 40000
    if (naOver) delete n.na

    for (const [key, limit] of Object.entries(MICRO_LIMIT)) {
      if ((n[key] ?? 0) > limit) { delete n[key]; microBlanked++ }
    }

    /*
     * 물리적으로 불가능한 값은 원본 오류다. 100 g 안에 100 g 넘는 성분이 있을 수 없고,
     * 가장 열량이 높은 순수 지방도 900 kcal 을 넘지 못한다.
     * 이런 자료가 섞이면 "단백질 374 g 보충" 같은 엉뚱한 계산이 나온다.
     */
    const has = (v) => typeof v === 'number'
    const impossible =
      (n.protein ?? 0) > 100 || (n.fat ?? 0) > 100 || (n.carb ?? 0) > 100 ||
      (n.kcal ?? 0) > 900 ||
      (n.protein ?? 0) < 0 || (n.fat ?? 0) < 0 || (n.carb ?? 0) < 0 ||
      /*
       * 성분끼리 앞뒤가 안 맞는 자료도 버린다.
       * 100 g 안에 107 g 이 들어 있다거나(휘낭시에), 탄수화물 7 g 인데
       * 당류가 104 g 이라거나(말차 라떼), 지방 0 g 인데 포화지방이 0.6 g 인 것들이다.
       * 어느 쪽이 맞는지 알 수 없으니 고쳐 쓸 수 없다.
       * 이런 자료로 계산하면 "당류 104 g" 같은 숫자를 환자에게 보여 주게 된다.
       */
      (has(n.carb) && has(n.protein) && has(n.fat) && n.carb + n.protein + n.fat > 101) ||
      (has(n.sugar) && has(n.carb) && n.sugar > n.carb + 0.5) ||
      (has(n.satFat) && has(n.fat) && n.satFat > n.fat + 0.5)
    if (impossible) { skippedBadValue++; continue }

    /*
     * 표기 열량과 다량영양소가 서로 두 배 넘게 어긋나는 자료도 버린다.
     * "대구, 삶은것"의 단백질이 75.9 g/100 g 으로 적혀 있는 식이다 — 실제로는 20 g 대다.
     * 술은 알코올이 g 당 7 kcal 을 내므로 다량영양소만으로 설명되지 않는다. 여기서 뺀다.
     */
    const isAlcohol = (it.FOOD_CAT1_NM || '') === '주류'
    if (!isAlcohol && has(n.carb) && has(n.protein) && has(n.fat) && n.kcal > 40) {
      const calc = n.carb * 4 + n.protein * 4 + n.fat * 9
      if (calc > 0 && (n.kcal > calc * 2.2 || n.kcal < calc * 0.45)) { skippedBadValue++; continue }
    }

    // 에너지가 없거나 사실상 0 인 자료는 계산에 쓸 수 없다.
    // (물·차처럼 진짜 0 인 것은 음료 분류라 따로 살린다.)
    if (n.kcal === undefined) { skippedNoKcal++; continue }
    if (n.kcal <= 1 && (it.FOOD_CAT1_NM || '') !== '음료류' && (it.FOOD_CAT1_NM || '') !== '음료 및 차류' && (it.FOOD_CAT1_NM || '') !== '다류') {
      skippedNoKcal++; continue
    }
    /*
     * 값이 없는 성분을 0 으로 채우지 않는다.
     *
     * 예전에는 빠진 값을 0 으로 메웠다. 그 결과 148 kcal 짜리 리조또가
     * "탄수화물 0 g · 지방 0 g" 으로 표시됐다. 자동 수집분 17,899 종 가운데
     * 9,733 종이 그런 상태였다 — 절반이 넘는다.
     *
     * 원본이 그 성분을 아예 신고하지 않은 것이지, 들어 있지 않다는 뜻이 아니다.
     * 특히 나트륨을 0 으로 채우면 하루 합계에서 통째로 빠져 상한 판정이 어긋난다.
     * 모르는 값은 모른다고 두고, 화면에서 '정보 없음'으로 밝힌다.
     */

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

    /*
     * 장류·조미료·젓갈은 포장 무게를 1회량으로 삼지 않는다. 간장 900 mL 가 '1회' 면 나트륨이 수만 mg 으로 찍힌다.
     * 100 g 으로 묶을 뿐 실제 한 번 드시는 양은 아니다 — 식약처 1회 섭취참고량(간장 5 mL 등)을 쓰면
     * 간장·고추장이 1회 400 mg 아래로 내려가 고나트륨 경고가 꺼지므로, 그 판단은 따로 정한다.
     */
    let servingG = parseServing(it.Z10500) ?? 100
    const isSeasoning = ['장류', '조미식품', '조미료류', '젓갈류'].includes(cat1) || (it.FOOD_REF_NM || '') === '젓갈/액젓' ||
      /(액젓|어간장|새우젓)$/.test(name) // 분류가 '절임식품' 으로 적힌 새우젓 500 g 이 1회 40,000 mg 으로 찍혔다
    if (isSeasoning && servingG > 100) { servingG = 100; naUnreliable.capped++ }

    const naVerdict = naOver ? 'unknown-salty' : judgeSodium(n.na, cat1, it.FOOD_REF_NM || '', name)
    if (naOver) naUnreliable.over++
    else if (naVerdict === 'unknown-salty') naUnreliable.sure++
    else if (naVerdict === 'unknown') naUnreliable.soft++
    if (naVerdict !== 'ok') delete n.na

    const tags = [...new Set([...nutrientTags(n, extra), ...categoryTags(cat1, name)])]
    if (naVerdict === 'unknown-salty') tags.push('고나트륨')
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
console.log(`믿을 수 없어 비운 나트륨 외 칸 ${microBlanked}`)
console.log(`나트륨 비움 — 소금보다 짬 ${naUnreliable.over} · 짠 식품인데 믿기 어려움 ${naUnreliable.sure} · 김치·절임 ${naUnreliable.soft} / 조미료 1회량 묶음 ${naUnreliable.capped.toLocaleString()}`)
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
