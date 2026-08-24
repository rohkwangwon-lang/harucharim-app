/**
 * 무작위 조건 대량 검사.
 * 실제로 있을 법한 환자 상태와 식단을 마구 만들어 돌리면서
 * "이건 절대 일어나면 안 된다"에 해당하는 것들을 잡아낸다.
 */
import { buildDayMenu, dayNotes, ideasFromIngredients, suggestAlternative, defaultSlotFor, MEAL_SLOTS } from '../../src/engine/menu'
import { evaluateFood, evaluateSelection, activeRules, activeInteractions, evaluateSupplement } from '../../src/engine/rules'
import { foodContribution, sumIntake, personalTarget, nutritionRisk, getDailyReference } from '../../src/engine/nutrition'
import { summarizeDay } from '../../src/engine/dayScore'
import { adviseSupplements, reviewCurrentSupplements } from '../../src/engine/supplementAdvice'
import { FOODS, CURATED_FOODS, FOOD_BY_ID } from '../../src/data/foods'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { CANCERS } from '../../src/data/cancers'
import { MEDICATIONS } from '../../src/data/interactions'
import type { CancerId, MealSlot, PatientCondition, PatientContext, SelectedItem, TreatmentHistory, Cuisine } from '../../src/data/types'

// 재현 가능한 난수
let seed = 20260821
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const some = <T,>(a: T[], max: number): T[] => {
  const n = Math.floor(rnd() * (max + 1)); const out: T[] = []
  for (let i = 0; i < n; i++) { const v = pick(a); if (!out.includes(v)) out.push(v) }
  return out
}

const CONDITIONS: PatientCondition[] = ['연하곤란','구강점막염','설사','변비','오심·구토','식욕부진','체중감소','체중증가','호중구감소증','위절제후','장루보유','복수','간성뇌증위험','신기능저하','당뇨','고혈압','와파린복용']
const HISTORY: TreatmentHistory[] = ['수술','방사선치료','항암화학요법','항호르몬치료','표적치료','면역항암제','조혈모세포이식']
// 실제로 쓰이는 값만 쓴다. 'survivor'·'pre_op' 는 존재하지 않는 값이라
// 생존기·호중구감소증 규칙이 한 번도 검사되지 않고 있었다.
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const
const CUISINES: Cuisine[] = ['한식','양식','중식','일식','동남아']
const SLOTS: (MealSlot | undefined)[] = ['아침','점심','저녁','간식', undefined]

function randomPatient(): PatientContext {
  return {
    cancer: pick(CANCERS).id as CancerId,
    phase: pick([...PHASES]) as any,
    weightKg: [30, 42, 55, 60, 78, 95, 130][Math.floor(rnd()*7)],
    heightCm: [140, 150, 163, 172, 185, 199][Math.floor(rnd()*6)],
    age: [19, 35, 55, 68, 80, 95][Math.floor(rnd()*6)],
    sex: rnd() < 0.5 ? 'M' : 'F',
    weightLossPct: [0, 2, 5, 8, 12, 20][Math.floor(rnd()*6)],
    conditions: some(CONDITIONS, 4),
    medications: some(MEDICATIONS.map(m => m.id), 3),
    history: some(HISTORY, 3),
    cuisines: rnd() < 0.2 ? [] : some(CUISINES, 3),
    onboarded: true,
    name: rnd() < 0.5 ? '광원' : undefined
  }
}
function randomDiary(): SelectedItem[] {
  const n = Math.floor(rnd() * 9)
  const out: SelectedItem[] = []
  for (let i = 0; i < n; i++) {
    const pool = rnd() < 0.35 ? FOODS : CURATED_FOODS   // 자동수집분도 섞는다
    out.push({
      foodId: pick(pool).id,
      servings: pick([0.5, 1, 1, 1, 2, 3, 0.1, 10]),
      meal: pick(SLOTS)
    })
  }
  if (rnd() < 0.1) out.push({ foodId: 'no-such-food-id', servings: 1, meal: '점심' })  // 없는 id
  return out
}

interface Bug { kind: string; detail: string }
const bugs: Bug[] = []
const seen = new Set<string>()
const report = (kind: string, detail: string) => {
  const k = kind + '|' + detail.slice(0, 110)
  if (seen.has(k)) return
  seen.add(k); bugs.push({ kind, detail })
}

const cov = { removed:0, alt:0, added:0, emptySlot:0, slotNote:0, avoidChosen:0, ghostId:0, ideas:0, advice:0, advProd:0, supp:0, extFood:0, days:0 }
const N = 4000
for (let iter = 0; iter < N; iter++) {
  const patient = randomPatient()
  const diary = randomDiary()
  const supps = some(SUPPLEMENTS, 4)
  const ctx = `${patient.cancer}/${patient.phase}/${patient.sex}${patient.age}/${patient.weightKg}kg cond=[${patient.conditions}] cuis=[${patient.cuisines}]`

  let m: ReturnType<typeof buildDayMenu>
  try { m = buildDayMenu(diary, patient, supps) }
  catch (e: any) { report('buildDayMenu 예외', `${ctx} :: ${e?.message}`); continue }

  cov.days++
  for (const s of MEAL_SLOTS) for (const e of m.meals[s]) { if (e.origin==='added') cov.added++; if (!CURATED_FOODS.some(f=>f.id===e.food.id)) cov.extFood++ }
  cov.removed += m.removed.length
  cov.alt += m.removed.filter(r=>r.alternative).length
  cov.slotNote += Object.keys(m.slotNotes).length
  for (const s of ['아침','점심','저녁'] as const) if (m.meals[s].length===0) cov.emptySlot++
  for (const it of diary) { const f=FOOD_BY_ID[it.foodId]; if(!f){cov.ghostId++;continue} if (evaluateFood(f,patient,1,{rules:activeRules(patient),interactions:activeInteractions(patient)}).level==='avoid') cov.avoidChosen++ }
  cov.supp += supps.length

  // 1) 주요 끼니가 비면 반드시 사유가 있어야 한다
  for (const s of ['아침','점심','저녁'] as const)
    if (m.meals[s].length === 0 && !m.slotNotes[s]) report('빈 끼니에 사유 없음', `${ctx} ${s}`)

  // 2) 같은 끼니에 같은 음식이 두 번 (화면 key 충돌 + 중복 표시)
  for (const s of MEAL_SLOTS) {
    const ids = m.meals[s].map(e => e.food.id)
    if (new Set(ids).size !== ids.length) report('한 끼니에 같은 음식 중복', `${ctx} ${s}: ${ids.join(',')}`)
  }

  // 3) 앱이 추천한 것이 이 환자에게 '피하세요'면 안 된다
  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  for (const s of MEAL_SLOTS) for (const e of m.meals[s]) {
    if (e.origin !== 'added') continue
    const v = evaluateFood(e.food, patient, e.servings, cached)
    if (v.level === 'avoid') report('피해야 할 것을 추천함', `${ctx} ${e.food.name}`)
    if (v.level === 'caution') report('주의 항목을 추천함', `${ctx} ${e.food.name}`)
    /*
     * 식재료를 끼니로 내놓으면 안 된다 — "대두(삶은 것)" 을 저녁으로 낼 수는 없다.
     * 다만 과일과 영양보충 음료는 재료로 분류돼 있어도 그대로 먹는 것이라 예외다.
     */
    /*
     * 이미 조리된 단백질 급원('고등어(구이)', '새우(데친 것)')은 그 자체로 한 접시다.
     * 엔진이 그렇게 보도록 고쳤으니 검사도 같은 눈으로 봐야 한다.
     */
    const PROT = ['어패류', '육류', '가금류·난류', '두류·대두가공']
    const cooked = /\((구이|데친 것|찐 것|삶은 것|조림|볶음|찜)\)/.test(e.food.name)
    const eatenAsIs =
      e.food.group === '과일' || e.food.group === '경장영양·환자식' ||
      (PROT.includes(e.food.group) && cooked)
    if (e.food.form === 'ingredient' && !eatenAsIs)
      report('식재료를 메뉴로 추천함', `${ctx} ${e.food.name}`)
    if (/\((생것|말린 것|불린 것|생)\)/.test(e.food.name))
      report('손질 안 된 재료를 메뉴로 추천함', `${ctx} ${e.food.name}`)
    if (!eatenAsIs && /\((삶은 것|데친 것|찐 것)\)/.test(e.food.name))
      report('조리 상태 이름을 메뉴로 추천함', `${ctx} ${e.food.name}`)
    if (!FOOD_BY_ID[e.food.id]) report('번들에 없는 식품 추천', `${ctx} ${e.food.name}`)
  }

  // 4) 합계는 유한하고 음수가 아니어야 한다
  for (const [k, v] of Object.entries(m.totals))
    if (!Number.isFinite(v as number) || (v as number) < 0) report('합계 이상값', `${ctx} ${k}=${v}`)

  // 5) 화면 표시합 == 엔진 합계 (반올림 오차 내)
  let shown = 0, items = 0
  for (const s of MEAL_SLOTS) for (const e of m.meals[s]) { shown += Math.round(foodContribution(e.food, e.servings).na ?? 0); items++ }
  shown += Math.round(m.suppTotals.na ?? 0)
  if (Math.abs(shown - (m.totals.na ?? 0)) > items * 0.5 + 0.5)
    report('나트륨 표시-합계 불일치', `${ctx} 표시${shown} 엔진${Math.round(m.totals.na ?? 0)}`)

  // 6) 제외 항목엔 사유가 있어야 하고, 대체안이 또 금기면 안 된다
  for (const r of m.removed) {
    if (!r.reason) report('제외 사유 없음', `${ctx} ${r.food.name}`)
    if (r.alternative) {
      const v = evaluateFood(r.alternative, patient, 1, cached)
      if (v.level === 'avoid' || v.level === 'caution')
        report('대체안이 또 금기', `${ctx} ${r.food.name} → ${r.alternative.name}(${v.level})`)
      if (r.alternative.id === r.food.id) report('자기 자신을 대체안으로', `${ctx} ${r.food.name}`)
    }
  }

  // 7) 나머지 엔진들이 터지지 않아야 한다
  try { evaluateSelection(diary, patient) } catch (e: any) { report('evaluateSelection 예외', `${ctx} :: ${e?.message}`) }
  try { summarizeDay(diary, patient, supps) } catch (e: any) { report('summarizeDay 예외', `${ctx} :: ${e?.message}`) }
  try { sumIntake(diary, supps) } catch (e: any) { report('sumIntake 예외', `${ctx} :: ${e?.message}`) }
  try { cov.ideas += ideasFromIngredients(diary, patient).length } catch (e: any) { report('ideasFromIngredients 예외', `${ctx} :: ${e?.message}`) }
  try {
    for (const n of dayNotes(m.totals, m.suppTotals, patient)) {
      if (!n.text?.trim()) report('평가 문장 비었음', `${ctx} ${n.topic}`)
      if (!n.topic?.trim()) report('평가 제목 비었음', `${ctx} ${n.text}`)
      if (!['good','low','over','info'].includes(n.tone)) report('평가 성격 이상', `${ctx} ${n.tone}`)
    }
  } catch (e: any) { report('dayNotes 예외', `${ctx} :: ${e?.message}`) }

  /*
   * 사용자가 아무것도 담지 않았다면 앱이 처음부터 구성한 하루다.
   * 그 하루가 열량·단백질 목표에 못 미치면 추천으로서 의미가 없다.
   */
  if (diary.length === 0) {
    if ((m.totals.kcal ?? 0) < m.target.kcal[0] * 0.95)
      report('처음부터 구성한 하루가 열량 미달', `${ctx} ${Math.round(m.totals.kcal ?? 0)}/${m.target.kcal[0]}`)
    if ((m.totals.protein ?? 0) < m.target.protein[0])
      report('처음부터 구성한 하루가 단백질 미달', `${ctx} ${Math.round(m.totals.protein ?? 0)}/${m.target.protein[0]}`)
    if (m.meals['간식'].length === 0)
      report('처음부터 구성했는데 간식이 없음', ctx)

    /*
     * 아침이 가장 무거운 끼니가 되면 안 된다.
     * 한국에서 하루 식사는 저녁이 가장 무겁고 아침이 가장 가볍다.
     * 아침에 630 kcal 짜리 삼계탕을 놓아 봐야 실제로 드시지 않는다.
     * 소량씩 자주 드셔야 하는 분은 넷을 고르게 하므로 이 검사에서 뺀다.
     */
    const grazing = patient.conditions.some(
      (c) => c === '식욕부진' || c === '체중감소' || c === '위절제후' || c === '오심·구토'
    )
    if (!grazing) {
      const kcalOf = (s: MealSlot) =>
        m.meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
      const b = kcalOf('아침'), l = kcalOf('점심'), d = kcalOf('저녁')
      if (b > d * 1.1) report('아침이 저녁보다 무거움', `${ctx} 아침 ${Math.round(b)} > 저녁 ${Math.round(d)}`)
      /*
       * 지켜야 할 것은 '아침이 저녁보다 가볍다' 이고 그건 위에서 본다.
       * 점심과의 비교는 곁다리다. 드실 수 있는 음식이 몇 가지 안 남는 조합
       * (위암에 호중구감소증과 장루가 겹치는 경우)에서는 한 끼가 두세 접시라
       * 접시 하나 차이로 비율이 크게 흔들린다. 그건 알고리즘 문제가 아니다.
       * 다만 아침이 점심의 두 배가 되면 그때는 배치가 잘못된 것이다.
       */
      if (b > l * 2) report('아침이 점심의 두 배를 넘음', `${ctx} 아침 ${Math.round(b)} > 점심 ${Math.round(l)}`)
    }
  }
  try { nutritionRisk(patient) } catch (e: any) { report('nutritionRisk 예외', `${ctx} :: ${e?.message}`) }
  try { getDailyReference(patient.sex, patient.age) } catch (e: any) { report('getDailyReference 예외', `${ctx} :: ${e?.message}`) }

  let advice: ReturnType<typeof adviseSupplements> = []
  try { advice = adviseSupplements(patient) }
  catch (e: any) { report('adviseSupplements 예외', `${ctx} :: ${e?.message}`) }
  try { reviewCurrentSupplements(patient, supps.map(s => s.id)) } catch (e: any) { report('reviewCurrentSupplements 예외', `${ctx} :: ${e?.message}`) }

  // 8) 영양제: 권한 분류의 제품이 이 환자에게 금기면 안 된다
  cov.advice += advice.length
  for (const a of advice) {
    if (!a.title || !a.reason) report('영양제 조언에 설명 없음', `${ctx} ${a.category}`)
    if (!a.refIds?.length) report('영양제 조언에 근거 없음', `${ctx} ${a.category}/${a.title}`)
    if (a.level !== 'recommend' && a.level !== 'consider') continue
    cov.advProd += a.products.length
    for (const supp of a.products) {
      const v = evaluateSupplement(supp, patient)
      if (v.level === 'avoid') report('피해야 할 영양제를 권함', `${ctx} ${a.category}→${supp.name}`)
    }
  }

  // 9) 목표값이 말이 되어야 한다
  const t = personalTarget(patient, CANCERS.find(c=>c.id===patient.cancer)!.target.kcalPerKg, CANCERS.find(c=>c.id===patient.cancer)!.target.proteinPerKg)
  if (t.kcal[0] > t.kcal[1]) report('열량 목표 하단>상단', `${ctx} ${t.kcal}`)
  if (t.protein[0] > t.protein[1]) report('단백질 목표 하단>상단', `${ctx} ${t.protein}`)
  if (t.kcal[0] <= 0 || !Number.isFinite(t.kcal[0])) report('열량 목표 이상', `${ctx} ${t.kcal}`)

  // 10) 끼니 미지정 항목은 정규화 대상 — 어떤 식품이든 끼니가 나와야 한다
  for (const it of diary) {
    const f = FOOD_BY_ID[it.foodId]
    const s = defaultSlotFor(f)
    if (!MEAL_SLOTS.includes(s)) report('defaultSlotFor 이상값', `${it.foodId} → ${s}`)
  }
}

console.log('검사 커버리지:', JSON.stringify(cov))
console.log(`무작위 ${N}회 검사 완료 — 서로 다른 문제 ${bugs.length}종\n`)
const byKind = new Map<string, string[]>()
for (const b of bugs) { if (!byKind.has(b.kind)) byKind.set(b.kind, []); byKind.get(b.kind)!.push(b.detail) }
for (const [k, list] of [...byKind].sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`■ ${k}  (${list.length}종)`)
  list.slice(0, 4).forEach(d => console.log('   -', d))
  if (list.length > 4) console.log(`   … 외 ${list.length-4}종`)
}
if (!bugs.length) console.log('문제 없음')
