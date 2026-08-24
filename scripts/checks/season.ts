/**
 * 다섯 번째 검사 — 계절.
 *
 * 화면에는 "여름철 추천 식단" 이라고 적혀 있다. 그렇다면 계절이 바뀔 때
 * 실제로 다른 것이 나와야 한다. 예전에는 네 계절이 모두 같았다.
 */
import { buildDayMenu, fiberGoal } from '../../src/engine/menu'
import { CURATED_FOODS } from '../../src/data/foods'
import { foodContribution } from '../../src/engine/nutrition'
import { CANCERS } from '../../src/data/cancers'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS } from '../../src/data/types'

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

/* ── 1. 계절별로 추천할 수 있는 음식이 있는가 ─────────── */
for (const s of ['봄', '여름', '가을', '겨울'] as const) {
  // 재료가 아니라 '그대로 낼 수 있는 것' 기준. 과일은 재료로 분류돼 있어도 그대로 먹는다.
  const servable = CURATED_FOODS.filter(
    (f) => f.season?.includes(s) && (f.form !== 'ingredient' || f.group === '과일')
  )
  if (servable.length < 3) bad('그 계절에 낼 수 있는 음식이 너무 적음', `${s} ${servable.length}종`)
}

/* ── 2. 계절이 바뀌면 결과도 바뀌는가 ─────────────────── */
const RealDate = Date
const fake = (m: number) => {
  ;(globalThis as { Date: DateConstructor }).Date = class extends RealDate {
    constructor(...a: unknown[]) { if (a.length) super(...(a as [])); else super(2026, m - 1, 15) }
    static now() { return new RealDate(2026, m - 1, 15).getTime() }
  } as unknown as DateConstructor
}

let distinctSum = 0, cancers = 0, starred = 0, slots = 0
/** 네 계절이 모두 같은 암종 — 없어야 좋지만, 후보가 정말 없어서 그럴 수도 있다 */
const flat: string[] = []
for (const prof of CANCERS) {
  const seen: string[] = []
  for (const m of [4, 7, 10, 1]) {
    fake(m)
    const patient = { ...DEFAULT_PATIENT, onboarded: true, cancer: prof.id }
    const menu = buildDayMenu([], patient, [])
    slots++

    // 계절 판정이 달력과 맞는가
    const want = m === 4 ? '봄' : m === 7 ? '여름' : m === 10 ? '가을' : '겨울'
    if (menu.season !== want) bad('계절 판정이 달력과 다름', `${m}월 → ${menu.season} (${want} 이어야 함)`)

    const items = MEAL_SLOTS.flatMap((s) => menu.meals[s].map((e) => ({ n: e.food.name, s: e.seasonal })))
    if (items.some((x) => x.s)) starred++
    // 제철 표시가 붙은 것은 실제로 그 계절 음식이어야 한다
    for (const it of items) {
      if (!it.s) continue
      const f = CURATED_FOODS.find((x) => x.name === it.n)
      if (f && !f.season?.includes(menu.season)) bad('제철이 아닌데 제철로 표시됨', `${menu.season} ${it.n}`)
    }
    // 제철을 챙기느라 영양이 무너지면 안 된다
    const fg = fiberGoal(patient, prof)
    if ((menu.totals.kcal ?? 0) < menu.target.kcal[0] * 0.95)
      bad('제철 반영 후 열량 미달', `${prof.id}/${menu.season} ${Math.round(menu.totals.kcal ?? 0)}`)
    if ((menu.totals.protein ?? 0) < menu.target.protein[0])
      bad('제철 반영 후 단백질 미달', `${prof.id}/${menu.season}`)
    /*
     * 나트륨 상한은 넘을 수 있다 — 열량·단백질이 모자란 동안에는 먹이는 쪽을 먼저 본다(ESPEN).
     * 여기서 볼 것은 "제철을 챙기느라" 넘겼는가다.
     * 그래서 열량이 이미 목표에 닿았는데도 넘긴 경우만 문제로 센다.
     */
    /*
     * 나트륨 상한.
     *
     * 조금 넘는 것까지 잡지는 않는다. 엔진은 열량·단백질이 모자란 동안에는
     * 상한을 넘겨서라도 먹이도록 되어 있고(ESPEN), 그 결과는 화면에 '넘음' 으로
     * 빨갛게 표시된다. 여기서 볼 것은 그 여유를 핑계로 크게 넘기지는 않는가다.
     */
    const naLimit = prof.target.naLimit ?? 2000
    if ((menu.totals.na ?? 0) > naLimit * 1.1)
      bad('나트륨을 크게 넘김', `${prof.id}/${menu.season} ${Math.round(menu.totals.na ?? 0)} / ${naLimit}`)

    void fg

    seen.push(JSON.stringify(items.map((x) => x.n)))
  }
  const n = new Set(seen).size
  distinctSum += n; cancers++
  if (n === 1) flat.push(prof.id)
}
;(globalThis as { Date: DateConstructor }).Date = RealDate

console.log(`  암종 ${cancers}종 · 평균 ${(distinctSum / cancers).toFixed(1)}/4 계절이 서로 다름`)
console.log(`  제철 음식이 실제로 들어간 경우 ${starred}/${slots} (${Math.round(starred / slots * 100)}%)`)
if (flat.length) console.log(`  네 계절이 같은 암종: ${flat.join(', ')}`)

/*
 * 얼마나 갈려야 충분한가.
 *
 * 암종마다 규칙이 다르고 계절 음식이 그 규칙을 통과하지 못하는 경우가 있다.
 * 예를 들어 봄 제철 과일은 딸기 하나뿐이라 48 kcal 인데, 열량 목표가 1,800 kcal 인
 * 식도암·두경부암에서는 126 kcal 짜리 단감을 대신할 수 없다.
 * 그래서 암종별로 못을 박지 않고 전체 평균으로 본다.
 * 예전처럼 네 계절이 통째로 같아지는 회귀는 이 선에서 잡힌다.
 */
const avg = distinctSum / cancers
if (avg < 2.5) bad('계절이 결과를 거의 바꾸지 못함', `평균 ${avg.toFixed(1)}/4`)
if (starred / slots < 0.4) bad('제철 음식이 거의 들어가지 않음', `${Math.round(starred / slots * 100)}%`)
if (flat.length > 3) bad('네 계절이 같은 암종이 너무 많음', flat.join(', '))

console.log(`\n계절 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 5).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
