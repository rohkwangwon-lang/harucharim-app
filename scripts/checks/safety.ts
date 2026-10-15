/**
 * 안전 검사 — 2026-10-15 독립 안전 검토와 사용자 보고에서 나온 것을 다시 생기지 않게 못 박는다.
 *
 *  1. 균형 — 추천 식단이 화면과 같은 잣대로 열량·단백질·섬유 모두 '적정' 인 비율(고치기 전 33 %)
 *  2. 다시 구성 — 누르면 다른 상이 나오는가
 *  3. 연하곤란 — 식단에 질감이 맞지 않는 음식이 오르지 않는가, '권장' 이 붙지 않는가
 *  4. 날것 — 호중구 시기에 날로 먹는 해산물·내장이 '피하세요', 익혀 먹을 '생것' 재료에 '권장' 이 없는가
 *  5. 간질환 — 간성뇌증 위험을 고르신 분께 날 해산물이 '피하세요' 인가
 *  6. 와파린 — 증상 칸으로 고르든 약 칸으로 고르든 같은 답인가(엔진·저장소 둘 다)
 *  7. 옥살리플라틴 — 점막염이 있어도 아이스크림이 '권장' 으로 남지 않는가
 *  8. 스타후르츠 — 신기능저하에서 '피하세요' 인가
 *  9. 떡 — 공공데이터 떡에 '점착성' 이 붙는가 / 나트륨 — 공공데이터 찌개에 '고나트륨' 이 붙는가
 * 10. 응급 안내 — 해당하는 분께 나오는가
 * 11. 알레르기 — 고른 것이 식단에 오르지 않는가, 판정·저장·오탐
 * 12~17. 체중감소 완화 · 연하곤란 액체 · 당뇨 식단 · 와파린 비타민 K 폭 · 투석 · 재영양
 */
import { buildDayMenu, fiberGoal } from '../../src/engine/menu'
import { foodContribution, personalTarget, refeedingRisk, refeedingStage, renalProteinCap, targetNotes } from '../../src/engine/nutrition'
import { activeInteractions, evaluateFood } from '../../src/engine/rules'
import { CANCERS, CANCER_BY_ID } from '../../src/data/cancers'
import { FOODS, swallowSafe } from '../../src/data/foods'
import { MEAL_SLOTS, type Food, type PatientContext } from '../../src/data/types'
import { DEFAULT_PATIENT, linkWarfarin, restorePatient } from '../../src/lib/store'
import { allergensIn } from '../../src/data/allergens'
import { emergencySigns } from '../../src/data/emergencySigns'

const bad: string[] = []
const P = (o: Partial<PatientContext>): PatientContext => ({ ...DEFAULT_PATIENT, onboarded: true, cuisines: ['한식'], ...o } as PatientContext)
const byName = (re: RegExp, filter: (f: Food) => boolean = () => true) => FOODS.filter((f) => re.test(f.name) && filter(f))

/* 화면(components/ui.tsx nutrientState)과 같은 잣대 — 잣대를 엔진에서 빌리지 않는다 */
function state(v: number, min: number, max: number, overOk = false) {
  if (v < min) return 'low'
  if (overOk) return v > max * 1.25 ? 'high' : 'ok'
  return v > max ? 'high' : 'ok'
}

/* 1·2. 균형과 다시 구성 */
let seed = 20261015
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
const PH = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const
const CONDS = ['오심·구토', '식욕부진', '설사', '변비', '구강점막염', '연하곤란', '체중증가', '당뇨', '신기능저하'] as const
let menus = 0, allOk = 0, kcalOver = 0, same = 0
const N = Number(process.env.PEOPLE ?? 400)
for (let i = 0; i < N; i++) {
  const c = pick(CANCERS)
  const sex = c.id === 'prostate' ? 'M' : c.id === 'gyn' || c.id === 'breast' ? 'F' : pick(['M', 'F'] as const)
  const patient = P({ cancer: c.id, phase: pick([...PH]), sex, weightKg: Math.round(40 + rnd() * 50), heightCm: Math.round(150 + rnd() * 30),
    age: Math.round(35 + rnd() * 45), weightLossPct: rnd() < 0.25 ? Math.round(rnd() * 12) : 0,
    conditions: rnd() < 0.5 ? [] : [pick([...CONDS])], medications: [] })
  const day = new Date(Date.UTC(2026, 9, 1 + (i % 30))).toISOString().slice(0, 10)
  const prof = CANCER_BY_ID[c.id]
  const t = personalTarget(patient, prof.target.kcalPerKg, prof.target.proteinPerKg)
  const fg = fiberGoal(patient, prof)
  const renal = patient.conditions.includes('신기능저하')
  let prev = ''
  for (let nonce = 0; nonce < 2; nonce++) {
    const m = buildDayMenu([], patient, { supplements: [], day, nonce, recent: new Map() })
    menus++
    let kcal = 0
    for (const s of MEAL_SLOTS) for (const e of m.meals[s]) kcal += Math.round(foodContribution(e.food, e.servings).kcal ?? 0)
    const prot = Math.round(m.totals.protein ?? 0), fib = Math.round((m.totals.fiber ?? 0) * 10) / 10
    const st = [state(kcal, t.kcal[0], t.kcal[1]), state(prot, t.protein[0], t.protein[1], !renal), state(fib, fg.range[0], fg.range[1], !fg.lowResidue)]
    if (st.every((x) => x === 'ok')) allOk++
    if (st[0] === 'high') kcalOver++
    const ids = MEAL_SLOTS.flatMap((s) => m.meals[s].map((e) => e.food.id)).sort().join(',')
    if (nonce === 1 && ids === prev) same++
    prev = ids
    /* 3. 연하곤란이면 상에 오른 것은 모두 질감이 맞아야 한다 */
    if (patient.conditions.includes('연하곤란')) {
      for (const s of MEAL_SLOTS) for (const e of m.meals[s]) {
        if (e.origin === 'added' && !swallowSafe(e.food)) bad.push(`연하곤란 식단에 질감이 맞지 않는 음식: ${e.food.name} (${c.id})`)
      }
    }
  }
}
const okRate = allOk / menus
if (okRate < 0.8) bad.push(`균형: 열량·단백질·섬유 모두 적정인 상 ${(okRate * 100).toFixed(1)} % — 80 % 아래(2026-10-15 고치기 전 33 %)`)
if (kcalOver / menus > 0.02) bad.push(`균형: 열량 상단을 넘는 상 ${(kcalOver / menus * 100).toFixed(1)} % — 2 % 넘음(고치기 전 33 %)`)
if (same > 0) bad.push(`다시 구성: 담은 것이 없는데도 같은 상이 다시 나온 경우 ${same}번`)

/* 3. 연하곤란 — '권장' 이 질감이 맞는 것에만 */
{
  const p = P({ cancer: 'headneck', phase: 'during_rt', conditions: ['연하곤란'] })
  for (const f of byName(/^(김\(구운 것\)|상추|스테이크|땅콩조림|가래떡|인절미|찹쌀밥|밤\(삶은 것\)|단팥빵)/)) {
    const v = evaluateFood(f, p)
    if (v.level === 'prefer') bad.push(`연하곤란에서 '${f.name}' 이 권장`)
  }
}

/* 4. 호중구 시기 날것 */
{
  const p = P({ cancer: 'breast', phase: 'neutropenia' })
  const rawEaten = byName(/(굴|성게|연어알|해삼|천엽).*생것/, (f) => ['어패류', '육류'].includes(f.group))
  if (rawEaten.length < 3) bad.push(`날것: 날로 먹는 생것 표본이 ${rawEaten.length}종 — 검사가 헛돎`)
  for (const f of rawEaten) if (evaluateFood(f, p).level !== 'avoid') bad.push(`호중구 시기에 '${f.name}' 이 피하세요가 아님`)
  const ingredient = byName(/생것/, (f) => ['어패류', '육류', '가금류·난류'].includes(f.group))
  const praised = ingredient.filter((f) => evaluateFood(f, p).level === 'prefer')
  if (praised.length) bad.push(`호중구 시기에 동물성 생것 재료가 권장 ${praised.length}종 — 예: ${praised.slice(0, 3).map((f) => f.name).join(', ')}`)
}

/* 5. 간질환 + 날 해산물 */
{
  const p = P({ cancer: 'colorectal', phase: 'survivorship', conditions: ['간성뇌증위험'] })
  const raw = byName(/회덮밥|모듬회|초밥|생굴/).slice(0, 40)
  const miss = raw.filter((f) => f.tags.includes('날해산물') && evaluateFood(f, p).level !== 'avoid')
  if (raw.length < 5) bad.push('간질환: 날 해산물 표본이 적음 — 검사가 헛돎')
  if (miss.length) bad.push(`간성뇌증 위험에서 날 해산물이 피하세요가 아님: ${miss.slice(0, 3).map((f) => f.name).join(', ')}`)
  if (!raw.some((f) => f.tags.includes('날해산물'))) bad.push('간질환: 날해산물 태그가 하나도 안 붙음')
}

/* 6. 와파린 두 길 */
{
  const viaCond = P({ cancer: 'lung', phase: 'survivorship', conditions: ['와파린복용'], medications: [] })
  const viaMed = P({ cancer: 'lung', phase: 'survivorship', conditions: [], medications: ['warfarin'] })
  const ids = (p: PatientContext) => activeInteractions(p).map((h) => h.interaction.id).sort().join(',')
  if (ids(viaCond) !== ids(viaMed)) bad.push('와파린: 증상 칸과 약 칸의 상호작용이 다름')
  const a = linkWarfarin(viaCond), b = linkWarfarin(viaMed)
  if (!a.medications.includes('warfarin') || !b.conditions.includes('와파린복용')) bad.push('와파린: 저장소가 두 칸을 맞추지 않음')
  const off = linkWarfarin({ ...a, medications: a.medications.filter((m) => m !== 'warfarin') }, { medications: [] })
  if (off.conditions.includes('와파린복용')) bad.push('와파린: 약 칸에서 끄셨는데 증상 칸이 남음')
}

/* 7. 옥살리플라틴 + 점막염 */
{
  const p = P({ cancer: 'colorectal', phase: 'during_chemo', conditions: ['구강점막염'], medications: ['oxaliplatin'] })
  const cold = byName(/아이스크림|빙수/).slice(0, 30)
  const praised = cold.filter((f) => evaluateFood(f, p).level === 'prefer')
  if (cold.length < 3) bad.push('옥살리플라틴: 찬 음식 표본이 적음')
  if (praised.length) bad.push(`옥살리플라틴+점막염에서 찬 음식이 권장: ${praised.slice(0, 3).map((f) => f.name).join(', ')}`)
}

/* 8. 스타후르츠 */
{
  const p = P({ cancer: 'lung', phase: 'survivorship', conditions: ['신기능저하'] })
  const star = byName(/오렴자|카람볼라|스타후르츠/)
  if (!star.length) bad.push('스타후르츠: 표본 없음')
  for (const f of star) if (evaluateFood(f, p).level !== 'avoid') bad.push(`신기능저하에서 '${f.name}' 이 피하세요가 아님`)
}

/* 9. 태그 */
{
  const rice = byName(/가래떡|인절미|백설기|송편/, (f) => !!f.auto).slice(0, 50)
  const noSticky = rice.filter((f) => !f.tags.includes('점착성'))
  if (rice.length < 5) bad.push('떡: 공공데이터 표본이 적음')
  if (noSticky.length) bad.push(`떡에 점착성 없음 ${noSticky.length}종 — 예: ${noSticky.slice(0, 3).map((f) => f.name).join(', ')}`)
  const notRice = byName(/떡갈비/).filter((f) => f.tags.includes('점착성'))
  if (notRice.length) bad.push(`떡갈비에 점착성: ${notRice[0].name}`)
  const salty = FOODS.filter((f) => f.auto && f.per100.na !== undefined && (f.per100.na * f.serving.g) / 100 >= 400)
  const missing = salty.filter((f) => !f.tags.includes('고나트륨'))
  if (salty.length < 100) bad.push('나트륨: 공공데이터 표본이 적음')
  if (missing.length) bad.push(`1회 400 mg 이상인데 고나트륨 없음 ${missing.length}종 — 예: ${missing.slice(0, 3).map((f) => f.name).join(', ')}`)
}

/* 11. 알레르기 — 고르면 식단에서 빠지고, 담은 것은 '빼는 것이 좋겠습니다' 로, 판정은 '피하세요' */
{
  const chosen = ['우유', '새우', '밀', '대두']
  for (let d = 0; d < 20; d++) {
    const p = P({ cancer: pick(CANCERS).id, phase: pick([...PH]), allergies: chosen, sex: 'F' })
    const day = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10)
    const shrimp = FOODS.find((f) => f.id === 'shrimp-boiled' || f.name === '새우(데친 것)')
    const m = buildDayMenu(shrimp ? [{ foodId: shrimp.id, servings: 1, meal: '점심' }] : [], p, { supplements: [], day, nonce: d % 3, recent: new Map() })
    for (const s of MEAL_SLOTS) for (const e of m.meals[s]) {
      const hit = allergensIn(e.food).filter((a) => chosen.includes(a))
      if (hit.length) bad.push(`알레르기(${hit.join('·')}) 음식이 식단에: ${e.food.name}`)
    }
    if (shrimp && !m.removed.some((r) => r.food.id === shrimp.id)) bad.push('알레르기: 담은 새우가 빼는 것 목록에 없음')
  }
  const milk = FOODS.find((f) => f.name === '우유(일반)')!
  const v = evaluateFood(milk, P({ allergies: ['우유'] }))
  if (v.level !== 'avoid' || !v.hits.some((h) => h.source === '알레르기')) bad.push('알레르기: 우유 알레르기에 우유가 피하세요가 아님')
  if (evaluateFood(milk, P({})).hits.some((h) => h.source === '알레르기')) bad.push('알레르기: 고르지 않았는데 알레르기 판정')
  const odd = [['두유(무가당)', '우유'], ['쌀국수(삶은 것)', '밀'], ['돼지고기 등심', '쇠고기'], ['참치통조림(기름 뺀 것)', '대두'], ['두부(부침용)', '밀']] as const
  for (const [name, a] of odd) {
    const f = FOODS.find((x) => x.name === name)
    if (f && allergensIn(f).includes(a)) bad.push(`알레르기 오탐: ${name} → ${a}`)
  }
  if (restorePatient({ ...DEFAULT_PATIENT, allergies: ['우유', '없는것', 3] }).allergies?.join() !== '우유') bad.push('알레르기: 저장 자료의 모르는 값을 걸러 내지 않음')
}

/* 12. 체중이 뚜렷이 줄면 증상 완화용 '피하세요' 가 '주의' 로, 사유가 남는가. 안전 규칙(날것·술)은 그대로인가 */
{
  const base = { cancer: 'colorectal', phase: 'during_chemo', conditions: ['설사', '구강점막염', '호중구감소증'] } as Partial<PatientContext>
  const fried = FOODS.find((f) => f.name === '후라이드치킨')!
  const raw = FOODS.find((f) => f.name === '연어회')!
  const stable = evaluateFood(fried, P(base)), losing = evaluateFood(fried, P({ ...base, weightLossPct: 8 }))
  if (stable.level !== 'avoid') bad.push('체중감소 완화: 기준 상태에서 후라이드치킨이 피하세요가 아님(검사 전제가 깨짐)')
  if (losing.level !== 'caution') bad.push(`체중감소 완화: 8 % 감소인데 후라이드치킨이 ${losing.level}`)
  if (!losing.hits.some((h) => /체중이 줄고 있어 낮춘 판정/.test(h.rule.reason))) bad.push('체중감소 완화: 사유 문구가 없음')
  if (evaluateFood(raw, P({ ...base, weightLossPct: 8 })).level !== 'avoid') bad.push('체중감소 완화: 날것까지 낮아짐')
  if (evaluateFood(fried, P({ ...base, weightLossPct: 4 })).level !== 'avoid') bad.push('체중감소 완화: 4 % 감소에서 낮아짐(문턱 5 %)')
}

/* 13. 연하곤란 — 마시는 것 전체에 묽은 액체 안내, 식단에서는 빼지 않음(영양보충 음료) */
{
  const p = P({ cancer: 'headneck', phase: 'during_rt', conditions: ['연하곤란'] })
  for (const name of ['우유(일반)', '두유(무가당)', '커피(아메리카노)', '균형영양식(고열량형, 1.5 kcal/mL)']) {
    const f = FOODS.find((x) => x.name === name)
    if (!f) { bad.push(`액체 표본 없음: ${name}`); continue }
    if (!evaluateFood(f, p).hits.some((h) => h.rule.id === 'cond-dys-thin')) bad.push(`연하곤란: '${name}' 에 묽은 액체 안내 없음`)
  }
  const thick = FOODS.find((x) => x.name === '점도증진제(연하보조)')
  if (thick && evaluateFood(thick, p).hits.some((h) => h.rule.id === 'cond-dys-thin')) bad.push('연하곤란: 점도증진제에 묽은 액체 안내')
}

/* 14. 당뇨 식단 — 고당 음식이 오르지 않고, 과일은 1회 당 15 g 이하 */
{
  for (let d = 0; d < 15; d++) {
    const p = P({ cancer: pick(CANCERS).id, phase: 'during_chemo', conditions: ['당뇨'], medications: ['steroid'], sex: 'M' })
    const m = buildDayMenu([], p, { supplements: [], day: new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10), nonce: 0, recent: new Map() })
    for (const s of MEAL_SLOTS) for (const e of m.meals[s]) {
      if (e.origin !== 'added') continue
      if (e.food.tags.includes('고당')) bad.push(`당뇨 식단에 고당 음식: ${e.food.name}`)
      const sugar = ((e.food.per100.sugar ?? 0) * e.food.serving.g) / 100
      if (e.food.group === '과일' && sugar > 15) bad.push(`당뇨 식단에 1회 당 ${Math.round(sugar)} g 과일: ${e.food.name}`)
    }
  }
}

/* 15. 와파린 — 비타민 K 가 하한~상한(남 75~150, 여 65~130 µg) 안, 증상 칸·약 칸 같은 식단 */
{
  let out = 0, n = 0
  for (const sex of ['M', 'F'] as const) for (let d = 0; d < 20; d++) {
    const day = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10)
    const cancer = pick(CANCERS).id
    const a = buildDayMenu([], P({ cancer, phase: 'survivorship', sex, medications: ['warfarin'] }), { supplements: [], day, nonce: 0, recent: new Map() })
    const b = buildDayMenu([], P({ cancer, phase: 'survivorship', sex, conditions: ['와파린복용'] }), { supplements: [], day, nonce: 0, recent: new Map() })
    const ids = (m: typeof a) => MEAL_SLOTS.flatMap((s) => m.meals[s].map((e) => e.food.id)).join(',')
    if (ids(a) !== ids(b)) bad.push(`와파린: 증상 칸과 약 칸의 식단이 다름 (${cancer} ${day})`)
    const ai = sex === 'M' ? 75 : 65, v = a.totals.vitK ?? 0
    n++
    if (v < ai - 0.5) bad.push(`와파린: 비타민 K ${Math.round(v)} µg — 하한 ${ai} 아래 (${cancer} ${day})`)
    if (v > ai * 2 * 1.35) bad.push(`와파린: 비타민 K ${Math.round(v)} µg — 상한 ${ai * 2} 을 크게 넘음 (${cancer} ${day})`)
    if (v > ai * 2 + 0.5) out++
  }
  if (out / n > 0.05) bad.push(`와파린: 비타민 K 상한을 넘는 날 ${out}/${n} — 5 % 넘음`)
}

/* 16. 투석 — 투석 중이면 단백질 뚜껑을 벗기고, 투석 전·모름이면 1.2 g/kg 을 넘지 않는다 */
{
  const base = { cancer: 'lung', phase: 'during_chemo', conditions: ['신기능저하'], weightKg: 60 } as Partial<PatientContext>
  const t = (o: Partial<PatientContext>) => personalTarget(P({ ...base, ...o }), CANCER_BY_ID.lung.target.kcalPerKg, CANCER_BY_ID.lung.target.proteinPerKg)
  if (t({ dialysis: '투석 전' }).protein[1] > 72) bad.push('투석 전: 단백질 상한이 1.2 g/kg(72 g)을 넘음')
  if (t({ dialysis: '혈액투석' }).protein[0] < 60) bad.push('혈액투석: 단백질 하한이 1.0 g/kg 아래')
  if (!renalProteinCap(P({ ...base, dialysis: '모름' })) || renalProteinCap(P({ ...base, dialysis: '복막투석' }))) bad.push('투석: 단백질 뚜껑 판단이 틀림')
  if (!targetNotes(P({ ...base })).some((n) => /투석 여부를 알려 주세요/.test(n.label))) bad.push('투석: 여부를 모를 때 묻는 안내가 없음')
}

/* 17. 재영양 — 고위험이고 거의 못 드셨으면 처음 일주일 단계적 목표, 아니면 그대로. 극단이면 식단 대신 병원 안내 */
{
  const t = CANCER_BY_ID.stomach.target
  const p = (o: Partial<PatientContext>) => P({ cancer: 'stomach', phase: 'during_chemo', sex: 'F', weightKg: 40, heightCm: 158, weightLossPct: 12, lowIntakeSince: '2026-10-15', ...o })
  const d1 = personalTarget(p({ lowIntake: '5일 넘게' }), t.kcalPerKg, t.proteinPerKg, '2026-10-15')
  const d8 = personalTarget(p({ lowIntake: '5일 넘게' }), t.kcalPerKg, t.proteinPerKg, '2026-10-22')
  const eating = personalTarget(p({ lowIntake: '아니요' }), t.kcalPerKg, t.proteinPerKg, '2026-10-15')
  if (d1.kcal[0] !== 400) bad.push(`재영양: 1일째 하한 ${d1.kcal[0]} — 10 kcal/kg(400) 이어야 함`)
  if (d8.kcal[0] !== eating.kcal[0]) bad.push('재영양: 8일째에 필요량으로 돌아오지 않음')
  if (!refeedingRisk(p({ lowIntake: '5일 넘게' })).high) bad.push('재영양: BMI 16·12 % 감소·5일 넘게를 고위험으로 보지 않음')
  if (!refeedingRisk(p({ weightKg: 34, lowIntake: '10일 넘게' })).extreme) bad.push('재영양: BMI 13.6 을 극단으로 보지 않음')
  if (refeedingStage(p({ weightKg: 60, weightLossPct: 0, lowIntake: '5일 넘게' }), '2026-10-15')) bad.push('재영양: 위험이 낮은데 단계적 목표가 걸림')
}

/* 10. 응급 안내 */
{
  const need: [Partial<PatientContext>, string][] = [
    [{ phase: 'neutropenia' }, 'fever'], [{ conditions: ['와파린복용'] }, 'bleeding'],
    [{ conditions: ['설사'] }, 'dehydration'], [{ conditions: ['연하곤란'] }, 'aspiration'], [{ cancer: 'colorectal' }, 'obstruction']
  ]
  for (const [o, id] of need) if (!emergencySigns(P(o)).some((s) => s.id === id)) bad.push(`응급 안내 '${id}' 가 나오지 않음`)
}

console.log(`안전 검사 완료 — 식단 ${menus}상 · 모두 적정 ${(okRate * 100).toFixed(1)} % · 열량 상단 초과 ${(kcalOver / menus * 100).toFixed(1)} % · 문제 ${bad.length}건`)
for (const b of bad.slice(0, 40)) console.log('   -', b)
if (bad.length) process.exitCode = 1
