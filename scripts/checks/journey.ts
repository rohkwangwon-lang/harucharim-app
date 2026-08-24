/**
 * 여덟 번째 검사 — 여러 날에 걸친 사용.
 *
 * 지금까지의 검사는 대부분 '하루 한 장면' 을 본다.
 * 그런데 실제 사용은 며칠·몇 주에 걸쳐 이어지고, 그 사이에 상태가 바뀐다.
 * 치료 시기가 넘어가고, 증상이 생겼다 없어지고, 체중이 오르내린다.
 *
 * 여기서는 무작위로 만든 환자가 30~90일을 실제로 지나가게 해 보고,
 * 그 흐름 위에서만 드러나는 것들을 본다 — 며칠째 같은 것만 나오지 않는지,
 * 상태가 바뀌었는데 식단이 그대로이지 않은지, 어느 날 갑자기 무너지지 않는지.
 */
import { buildDayMenu, recentFoods, fiberGoal, dayNotes, naUnknownNames } from '../../src/engine/menu'
import { summarizeDay } from '../../src/engine/dayScore'
import { evaluateFood, activeRules, activeInteractions, evaluateSelection } from '../../src/engine/rules'
import { foodContribution, personalTarget, targetNotes } from '../../src/engine/nutrition'
import { adviseSupplements, reviewCurrentSupplements } from '../../src/engine/supplementAdvice'
import { CANCERS } from '../../src/data/cancers'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { MEDICATIONS } from '../../src/data/interactions'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS } from '../../src/data/types'
import type { PatientCondition, PatientContext, SelectedItem } from '../../src/data/types'

let seed = 20260824
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length]

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

const CONDS: PatientCondition[] = [
  '연하곤란', '구강점막염', '설사', '변비', '오심·구토', '식욕부진', '체중감소', '체중증가',
  '호중구감소증', '위절제후', '장루보유', '당뇨', '고혈압', '와파린복용', '신기능저하'
]
// 실제로 쓰이는 값만 쓴다. 'survivor'·'pre_op' 는 존재하지 않는 값이라
// 생존기·호중구감소증 규칙이 한 번도 검사되지 않고 있었다.
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const
const dayKey = (base: Date, i: number) => {
  const d = new Date(base); d.setDate(d.getDate() + i)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const RealDate = Date
const useDate = (y: number, m: number, d: number) => {
  ;(globalThis as { Date: DateConstructor }).Date = class extends RealDate {
    constructor(...a: unknown[]) { if (a.length) super(...(a as [])); else super(y, m, d) }
    static now() { return new RealDate(y, m, d).getTime() }
  } as unknown as DateConstructor
}

const PEOPLE = 120
const DAYS = 45
let totalDays = 0, sameAsYesterday = 0, changedAfterCondition = 0, conditionChanges = 0
const shortfalls: number[] = []
const naOvers: number[] = []
let shortDays = 0, naOverDays = 0

for (let person = 0; person < PEOPLE; person++) {
  const startMonth = Math.floor(rnd() * 12)
  const patient: PatientContext = {
    ...DEFAULT_PATIENT, onboarded: true,
    cancer: pick(CANCERS).id,
    phase: pick([...PHASES]) as PatientContext['phase'],
    weightKg: 38 + Math.floor(rnd() * 70),
    heightCm: 145 + Math.floor(rnd() * 45),
    age: 22 + Math.floor(rnd() * 70),
    sex: rnd() < 0.5 ? 'M' : 'F',
    weightLossPct: [0, 0, 3, 7, 13][Math.floor(rnd() * 5)],
    conditions: rnd() < 0.5 ? [pick(CONDS)] : [],
    medications: rnd() < 0.4 ? [pick(MEDICATIONS).id] : [],
    cuisines: rnd() < 0.3 ? ['한식', pick(['양식', '중식', '일식'] as const)] : ['한식']
  }
  const supps = rnd() < 0.4 ? [pick(SUPPLEMENTS)] : []
  const diary: Record<string, SelectedItem[]> = {}
  const weights: Record<string, number> = {}
  let prevIds = ''
  const base = new RealDate(2026, startMonth, 1 + Math.floor(rnd() * 20))

  for (let i = 0; i < DAYS; i++) {
    const key = dayKey(base, i)
    const d = new RealDate(base); d.setDate(d.getDate() + i)
    useDate(d.getFullYear(), d.getMonth(), d.getDate())

    // 도중에 상태가 바뀐다 — 치료 시기가 넘어가거나 증상이 생기고 없어진다
    let changed = false
    if (rnd() < 0.04) { patient.phase = pick([...PHASES]) as PatientContext['phase']; changed = true }
    if (rnd() < 0.06) {
      patient.conditions = rnd() < 0.5 ? [pick(CONDS)] : []
      changed = true
    }
    if (rnd() < 0.03) patient.weightKg = Math.max(35, patient.weightKg + (rnd() < 0.5 ? -1 : 1))

    let menu: ReturnType<typeof buildDayMenu>
    try {
      menu = buildDayMenu([], patient, { supplements: supps, day: key, recent: recentFoods(diary, key) })
    } catch (e) { bad('여러 날 사용 중 예외', `${patient.cancer} ${key} :: ${(e as Error)?.message}`); continue }
    totalDays++

    const ids = MEAL_SLOTS.flatMap((s) => menu.meals[s].map((e) => e.food.id)).sort().join(',')
    if (i > 0 && ids === prevIds) sameAsYesterday++
    if (changed) { conditionChanges++; if (ids !== prevIds) changedAfterCondition++ }
    prevIds = ids

    /* ── 어느 날도 무너지면 안 된다 ── */
    const prof = CANCERS.find((c) => c.id === patient.cancer)!
    const t = personalTarget(patient, prof.target.kcalPerKg, prof.target.proteinPerKg)
    const kcal = menu.totals.kcal ?? 0
    shortfalls.push((t.kcal[0] - kcal) / t.kcal[0])
    if (kcal < t.kcal[0] * 0.9) shortDays++
    /*
     * 목표의 4분의 3에도 못 미치면 그날 식단은 쓸모가 없다. 그건 한 건도 없어야 한다.
     * 그 사이(75~90 %)는 비율로 본다 — 목표가 높고 드실 수 있는 음식이 적은 분이
     * 실제로 있고, 그때는 앱이 "부족합니다" 라고 말하며 경구영양보충을 권하는 것이 맞다.
     */
    if (kcal < t.kcal[0] * 0.75)
      bad('어느 날 식단이 무너짐', `${patient.cancer}/${patient.phase} ${key} ${Math.round(kcal)}/${t.kcal[0]}`)
    if (kcal > t.kcal[1] * 1.2) bad('어느 날 열량이 크게 초과', `${patient.cancer} ${key} ${Math.round(kcal)}/${t.kcal[1]}`)
    const naLimit = prof.target.naLimit ?? 2000
    naOvers.push(((menu.totals.na ?? 0) - naLimit) / naLimit)
    if ((menu.totals.na ?? 0) > naLimit * 1.15) naOverDays++
    // 상한의 1.5 배를 넘으면 '열량이 모자라서' 로도 설명되지 않는다
    if ((menu.totals.na ?? 0) > naLimit * 1.5)
      bad('어느 날 나트륨이 감당 못 할 만큼 초과', `${patient.cancer} ${key} ${Math.round(menu.totals.na ?? 0)}/${naLimit}`)
    for (const s of ['아침', '점심', '저녁'] as const)
      if (menu.meals[s].length === 0 && !menu.slotNotes[s]) bad('빈 끼니에 사유 없음', `${patient.cancer} ${key} ${s}`)

    /* ── 추천한 것이 그 환자에게 금기면 안 된다 ── */
    const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
    for (const s of MEAL_SLOTS) for (const e of menu.meals[s]) {
      const v = evaluateFood(e.food, patient, e.servings, cached)
      if (v.level === 'avoid' || v.level === 'caution')
        bad('그날 상태에서 피해야 할 것을 추천', `${patient.cancer}/${patient.conditions} ${e.food.name} ${v.level}`)
    }

    /* ── 기록으로 남기고 이어서 쓴다 ── */
    diary[key] = MEAL_SLOTS.flatMap((s) =>
      menu.meals[s].map((e) => ({ foodId: e.food.id, servings: e.servings, meal: s }))
    )
    weights[key] = patient.weightKg

    /* ── 기록 화면·평가·영양제도 함께 굴린다 ── */
    try {
      const sum = summarizeDay(diary[key], patient, supps)
      if (!sum.note?.trim()) bad('기록 요약에 한 줄 평 없음', key)
      evaluateSelection(diary[key], patient)
      dayNotes(menu.totals, menu.suppTotals, patient, naUnknownNames(diary[key]))
      targetNotes(patient)
      fiberGoal(patient, prof)
      adviseSupplements(patient)
      reviewCurrentSupplements(patient, supps.map((s) => s.id))
    } catch (e) { bad('부속 화면 계산 중 예외', `${key} :: ${(e as Error)?.message}`) }

    /* ── 화면에 보이는 숫자가 서로 맞아야 한다 ── */
    let shown = 0, n = 0
    for (const s of MEAL_SLOTS) for (const e of menu.meals[s]) { shown += Math.round(foodContribution(e.food, e.servings).na ?? 0); n++ }
    shown += Math.round(menu.suppTotals.na ?? 0)
    if (Math.abs(shown - (menu.totals.na ?? 0)) > n * 0.5 + 0.5)
      bad('나트륨 표시와 합계가 어긋남', `${key} ${shown} vs ${Math.round(menu.totals.na ?? 0)}`)
  }
}
;(globalThis as { Date: DateConstructor }).Date = RealDate

const repeatPct = Math.round((sameAsYesterday / totalDays) * 100)
console.log(`  ${PEOPLE}명 × ${DAYS}일 = ${totalDays.toLocaleString()}일`)
console.log(`  어제와 완전히 같은 날 ${sameAsYesterday}일 (${repeatPct}%)`)
console.log(`  상태가 바뀐 ${conditionChanges}번 중 식단도 바뀐 것 ${changedAfterCondition}번`)
const pct = (a: number[], q: number) => { const s2 = [...a].sort((x, y) => x - y); return (s2[Math.floor(s2.length * q)] * 100).toFixed(1) }
console.log(`  열량 미달률  중앙값 ${pct(shortfalls, 0.5)}% · 90분위 ${pct(shortfalls, 0.9)}% · 최악 ${pct(shortfalls, 0.999)}%`)
console.log(`  나트륨 초과율 중앙값 ${pct(naOvers, 0.5)}% · 90분위 ${pct(naOvers, 0.9)}% · 최악 ${pct(naOvers, 0.999)}%`)

console.log(`  목표의 90 % 에 못 미친 날 ${shortDays} (${(shortDays / totalDays * 100).toFixed(1)}%) · 나트륨 상한 15 % 초과 ${naOverDays} (${(naOverDays / totalDays * 100).toFixed(1)}%)`)

/*
 * 어쩌다 한 번은 어쩔 수 없다. 자주 그러면 알고리즘 문제다.
 * 지금은 열량 3.8 % · 나트륨 3.6 % 수준이고, 대부분 목표가 매우 높은 분(두경부암 90 kg 대)에
 * 몰려 있다. 그런 분께는 앱이 부족하다고 말하고 경구영양보충을 권한다.
 */
if (shortDays / totalDays > 0.08) bad('열량이 모자란 날이 너무 잦음', `${(shortDays / totalDays * 100).toFixed(1)}%`)
if (naOverDays / totalDays > 0.08) bad('나트륨이 크게 넘는 날이 너무 잦음', `${(naOverDays / totalDays * 100).toFixed(1)}%`)
if (repeatPct > 15) bad('어제와 같은 식단이 너무 잦음', `${repeatPct}%`)
if (conditionChanges > 20 && changedAfterCondition / conditionChanges < 0.7)
  bad('상태가 바뀌어도 식단이 그대로', `${changedAfterCondition}/${conditionChanges}`)

console.log(`\n여러 날 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 4).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
