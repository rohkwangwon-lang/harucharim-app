/**
 * 나트륨 값이 살아 있는가(2026-11-04).
 *
 * 원자료의 '1,315.000' 을 숫자로 읽지 못해 100 g당 1,000 mg 이상이 전부 빈 값이 되어 있었다.
 * 소금·간장·액젓의 나트륨이 '정보 없음' 이었고 고나트륨 경고도 함께 빠졌다. 일반 환자에게 멸치볶음이 '권장' 으로 나왔다.
 * safety.ts 의 고나트륨 검사는 값이 있는 행만 보았으므로 이 오류를 보지 못했다. 그래서 '값이 있어야 한다' 를 따로 지킨다.
 *
 * 기대값은 빌드 코드를 불러 만들지 않는다. 실제 자료에서 눈으로 골라 손으로 적었다.
 * 원자료를 새로 받으면 행 수와 제품이 달라질 수 있다 — 그때는 이 표를 다시 보고 고친다.
 */
import fs from 'node:fs'
import { rowToFood, GENERATED_CORE, type PackedFoods } from '../../src/data/foods/generated'
import { evaluateFood } from '../../src/engine/rules'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { Food, PatientContext } from '../../src/data/types'

const bads: string[] = []
const no = (cond: boolean, msg: string) => { if (cond) bads.push(msg) }

const ext = JSON.parse(fs.readFileSync(new URL('../../public/data/foods-extended.json', import.meta.url), 'utf8')) as PackedFoods
const EXT: Food[] = ext.items.map((r, i) => rowToFood(r, ext, `kx-${i}`))
const P = (o: Partial<PatientContext>): PatientContext => ({ ...DEFAULT_PATIENT, onboarded: true, cuisines: ['한식'], ...o } as PatientContext)
const isSalty = (f: Food) => f.tags.includes('고나트륨' as never)
const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]

/* ── 1. 행 번호를 지킨다 ───────────────────────────────
 * 앱은 '몇 번째 행' 으로 음식을 찾는다. 행이 빠지면 저장된 기록과 이어 둔 바코드가 엉뚱한 음식을 가리킨다.
 * 사천짜차이와 소금꽃은 4만 mg 을 넘어 빠질 뻔한 행이다.
 */
no(ext.items.length !== 273080, `확장 자료 행 수가 ${ext.items.length} — 273,080 이어야 한다(행 번호가 밀린다)`)
no(GENERATED_CORE.length !== 17756, `핵심 자료 행 수가 ${GENERATED_CORE.length} — 17,756 이어야 한다`)

/* ── 2. 짠 식품의 값이 살아 있다 ───────────────────────── */
const naOf = (list: Food[], re: RegExp) => list.filter((f) => re.test(f.name) && typeof f.per100.na === 'number').map((f) => f.per100.na as number)
const FLOORS: [RegExp, number, string][] = [
  [/(양조간장|진간장|국간장)$/, 3000, '간장'],
  [/된장$/, 2000, '된장'],
  [/고추장$/, 1000, '고추장'],
  [/액젓$/, 5000, '액젓'],
  [/새우젓$/, 4000, '새우젓']
]
for (const [re, floor, label] of FLOORS) {
  const v = naOf(EXT, re)
  no(v.length < 20, `${label}: 나트륨 값이 있는 행이 ${v.length}개뿐이다`)
  if (v.length) no(median(v) < floor, `${label}: 나트륨 중앙값 ${median(v)} mg/100 g — ${floor} 이상이어야 한다`)
}
/* 27만 건을 Math.max(...) 에 펼치면 호출 스택이 넘친다 */
const maxOf = (list: Food[], pick: (f: Food) => number | undefined) => list.reduce((m, f) => Math.max(m, pick(f) ?? 0), 0)
const naMax = maxOf(EXT, (f) => f.per100.na)
no(naMax < 20000, `확장 자료 나트륨 최댓값이 ${naMax} — 쉼표를 다시 못 읽는 것일 수 있다`)
const empty = EXT.filter((f) => f.per100.na === undefined).length
no(empty > 500, `확장 자료 나트륨 빈 값이 ${empty}행 — 500 이하여야 한다(오류 당시 20,093)`)

/* ── 3. 다른 성분도 쉼표를 읽는다 — 칼륨은 신기능저하, 비타민 K 는 와파린 판정에 쓰인다 ── */
no(maxOf(EXT, (f) => f.per100.k) < 1000, '확장 자료 칼륨이 1,000 을 넘지 못한다 — 쉼표 오류')
no(maxOf(GENERATED_CORE, (f) => f.per100.vitK) < 1000, '핵심 자료 비타민 K 가 1,000 을 넘지 못한다 — 쉼표 오류')

/* ── 4. 손으로 고른 행 ─────────────────────────────── */
const find = (name: string, maker: string) => EXT.find((f) => f.name === name && (f.maker ?? '').includes(maker))

/* 믿기 어려운 값은 비우고 짠 식품으로 표시한다 */
const UNKNOWN_SALTY: [string, string][] = [
  ['멸치액젓', '기림'], ['까나리액젓', '기림'], ['까나리액젓', '대천항'], ['행님아까나리액젓', '비비에프'],
  ['새우젓', '경남식품'], ['특명란', '알앤디'], ['공산애참된장', '공산애'], ['사천짜차이', 'CHONGQING']
]
for (const [n, m] of UNKNOWN_SALTY) {
  const f = find(n, m)
  if (!f) { bads.push(`자료에 없음: ${n} (${m})`); continue }
  no(f.per100.na !== undefined, `${n}(${m}): 믿기 어려운 값 ${f.per100.na} 이 남아 있다`)
  no(!isSalty(f), `${n}(${m}): 고나트륨이 없다`)
}

/* 김치·절임은 비우기만 한다 — 덜 짜게 담근 것이 있을 수 있어 고나트륨을 붙이지 않는다 */
for (const [n, m] of [['물김치', '무궁무진'], ['옥천푸드 총각김치', '옥천']] as [string, string][]) {
  const f = find(n, m)
  if (!f) { bads.push(`자료에 없음: ${n} (${m})`); continue }
  no(f.per100.na !== undefined, `${n}: 믿기 어려운 값 ${f.per100.na} 이 남아 있다`)
  no(isSalty(f), `${n}: 값을 모르는데 고나트륨이 붙었다`)
}

/* 짠 음식이 아니다 — 값을 지우거나 경고하면 헛경보다 */
const KEEP: [string, string][] = [
  ['서진 깨소금', '서진'], ['간장제외/단호박스프', '쿡베이스'], ['옥된장 엄마식혜', '올맘'],
  ['매실청', '식초시집'], ['명태숙성회', '알앤디'], ['진미매실장아찌', '하동']
]
for (const [n, m] of KEEP) {
  const f = find(n, m)
  if (!f) { bads.push(`자료에 없음: ${n} (${m})`); continue }
  no(f.per100.na === undefined, `${n}: 값이 지워졌다 — 짠 음식이 아니다`)
  no(isSalty(f), `${n}: 고나트륨이 붙었다`)
}

/* 값이 낮지 않은 제품은 그대로다 */
const dodo = find('해심선 3년 자연숙성 까나리액젓', '두도')
no(dodo?.per100.na !== 1098, `해심선 까나리액젓: 원자료 1,098 이어야 하는데 ${dodo?.per100.na}`)

/* ── 5. 1회량 ─────────────────────────────────────── */
const popcorn = find('국내산 강냉이', '')
no(!popcorn, '자료에 없음: 국내산 강냉이')
no(popcorn !== undefined && popcorn.serving.g === 5, '국내산 강냉이: 5 kg 포장을 1회 5 g 으로 읽었다')
no(dodo !== undefined && dodo.serving.g > 100, `해심선 까나리액젓: 800 mL 포장이 1회 ${dodo?.serving.g} g 이다 — 조미료는 100 g 으로 묶는다`)
const hugeSeasoning = EXT.filter((f) => /(양조간장|진간장|액젓|새우젓)$/.test(f.name) && f.serving.g > 100)
no(hugeSeasoning.length > 0, `조미료 1회량이 100 g 을 넘는다 ${hugeSeasoning.length}행 — 예: ${hugeSeasoning[0]?.name}`)

/* ── 5-2. 1회 섭취참고량(2026-11-04 전문의 결정) ─────────────
 * 값은 「식품등의 표시기준」 [별표 3] 원문과 대조했다.
 * 1회량이 줄어도 짠 조미료·햄·어묵의 고나트륨은 지키고, 김치는 '염장' 으로 복수·위암 경고를 지킨다.
 */
const SERVING: [string, string, number, boolean, string][] = [
  // 이름, 회사, 1회량, 고나트륨, 왜
  ['몽고진간장 양조', '몽고장유', 5, true, '간장 5 mL — 300 mg 이지만 농도로 지킨다'],
  ['태양초고추장', '샘표', 10, true, '고추장 10 g — 260 mg 이지만 농도로 지킨다'],
  ['부산어묵', '남부식품', 30, true, '어묵 30 g — 208 mg 이지만 지킨다(전문의 결정)'],
  ['체다슬라이스치즈', '조흥', 20, false, '치즈 20 g — 136 mg. 손으로 등록한 슬라이스치즈(18 g)와 같이 꺼진다'],
  ['종가집 알찬 포기김치', '횡성', 40, false, '배추김치 40 g — 236 mg. 손으로 등록한 배추김치와 같다'],
  ['그린몬스터 디톡 콤부차', '한미양행', 50, true, '포장 50 g 이 참고량 200 mL 보다 작으면 포장 무게를 지킨다'],
  ['신라면건면사발', '농심', 77, true, '컵면 참고량 80 g 보다 포장 77 g 이 작다']
]
for (const [n, m, g, salty, why] of SERVING) {
  const f = find(n, m)
  if (!f) { bads.push(`자료에 없음: ${n} (${m})`); continue }
  no(f.serving.g !== g, `${n}: 1회 ${f.serving.g} g — ${g} g 이어야 한다(${why})`)
  no(isSalty(f) !== salty, `${n}: 고나트륨 ${isSalty(f)} — ${salty} 이어야 한다(${why})`)
}
const kimchi = find('종가집 알찬 포기김치', '횡성')
no(kimchi !== undefined && !kimchi.tags.includes('염장' as never), '종가집 포기김치: 염장이 없어 복수·위암 경고가 빠진다')
if (kimchi) no(evaluateFood(kimchi, P({ conditions: ['복수'] as never })).level !== 'avoid', '시판 김치: 복수에 피하세요가 아니다')
const leaked = EXT.filter((f) => f.tags.includes('나트륨농도높음' as never)).length
no(leaked > 0, `빌드 표시 '나트륨농도높음' 이 음식에 남았다 ${leaked}행`)
const hams = EXT.filter((f) => /(로스|프레스|슬라이스|샌드위치)\s?햄$/.test(f.name) && (f.per100.na ?? 0) >= 400)
no(hams.length < 20, `햄 표본이 ${hams.length}행뿐이다`)
const hamsOff = hams.filter((f) => !isSalty(f))
no(hamsOff.length > hams.length * 0.1, `햄 ${hams.length}행 중 ${hamsOff.length}행에 고나트륨이 없다 — 예: ${hamsOff[0]?.name}`)
const per5000 = EXT.filter((f) => ((f.per100.na ?? 0) * f.serving.g) / 100 > 5000).length
no(per5000 > 2000, `1회 나트륨 5,000 mg 초과가 ${per5000}행 — 참고량 적용 뒤 2,000 이하여야 한다`)

/* ── 6. 경고까지 실제로 이어진다 ───────────────────────── */
const hits = (f: Food, p: PatientContext) => evaluateFood(f, p).hits.map((h) => h.rule.id)
const htn = P({ conditions: ['고혈압'] as never })
const muc = P({ conditions: ['구강점막염'] as never })

const anchovy = GENERATED_CORE.find((f) => f.name === '멸치볶음')
if (!anchovy) bads.push('자료에 없음: 멸치볶음')
else {
  no(anchovy.per100.na !== 2606, `멸치볶음: 원자료 2,606 이어야 하는데 ${anchovy.per100.na}`)
  no(!isSalty(anchovy), '멸치볶음: 고나트륨이 없다')
  no(evaluateFood(anchovy, htn).level === 'prefer', '멸치볶음: 고혈압 환자에게 권장으로 나온다')
  no(!hits(anchovy, htn).includes('cond-htn-na'), '멸치볶음: 고혈압 나트륨 경고가 없다')
}
const kirim = find('멸치액젓', '기림')
if (kirim) {
  no(!hits(kirim, htn).includes('cond-htn-na'), '기림 멸치액젓: 고혈압 나트륨 경고가 없다')
  no(evaluateFood(kirim, muc).level !== 'avoid', '기림 멸치액젓: 구강점막염에 피하세요가 아니다')
}

console.log(
  bads.length
    ? `나트륨 검사 — 문제 ${bads.length}건\n` + bads.map((b) => '■ ' + b).join('\n')
    : `나트륨 검사 완료 — 빈 값 ${empty.toLocaleString()}행 · 최댓값 ${naMax.toLocaleString()} mg/100 g · 문제 없음`
)
if (bads.length) process.exitCode = 1
