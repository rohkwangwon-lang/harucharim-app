/**
 * 수입 영양제 자료 검사(2026-11-04).
 *
 * 표시 문구를 낱말로 뜯어 만든 자료라, 뜯는 규칙이 틀리면 조용히 틀린 판정이 나간다.
 * 잣대는 엔진에서 빌리지 않고 여기에 직접 적는다.
 */
import { readFileSync } from 'node:fs'
import { functionOf, intakeOf, isRawMaterial } from '../imported-label.mjs'
import { judgeProduct } from '../../src/engine/ingredientVerdict'
import { matchSupplements, suppWords, toSuppIndexRow, type SuppRow } from '../../src/lib/suppSearch'
import type { PatientContext } from '../../src/data/types'

const bugs: string[] = []
const bad = (what: string, detail: unknown) => bugs.push(`${what} :: ${JSON.stringify(detail).slice(0, 300)}`)
const read = (f: string) => JSON.parse(readFileSync(new URL(`../../public/data/${f}`, import.meta.url), 'utf8')) as { cols: string[]; items: SuppRow[] }

const { cols, items } = read('supplements-imported.json')
const domestic = read('supplements-extended.json').items

/* 1. 파일 모양 */
if (cols.join() !== 'name,maker,fn,no,use,country,search') bad('칸 이름', cols)
if (items.length < 4000 || items.length > 7000) bad('건수가 예상 밖', items.length)
const keys = new Set(items.map((r) => `${r[0]}|${r[1]}`))
if (keys.size !== items.length) bad('같은 수입사의 같은 제품이 겹침', items.length - keys.size)

/* 2. 한 줄씩 */
for (const r of items) {
  if (!r[0] || !r[1] || !r[4] || !r[5]) { bad('빈 칸', r.slice(0, 2)); continue }
  if (r[3]) bad('수입품에 신고번호', r[0])
  /* 원료 글이 판정에 들면 스테아린산마그네슘 하나로 마그네슘 제품이 된다 */
  if (/스테아린|이산화규소|원재료명|원료명/.test(r[2])) bad('기능성에 원료 글이 섞임', r[0])
  /* 공장 원료는 살 수 없다 */
  if (/건강기능식품\s*원료|외화획득/.test(`${r[0]} ${r[2]}`)) bad('공장 원료', r[0])
  /* 섭취법은 화면에 그대로 나간다 */
  if (/함량|열량|섭취량\s*당|면역력|치료|재발/.test(r[4])) bad('섭취법 칸에 다른 말', [r[0], r[4]])
  if (r[4].length > 71) bad('섭취법이 너무 김', r[0])
}

/* 3. 뜯는 규칙 — 틀렸던 예를 그대로 박아 둔다 */
if (intakeOf('1일 섭취량 당 아연 15mg') !== '') bad('함량 줄을 섭취법으로 읽음', '1일 섭취량 당')
if (intakeOf('권장섭취량 : 1일 1회, 1회 5m\n섭취방법 : 1일 1회, 생수 500ml에 5ml 희석') !== '1일 1회, 생수 500ml에 5ml 희석') bad('섭취방법 줄을 먼저 읽지 않음', '')
if (!intakeOf('섭취량 및 섭취방법 : 성인 1일 2회(1회 2정) 물과 함께 섭취하십시오.').includes('1회 2정')) bad('섭취법 못 읽음', '')
if (functionOf('원재료명 : 비타민C, 스테아린산마그네슘').length) bad('원료명 줄을 기능성으로 읽음', '')
if (!functionOf('비타민E:항산화작용을 하여 유해산소로부터 세포를 보호하는데 필요').includes('비타민E')) bad("'데 필요' 를 놓침", '')
if (!functionOf('제품유형 : 건강기능식품 - 은행잎 추출물, 포스파티딜세린 제품').includes('은행잎')) bad('제품 유형의 원료를 놓침', '')
if (!isRawMaterial('건강기능식품원료\n제품명 : 녹차추출분말', '녹차추출물')) bad('공장 원료를 못 가림', '')

/* 4. 판정 — 부형제로 원료를 지어내지 않고, 표시된 주의 원료는 읽는다 */
const patient = { cancer: 'breast', phase: 'during_rt', conditions: [], medications: [], allergies: [] } as unknown as PatientContext
const named = (r: SuppRow, ing: string) => judgeProduct(r[0], r[2], patient).items.some((v) => v.ingredient.includes(ing))
const vitC = items.find((r) => r[0] === '폴리C')
if (!vitC) bad('알려진 제품이 없음', '폴리C')
else if (named(vitC, '마그네슘')) bad('스테아린산마그네슘이 판정에 들어감', '폴리C')
const ginkgo = items.filter((r) => /\[은행잎/.test(r[2]))
if (ginkgo.length < 100) bad('은행잎 표시가 너무 적게 읽힘', ginkgo.length)
const missed = ginkgo.filter((r) => !named(r, '은행잎'))
if (missed.length) bad('은행잎이 적혔는데 판정에 없음', missed.slice(0, 3).map((r) => r[0]))
const unknown = items.filter((r) => judgeProduct(r[0], r[2], patient).unknown).length
if (unknown / items.length > 0.15) bad('판정 못 하는 제품이 늘어남', unknown)

/* 5. 찾기 — 국내 뒤에 이어 붙여도 찾아지고, 바코드 표로는 닿지 않는다 */
const all = [...domestic, ...items]
const rows = all.map((r, i) => toSuppIndexRow(i, r))
const find = (q: string) => matchSupplements(rows, suppWords(q), 30)
const importedHit = (q: string) => find(q).ids.some((i) => i >= domestic.length)
for (const q of ['블랙모어스', '오쏘몰 이뮨', 'SOLGAR', '솔가 아연', '네슬레코리아 마그네슘'])
  if (!importedHit(q)) bad('수입 제품을 찾지 못함', q)
if (rows.slice(domestic.length).some((r) => r.reportNo)) bad('수입품이 신고번호로 바코드에 닿음', '')

console.log(`수입 영양제 ${items.length.toLocaleString()}건 · 판정 못 함 ${unknown.toLocaleString()} (${(100 * unknown / items.length).toFixed(1)} %)`)
console.log(`\n수입 영양제 검사 완료 — 문제 ${bugs.length}건`)
for (const b of bugs.slice(0, 40)) console.log('■', b)
if (!bugs.length) console.log('문제 없음')
process.exit(bugs.length ? 1 : 0)
