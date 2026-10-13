/**
 * 불러오기 검사.
 *
 * 이 앱의 건강 기록은 서버에 사본이 없다. 저장된 값 하나가 어긋나 화면이 멈추면
 * 환자분은 기록에 닿을 길이 없다. 그래서 불러올 때 자료를 정리한다(lib/store.ts 의 restoreState).
 *
 * 여기서 네 가지를 못 박는다.
 *   1. 무엇이 들어와도 던지지 않는다
 *   2. 돌려준 것은 앱이 믿고 쓸 수 있는 꼴이다 (목록은 목록, 숫자는 유한한 숫자)
 *   3. 성한 것은 손대지 않는다 — 한 칸이 망가졌다고 나머지를 버리지 않는다
 *   4. 판정의 바탕(암종·시기·몸 치수)이 어긋났으면 조용히 기본값으로 바꾸지 않고 다시 여쭙게 한다
 *
 * 화면 자가시험(scripts/selftest/ui-monkey.mjs)이 실제 브라우저에서 같은 것을 보지만
 * 그것은 몇 분이 걸린다. 이 검사는 순수 함수를 불러 1초 안에 본다.
 */
import { restoreState, restoreWeights, DEFAULT_PATIENT } from '../../src/lib/store'
import { CANCERS } from '../../src/data/cancers'
import { CONDITION_RULES } from '../../src/data/conditionRules'
import { MEDICATIONS } from '../../src/data/interactions'
import { FOODS } from '../../src/data/foods'

const bads: string[] = []
function no(cond: boolean, msg: string) { if (cond) bads.push(msg) }

const TODAY = '2026-10-13'
const D1 = '2026-10-12', D2 = '2026-10-05'
const food = FOODS[100].id, food2 = FOODS[200].id
const good = () => ({
  patient: { ...DEFAULT_PATIENT, cancer: 'lung', phase: 'during_chemo', weightKg: 61.5, heightCm: 168, age: 67, sex: 'M',
    conditions: ['오심·구토', '당뇨'], medications: ['cisplatin', 'steroid'], onboarded: true },
  diary: { [D1]: [{ foodId: food, servings: 1.5, meal: '점심' }, { foodId: food2, servings: 1, meal: '저녁' }] },
  shown: {}, weights: { [D1]: 61.5, [D2]: 62.4 }, supplements: ['vitamin-d'], textSize: 'xlarge'
})

/* 잣대를 앱에서 빌리지 않는다 — 무엇이 '쓸 수 있는 꼴' 인지 여기서 따로 본다 */
const CANCER_IDS = new Set(CANCERS.map((c) => c.id as string))
const COND = new Set(Object.keys(CONDITION_RULES))
const MEDS = new Set(MEDICATIONS.map((m) => m.id))
const PHASES = new Set(['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'])
const fin = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
function usable(what: string, s: ReturnType<typeof restoreState>) {
  const p = s.patient
  no(!CANCER_IDS.has(p.cancer), `${what} — 없는 암종이 그대로 나옴: ${p.cancer}`)
  no(!PHASES.has(p.phase), `${what} — 없는 치료 시기가 그대로 나옴: ${p.phase}`)
  no(p.sex !== 'M' && p.sex !== 'F', `${what} — 성별이 이상함: ${String(p.sex)}`)
  no(!fin(p.weightKg) || p.weightKg < 20 || p.weightKg > 300, `${what} — 체중이 쓸 수 없는 값: ${p.weightKg}`)
  no(!fin(p.heightCm) || p.heightCm < 100 || p.heightCm > 230, `${what} — 키가 쓸 수 없는 값: ${p.heightCm}`)
  no(!fin(p.age) || p.age < 1 || p.age > 120, `${what} — 나이가 쓸 수 없는 값: ${p.age}`)
  for (const k of ['conditions', 'medications', 'subtypes', 'history', 'cuisines'] as const) {
    no(!Array.isArray(p[k]), `${what} — ${k} 가 목록이 아님`)
  }
  no(Array.isArray(p.conditions) && p.conditions.some((c) => !COND.has(c)), `${what} — 없는 증상이 남음`)
  no(Array.isArray(p.medications) && p.medications.some((m) => !MEDS.has(m)), `${what} — 없는 약이 남음`)
  no(typeof s.diary !== 'object' || s.diary === null || Array.isArray(s.diary), `${what} — 기록이 날짜별 표가 아님`)
  for (const [d, items] of Object.entries(s.diary ?? {})) {
    no(!Array.isArray(items), `${what} — ${d} 의 기록이 목록이 아님`)
    for (const it of Array.isArray(items) ? items : []) {
      no(typeof it?.foodId !== 'string' || !it.foodId, `${what} — 음식 id 없는 기록`)
      no(!fin(it?.servings) || it.servings <= 0, `${what} — 분량이 쓸 수 없는 값: ${String(it?.servings)}`)
      no(typeof it?.meal !== 'string', `${what} — 끼니가 없음`)
    }
  }
  no(Array.isArray(s.weights) || typeof s.weights !== 'object' || s.weights === null, `${what} — 체중이 날짜별 표가 아님`)
  for (const [d, kg] of Object.entries(s.weights ?? {})) no(!fin(kg) || kg < 20 || kg > 300, `${what} — ${d} 체중이 쓸 수 없는 값: ${String(kg)}`)
  no(!Array.isArray(s.supplements) || s.supplements.some((x) => typeof x !== 'string'), `${what} — 영양제가 글자 목록이 아님`)
  no(!['normal', 'large', 'xlarge'].includes(String(s.textSize)), `${what} — 글자 크기가 모르는 값: ${String(s.textSize)}`)
}

/* ── 1. 성한 자료는 그대로 돌아온다 ───────────────────────── */
{
  const s = restoreState(good(), TODAY as never)
  usable('성한 자료', s)
  const g = good()
  no(s.patient.cancer !== 'lung' || s.patient.phase !== 'during_chemo', '성한 자료의 암종·시기가 바뀜')
  no(s.patient.weightKg !== 61.5 || s.patient.heightCm !== 168 || s.patient.age !== 67, '성한 자료의 몸 치수가 바뀜')
  no(s.patient.onboarded !== true, '성한 자료인데 처음 설정을 다시 여쭘')
  no(JSON.stringify(s.patient.conditions) !== JSON.stringify(g.patient.conditions), '성한 자료의 증상이 바뀜')
  no(JSON.stringify(s.patient.medications) !== JSON.stringify(g.patient.medications), '성한 자료의 약이 바뀜')
  no(JSON.stringify(s.weights) !== JSON.stringify(g.weights), '성한 자료의 체중 기록이 바뀜')
  no(s.diary[D1 as never]?.length !== 2 || s.diary[D1 as never][0].servings !== 1.5, '성한 자료의 식단 기록이 바뀜')
  no(JSON.stringify(s.supplements) !== JSON.stringify(g.supplements), '성한 자료의 영양제가 바뀜')
  /* 글자 크기 — 저장은 되는데 읽지 않아, 다시 열 때마다 원래 크기로 돌아갔었다 */
  no(s.textSize !== 'xlarge', `글자 크기가 돌아오지 않음 — 저장 'xlarge', 돌려준 값 '${String(s.textSize)}'`)
}

/* ── 2. 망가진 자료 — 던지지 않고, 쓸 수 있는 꼴로, 성한 것은 살린다 ───── */
type Fix = (s: any) => void
const BROKEN: [string, Fix, ((s: ReturnType<typeof restoreState>) => string | null)?][] = [
  ['없어진 약 id', (s) => { s.patient.medications = ['herceptin', 'cisplatin'] }, (r) => r.patient.medications.join() === 'cisplatin' && r.patient.onboarded ? null : '성한 약(cisplatin)만 남고 설정은 그대로여야 한다'],
  ['없어진 증상', (s) => { s.patient.conditions = ['빈혈', '당뇨'] }, (r) => r.patient.conditions.join() === '당뇨' && r.patient.onboarded ? null : '성한 증상(당뇨)만 남아야 한다'],
  ['없어진 암종', (s) => { s.patient.cancer = 'thyroid' }, (r) => r.patient.onboarded === false ? null : '암종이 없어졌으면 다시 여쭤야 한다 — 조용히 다른 암으로 바꾸면 안 된다'],
  ['예전 치료 시기 값', (s) => { s.patient.phase = 'survivor' }, (r) => r.patient.onboarded === false ? null : '모르는 시기면 다시 여쭤야 한다'],
  ['키가 0', (s) => { s.patient.heightCm = 0 }, (r) => r.patient.onboarded === false ? null : '키가 0 이면 다시 여쭤야 한다 — BMI 가 무한대가 된다'],
  ['체중 칸이 없음', (s) => { delete s.patient.weightKg }, (r) => r.patient.onboarded === false ? null : '체중이 없으면 다시 여쭤야 한다'],
  ['나이가 null', (s) => { s.patient.age = null }, (r) => r.patient.onboarded === false ? null : '나이가 없으면 다시 여쭤야 한다'],
  ['성별이 다른 글자', (s) => { s.patient.sex = '여' }, (r) => r.patient.onboarded === false ? null : '성별을 모르면 다시 여쭤야 한다'],
  ['증상이 목록이 아님', (s) => { s.patient.conditions = '설사' }],
  ['약이 null', (s) => { s.patient.medications = null }],
  ['없어진 세부 유형', (s) => { s.patient.subtypes = ['없는유형'] }, (r) => r.patient.subtypes?.length === 0 ? null : '없는 세부 유형이 남음'],
  ['환자 칸이 없음', (s) => { delete s.patient }, (r) => r.patient.onboarded === false ? null : '환자 설정이 없으면 처음부터 여쭤야 한다'],
  ['체중이 목록 모양', (s) => { s.weights = [{ date: D1, kg: 61.5 }, { date: D2, kg: 62.4 }] }, (r) => r.weights[D1 as never] === 61.5 && r.weights[D2 as never] === 62.4 ? null : '목록 모양 체중을 날짜별 표로 살려야 한다'],
  ['체중 값이 글자', (s) => { s.weights = { [D1]: '61.5', [D2]: 62.4 } }, (r) => r.weights[D1 as never] === 61.5 ? null : '글자로 적힌 체중을 숫자로 살려야 한다'],
  ['체중 값이 0·null', (s) => { s.weights = { [D1]: 0, [D2]: null, '2026-09-30': 62 } }, (r) => Object.keys(r.weights).join() === '2026-09-30' ? null : '쓸 수 없는 체중만 덜어 내야 한다'],
  ['체중이 null', (s) => { s.weights = null }],
  ['분량 칸이 없음', (s) => { s.diary[D1] = [{ foodId: food, meal: '점심' }] }, (r) => r.diary[D1 as never]?.[0]?.servings === 1 ? null : '분량이 없으면 1인분으로 본다'],
  ['분량이 글자', (s) => { s.diary[D1] = [{ foodId: food, servings: '2', meal: '점심' }] }, (r) => r.diary[D1 as never]?.[0]?.servings === 2 ? null : '글자로 적힌 분량을 숫자로 살려야 한다'],
  ['분량이 0·음수', (s) => { s.diary[D1] = [{ foodId: food, servings: 0, meal: '점심' }, { foodId: food2, servings: -1, meal: '저녁' }] }],
  ['분량이 아주 큼', (s) => { s.diary[D1] = [{ foodId: food, servings: 5000, meal: '점심' }] }, (r) => (r.diary[D1 as never]?.[0]?.servings ?? 0) <= 50 ? null : '터무니없는 분량은 눌러야 한다'],
  ['하루 기록이 목록이 아님', (s) => { s.diary[D1] = { foodId: food, servings: 1, meal: '점심' } }, (r) => r.diary[D1 as never]?.length === 1 ? null : '낱개로 적힌 기록을 살려야 한다'],
  ['하루 기록에 null', (s) => { s.diary[D1] = [null, { foodId: food, servings: 1, meal: '점심' }] }, (r) => r.diary[D1 as never]?.length === 1 ? null : 'null 만 덜고 성한 기록은 남겨야 한다'],
  ['기록이 통째로 null', (s) => { s.diary = null }],
  ['끼니 이름이 다름', (s) => { s.diary[D1] = [{ foodId: food, servings: 1, meal: '야식' }] }],
  ['영양제가 목록이 아님', (s) => { s.supplements = 'vitamin-d' }],
  ['보여 드린 것이 목록 모양', (s) => { s.shown = ['a', 'b'] }],
  ['글자 크기가 모르는 값', (s) => { s.textSize = 'huge' }, (r) => r.textSize === 'normal' ? null : '모르는 글자 크기는 보통으로'],
  ['예전 판의 하루치(selected)', (s) => { delete s.diary; s.selected = [{ foodId: food, servings: 1, meal: '점심' }] }, (r) => r.diary[TODAY as never]?.length === 1 ? null : '예전 판의 하루치를 오늘 기록으로 옮겨야 한다']
]
for (const [what, breakIt, expect] of BROKEN) {
  const s = good()
  breakIt(s)
  let r
  try { r = restoreState(JSON.parse(JSON.stringify(s)), TODAY as never) } catch (e) { no(true, `${what} — 불러오다 무너짐: ${(e as Error).message}`); continue }
  usable(what, r)
  const miss = expect?.(r)
  no(Boolean(miss), `${what} — ${miss}`)
  /* 한 칸이 망가졌다고 나머지 기록을 버리지 않는다 */
  if (!/기록|selected|분량|끼니/.test(what)) no(r.diary[D1 as never]?.length !== 2, `${what} — 상관없는 식단 기록이 사라짐`)
  if (!/체중/.test(what)) no(r.weights[D2 as never] !== 62.4, `${what} — 상관없는 체중 기록이 사라짐`)
}

/* ── 3. 아예 엉뚱한 것이 들어와도 ─────────────────────────── */
for (const junk of [null, undefined, 42, 'x', [], [1, 2], {}, { patient: 7 }, { diary: 'x', weights: 9, supplements: {} }]) {
  try { usable(`엉뚱한 값 ${JSON.stringify(junk)}`, restoreState(junk, TODAY as never)) }
  catch (e) { no(true, `엉뚱한 값 ${JSON.stringify(junk)} — 무너짐: ${(e as Error).message}`) }
}
no(Object.keys(restoreWeights([{ date: 'x', kg: 60 }, { date: D1 }, 7, null])).length !== 0, '날짜가 아닌 체중이 살아남음')

console.log(bads.length
  ? `불러오기 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
  : `불러오기 검사 완료 — 망가진 자료 ${BROKEN.length}가지·엉뚱한 값 9가지, 문제 없음`)
if (bads.length) process.exitCode = 1
