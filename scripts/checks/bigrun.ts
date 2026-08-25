/**
 * 대규모 무작위 실행.
 *
 * 지금까지의 검사는 각자 한 가지를 본다. 여기서는 그 규칙들을 한자리에 모아
 * 훨씬 큰 표본으로 돌린다. 드물게만 나타나는 조합은 작은 표본에서 보이지 않는다.
 *
 * 그리고 실행하면서 무엇이 얼마나 자주 추천되는지 센다.
 * 앱이 "무슨 말을 하는가" 는 규칙을 읽으면 알 수 있지만,
 * "무엇을 실제로 내놓는가" 는 돌려 봐야 안다. 그 둘은 같지 않을 수 있다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildDayMenu, recentFoods, fiberGoal, dayNotes, naUnknownNames, intakeTrend } from '../../src/engine/menu'
import { summarizeDay } from '../../src/engine/dayScore'
import { evaluateFood, activeRules, activeInteractions, evaluateSelection } from '../../src/engine/rules'
import { foodContribution, personalTarget, targetNotes, nutritionRisk, effectiveLossPct } from '../../src/engine/nutrition'
import { adviseSupplements } from '../../src/engine/supplementAdvice'
import { CANCERS } from '../../src/data/cancers'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { MEDICATIONS } from '../../src/data/interactions'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS } from '../../src/data/types'
import type { MealSlot, PatientCondition, PatientContext, SelectedItem } from '../../src/data/types'

const PEOPLE = Number(process.env.PEOPLE ?? 2000)
const DAYS = Number(process.env.DAYS ?? 90)

let seed = 19700101
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length) % a.length]

const bugs: string[] = []
const seenB = new Set<string>()
/** 유형별 실제 발생 건수 — 유형 수만 세면 얼마나 흔한지 알 수 없다 */
const hits = new Map<string, number>()
const bad = (k: string, d: string) => {
  hits.set(k, (hits.get(k) ?? 0) + 1)
  const s = `${k} :: ${d}`
  if (!seenB.has(s)) { seenB.add(s); bugs.push(s) }
}

const CONDS: PatientCondition[] = [
  '연하곤란', '구강점막염', '설사', '변비', '오심·구토', '식욕부진', '체중감소', '체중증가',
  '호중구감소증', '위절제후', '장루보유', '복수', '간성뇌증위험', '신기능저하', '당뇨', '고혈압', '와파린복용'
]
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const
const CUISINES = ['양식', '중식', '일식', '동남아'] as const

const RealDate = Date
const useDate = (d: Date) => {
  ;(globalThis as { Date: DateConstructor }).Date = class extends RealDate {
    constructor(...a: unknown[]) { if (a.length) super(...(a as [])); else super(d.getFullYear(), d.getMonth(), d.getDate()) }
    static now() { return d.getTime() }
  } as unknown as DateConstructor
}
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* 무엇이 얼마나 나왔는지 */
interface Stat {
  name: string; group: string; kcal: number; na: number; protein: number; fiber: number
  count: number; seasonal: number; withEvidence: number
  slots: Record<MealSlot, number>
  cancers: Map<string, number>
}
const stats = new Map<string, Stat>()
let totalItems = 0, totalDays = 0

const now0 = new RealDate().getTime()
const realNow = () => new RealDate().getTime()
for (let person = 0; person < PEOPLE; person++) {
  if (person % 200 === 0 && person > 0)
    process.stdout.write(`\r  ${person}/${PEOPLE}명 · ${totalDays.toLocaleString()}일 · ${Math.round((realNow() - now0) / 1000)}초   `)

  const h = 142 + Math.floor(rnd() * 52)
  const patient: PatientContext = {
    ...DEFAULT_PATIENT, onboarded: true,
    cancer: pick(CANCERS).id,
    phase: pick(PHASES) as PatientContext['phase'],
    weightKg: 34 + Math.floor(rnd() * 96),
    heightCm: h,
    age: 19 + Math.floor(rnd() * 76),
    sex: rnd() < 0.5 ? 'M' : 'F',
    weightLossPct: [0, 0, 0, 3, 7, 12, 18][Math.floor(rnd() * 7)],
    conditions: rnd() < 0.55 ? [pick(CONDS)] : rnd() < 0.4 ? [pick(CONDS), pick(CONDS)] : [],
    medications: rnd() < 0.35 ? [pick(MEDICATIONS).id] : [],
    cuisines: rnd() < 0.28 ? ['한식', pick(CUISINES)] : ['한식']
  }
  const supps = rnd() < 0.35 ? [pick(SUPPLEMENTS)] : []
  const diary: Record<string, SelectedItem[]> = {}
  const start = new RealDate(2026, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 25))

  for (let i = 0; i < DAYS; i++) {
    const d = new RealDate(start); d.setDate(d.getDate() + i)
    useDate(d)
    const key = fmt(d)

    // 지내는 동안 상태가 바뀐다
    if (rnd() < 0.03) patient.phase = pick(PHASES) as PatientContext['phase']
    if (rnd() < 0.05) patient.conditions = rnd() < 0.5 ? [pick(CONDS)] : []
    if (rnd() < 0.04) patient.weightKg = Math.max(32, Math.min(140, patient.weightKg + (rnd() < 0.5 ? -1 : 1)))

    let menu: ReturnType<typeof buildDayMenu>
    try {
      menu = buildDayMenu([], patient, { supplements: supps, day: key, recent: recentFoods(diary, key) })
    } catch (e) { bad('식단 구성 중 예외', `${patient.cancer}/${patient.phase} :: ${(e as Error)?.message}`); continue }
    totalDays++

    const prof = CANCERS.find((c) => c.id === patient.cancer)!
    const target = personalTarget(patient, prof.target.kcalPerKg, prof.target.proteinPerKg)
    const naLimit = prof.target.naLimit ?? 2000
    const ctx = `${patient.cancer}/${patient.phase}/${patient.sex}${patient.age}/${patient.weightKg}kg cond=[${patient.conditions}]`
    const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }

    /* ── 하루가 성립하는가 ── */
    const kcal = menu.totals.kcal ?? 0
    if (kcal < target.kcal[0] * 0.75) bad('식단이 무너짐', `${ctx} ${Math.round(kcal)}/${target.kcal[0]}`)
    if (kcal > target.kcal[1] * 1.25) bad('열량이 크게 초과', `${ctx} ${Math.round(kcal)}/${target.kcal[1]}`)
    if ((menu.totals.na ?? 0) > naLimit * 1.5) bad('나트륨이 감당 못 할 만큼 초과', `${ctx} ${Math.round(menu.totals.na ?? 0)}/${naLimit}`)
    for (const s of ['아침', '점심', '저녁'] as const)
      if (menu.meals[s].length === 0 && !menu.slotNotes[s]) bad('빈 끼니에 사유 없음', `${ctx} ${s}`)
    for (const [k, v] of Object.entries(menu.totals))
      if (!Number.isFinite(v as number) || (v as number) < -1e-9) bad('합계 이상값', `${ctx} ${k}=${v}`)

    /* ── 끼니가 상차림으로 읽히는가 ── */
    const grazing = patient.conditions.some((c) => ['식욕부진', '체중감소', '위절제후', '오심·구토'].includes(c))
    if (!grazing) {
      const kc = (s: MealSlot) => menu.meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
      if (kc('아침') > kc('저녁') * 1.1) bad('아침이 저녁보다 무거움', `${ctx} ${Math.round(kc('아침'))} > ${Math.round(kc('저녁'))}`)
    }

    /*
     * 하루가 어떻게 나뉘었는지 — 순서만이 아니라 크기도 본다.
     *
     * 여태 아침과 저녁의 '순서' 만 견주고 있었다. 그래서 아침 128 · 점심 104 ·
     * 저녁 390 · 간식 976 인 날이 아무 신고 없이 지나갔다. 순서는 맞았기 때문이다.
     * 간식이 하루의 61 % 를 지고 있었고 아침·점심은 식사라고 부를 수 없었다.
     * 경장영양·음료가 간식에만 갈 수 있어 거기로 몰린 탓이었다.
     *
     * 잦은 소량 식사를 하시는 분에게도 이 기준은 그대로다 —
     * 넷으로 고르게 나누자는 것이지 간식 하나에 몰자는 것이 아니다.
     */
    {
      const kc = (s: MealSlot) => menu.meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
      const day = MEAL_SLOTS.reduce((n, s) => n + kc(s), 0)
      if (day > 400) {
        if (kc('간식') > day * 0.35)
          bad('간식이 하루를 지고 있음', `${ctx} 간식 ${Math.round(kc('간식'))} / 하루 ${Math.round(day)}`)
        for (const s of ['아침', '점심', '저녁'] as MealSlot[]) {
          if (kc(s) < day * 0.08)
            bad('한 끼가 식사라고 하기 어려움', `${ctx} ${s} ${Math.round(kc(s))} / 하루 ${Math.round(day)}`)
        }
      }

      /*
       * 단백질은 아래만 보고 있었다. 그래서 목표 62~78 g 인 분께 111 g 을 내놓고도
       * '적정' 이라고 적었다. 위험해서라기보다, 앱이 제 목표를 스스로 부정하면
       * 나머지 숫자도 믿기 어려워진다. 신장이 걸리는 분에게는 실제로 위험하다.
       */
      const prot = menu.totals.protein ?? 0
      const hi = menu.target.protein[1]
      if (patient.conditions.includes('신기능저하') && prot > hi * 1.3)
        bad('신기능이 떨어진 분께 단백질이 과함', `${ctx} ${Math.round(prot)} g / 목표 ${hi} g`)
      if (prot > hi * 1.25) {
        const told = menu.notes.some((n) => n.topic === '단백질' && /보다 많습니다/.test(n.text))
        if (!told) bad('단백질이 넘쳤는데 말하지 않음', `${ctx} ${Math.round(prot)} g / 목표 ${hi} g`)
      }
    }
    for (const s of MEAL_SLOTS) {
      const ids = menu.meals[s].map((e) => e.food.id)
      if (new Set(ids).size !== ids.length) bad('한 끼니에 같은 음식 중복', `${ctx} ${s}`)
      const byGroup = new Map<string, number>()
      for (const e of menu.meals[s]) byGroup.set(e.food.group, (byGroup.get(e.food.group) ?? 0) + 1)
      for (const [g, n] of byGroup)
        if (['과일', '우유·유제품', '음료', '간식·디저트'].includes(g) && n > 1)
          bad('한 끼니에 같은 종류가 둘', `${ctx} ${s} ${g} ${n}개`)
    }

    /* ── 추천이 이 환자에게 맞는가 · 그리고 무엇이 나왔는지 센다 ── */
    for (const s of MEAL_SLOTS) for (const e of menu.meals[s]) {
      const v = evaluateFood(e.food, patient, e.servings, cached)
      if (v.level === 'avoid' || v.level === 'caution')
        bad('피해야 할 것을 추천', `${ctx} ${e.food.name} ${v.level}`)
      // 조리를 마친 단백질 급원('연어(구이)', '새우(데친 것)')은 그대로 한 접시다.
      const PROT = ['어패류', '육류', '가금류·난류', '두류·대두가공']
      const eatenAsIs =
        e.food.group === '과일' || e.food.group === '경장영양·환자식' ||
        (PROT.includes(e.food.group) &&
          /\((구이|데친 것|찐 것|삶은 것|조림|볶음|찜)\)/.test(e.food.name))
      if (e.food.form === 'ingredient' && !eatenAsIs)
        bad('식재료를 메뉴로 추천', `${ctx} ${e.food.name}`)
      if (e.food.tags.some((t) => ['알코올', '가공육', '염장', '훈제', '튀김', '직화구이', '초가공식품'].includes(t as string)))
        bad('먼저 권하지 않기로 한 것을 추천', `${ctx} ${e.food.name}`)

      const c = foodContribution(e.food, e.servings)
      let st = stats.get(e.food.id)
      if (!st) {
        st = {
          name: e.food.name, group: e.food.group,
          kcal: Math.round(c.kcal ?? 0), na: Math.round(c.na ?? 0),
          protein: Math.round((c.protein ?? 0) * 10) / 10, fiber: Math.round((c.fiber ?? 0) * 10) / 10,
          count: 0, seasonal: 0, withEvidence: 0,
          slots: { 아침: 0, 점심: 0, 저녁: 0, 간식: 0 }, cancers: new Map()
        }
        stats.set(e.food.id, st)
      }
      st.count++; totalItems++
      if (e.seasonal) st.seasonal++
      if (e.evidence) st.withEvidence++
      st.slots[s]++
      st.cancers.set(patient.cancer, (st.cancers.get(patient.cancer) ?? 0) + 1)
    }

    diary[key] = MEAL_SLOTS.flatMap((s) => menu.meals[s].map((e) => ({ foodId: e.food.id, servings: e.servings, meal: s })))

    /* ── 부속 계산도 함께 굴린다 ── */
    try {
      summarizeDay(diary[key], patient, supps)
      evaluateSelection(diary[key], patient)
      dayNotes(menu.totals, menu.suppTotals, patient, naUnknownNames(diary[key]))
      targetNotes(patient); nutritionRisk(patient); effectiveLossPct(patient)
      fiberGoal(patient, prof); adviseSupplements(patient); intakeTrend(diary, patient, key)
    } catch (e) { bad('부속 계산 중 예외', `${ctx} :: ${(e as Error)?.message}`) }
  }
}
;(globalThis as { Date: DateConstructor }).Date = RealDate
process.stdout.write('\r' + ' '.repeat(70) + '\r')

const secs = Math.round((realNow() - now0) / 1000)
console.log(`  ${PEOPLE.toLocaleString()}명 × ${DAYS}일 = ${totalDays.toLocaleString()}일 · ${totalItems.toLocaleString()}건 추천 · ${secs}초`)
console.log(`  서로 다른 음식 ${stats.size}종이 쓰였다`)

/* ── 많이 나온 순서로 파일에 적는다 ── */
const ranked = [...stats.entries()].sort((a, b) => b[1].count - a[1].count)
const top = ranked.slice(0, 100)
const dayPct = (n: number) => ((n / totalDays) * 100).toFixed(1)

const lines: string[] = []
lines.push('# 온코푸드 — 가장 자주 추천되는 식단 100')
lines.push('')
lines.push(`무작위로 만든 환자 ${PEOPLE.toLocaleString()}명이 ${DAYS}일씩 지내게 하고(${totalDays.toLocaleString()}일),`)
lines.push(`앱이 실제로 내놓은 ${totalItems.toLocaleString()}건을 세었습니다. 암종·치료 시기·증상·계절은 모두 무작위입니다.`)
lines.push('')
lines.push('앱이 "무슨 말을 하는가" 는 규칙을 읽으면 알 수 있지만, "무엇을 실제로 내놓는가" 는 돌려 봐야 압니다.')
lines.push('이 표는 그 둘이 같은지 확인하시라고 만들었습니다.')
lines.push('')
lines.push(`- 쓰인 음식 **${stats.size}종** · 상위 10종이 전체의 **${(top.slice(0, 10).reduce((n, [, s]) => n + s.count, 0) / totalItems * 100).toFixed(1)}%**`)
lines.push(`- 근거 규칙이 붙은 추천 **${(ranked.reduce((n, [, s]) => n + s.withEvidence, 0) / totalItems * 100).toFixed(1)}%**`)
lines.push('')
lines.push('| # | 음식 | 식품군 | 1회 제공량 | 나온 날 | 주로 오르는 끼니 | 근거 | 제철 |')
lines.push('|---:|---|---|---|---:|---|---:|---:|')
top.forEach(([, s], i) => {
  const slot = (Object.entries(s.slots) as [MealSlot, number][]).sort((a, b) => b[1] - a[1])[0]
  const slotPct = Math.round((slot[1] / s.count) * 100)
  lines.push(
    `| ${i + 1} | ${s.name} | ${s.group} | ${s.kcal} kcal · 단백 ${s.protein} g · Na ${s.na} mg |` +
    ` ${dayPct(s.count)}% | ${slot[0]} ${slotPct}% |` +
    ` ${Math.round((s.withEvidence / s.count) * 100)}% | ${s.seasonal ? `${Math.round((s.seasonal / s.count) * 100)}%` : '-'} |`
  )
})
lines.push('')
lines.push('## 읽는 법')
lines.push('')
lines.push('- **나온 날** — 그 음식이 추천에 오른 날의 비율입니다. 100 % 면 매일 나왔다는 뜻입니다.')
lines.push('- **근거** — 그 추천에 임상 규칙이 붙은 비율입니다. 낮으면 "특별히 권하거나 피할 이유는 없지만 모자란 부분을 채우려고" 넣은 것입니다.')
lines.push('- **제철** — 제철로 표시되어 오른 비율입니다. 계절 음식이 아니면 `-` 입니다.')
lines.push('')
lines.push('한 음식이 지나치게 자주 오르면 후보가 부족하다는 뜻입니다. 그 자리에 넣을 만한 음식을 늘리면 됩니다.')
lines.push('')
lines.push('## 식품군별 비중')
lines.push('')
const byGroup = new Map<string, number>()
for (const [, s] of ranked) byGroup.set(s.group, (byGroup.get(s.group) ?? 0) + s.count)
lines.push('| 식품군 | 비중 |')
lines.push('|---|---:|')
for (const [g, n] of [...byGroup].sort((a, b) => b[1] - a[1]))
  lines.push(`| ${g} | ${(n / totalItems * 100).toFixed(1)}% |`)
lines.push('')
lines.push('---')
lines.push('')
lines.push('`node_modules/.bin/jiti scripts/checks/bigrun.ts` 로 다시 만들 수 있습니다.')
lines.push('난수는 고정 씨앗이라 같은 결과가 나옵니다.')

const out = path.join(process.cwd(), 'docs', '추천-식단-top100.md')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, lines.join('\n'))
console.log(`  → docs/추천-식단-top100.md 에 적었습니다`)

console.log(`\n대규모 실행 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  const n = hits.get(k) ?? 0
  console.log(`■ ${k} — ${n.toLocaleString()}일 (${(n / totalDays * 100).toFixed(2)}%) · 서로 다른 상황 ${l.length}가지`)
  l.slice(0, 3).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
