/**
 * 세 번째 검사 — 기록 저장/정규화와 기록 화면 집계.
 */
import { defaultSlotFor } from '../../src/engine/menu'
import { summarizeDay } from '../../src/engine/dayScore'
import { sumIntake, foodContribution } from '../../src/engine/nutrition'
import { FOODS, FOOD_BY_ID } from '../../src/data/foods'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { CANCERS } from '../../src/data/cancers'
import { MEAL_SLOTS } from '../../src/data/types'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { addDays, toKey, weekOf, monthOf } from '../../src/lib/day'
import type { MealSlot, SelectedItem } from '../../src/data/types'

let seed = 4242
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

// store.ts 의 normalizeDay 와 같은 규칙 (그쪽은 내보내지 않으므로 동작을 그대로 확인한다)
function normalizeDay(list: SelectedItem[]): SelectedItem[] {
  const out: SelectedItem[] = []
  for (const item of list) {
    const meal: MealSlot = item.meal ?? defaultSlotFor(FOOD_BY_ID[item.foodId])
    const same = out.find((x) => x.foodId === item.foodId && x.meal === meal)
    if (same) same.servings = Math.round((same.servings + item.servings) * 10) / 10
    else out.push({ ...item, meal })
  }
  return out
}

const SLOTS: (MealSlot | undefined)[] = [...MEAL_SLOTS, undefined, undefined]

for (let i = 0; i < 3000; i++) {
  const n = Math.floor(rnd() * 12)
  const raw: SelectedItem[] = []
  for (let k = 0; k < n; k++)
    raw.push({ foodId: pick(FOODS).id, servings: pick([0.5,1,2,3]), meal: pick(SLOTS) })
  if (rnd() < 0.15) raw.push({ foodId: 'unknown-id-xyz', servings: 1, meal: pick(SLOTS) })

  const norm = normalizeDay(raw)

  // 1) 정규화 후에는 끼니 없는 항목이 없어야 한다
  for (const it of norm) if (!it.meal || !MEAL_SLOTS.includes(it.meal)) bad('정규화 후에도 끼니 없음', it.foodId)

  // 2) 어느 끼니에도 안 뜨는 항목이 없어야 한다 (화면에서 사라지는 기록)
  const visible = MEAL_SLOTS.flatMap((s) => norm.filter((x) => x.meal === s))
  if (visible.length !== norm.length) bad('화면에 안 뜨는 기록이 남음', `${norm.length - visible.length}건`)

  // 3) 같은 끼니에 같은 음식이 두 번 남으면 안 된다
  const keys = norm.map((x) => `${x.foodId}|${x.meal}`)
  if (new Set(keys).size !== keys.length) bad('정규화 후 중복', keys.join(','))

  // 4) 총 인분이 보존되어야 한다 (합쳐질 뿐 사라지면 안 된다)
  const before = new Map<string, number>()
  for (const it of raw) {
    const key = `${it.foodId}|${it.meal ?? defaultSlotFor(FOOD_BY_ID[it.foodId])}`
    before.set(key, (before.get(key) ?? 0) + it.servings)
  }
  for (const it of norm) {
    const want = before.get(`${it.foodId}|${it.meal}`) ?? 0
    if (Math.abs(want - it.servings) > 0.051) bad('인분이 보존되지 않음', `${it.foodId} ${want}≠${it.servings}`)
  }

  // 5) 영양 합계는 정규화 전후가 같아야 한다
  const a = sumIntake(raw, []), b = sumIntake(norm, [])
  for (const k of ['kcal','protein','na','carb','fat'] as const)
    if (Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 0.01) bad('정규화가 합계를 바꿈', `${k} ${a[k]}≠${b[k]}`)

  // 6) 두 번 정규화해도 같아야 한다
  if (JSON.stringify(normalizeDay(norm)) !== JSON.stringify(norm)) bad('정규화가 안정적이지 않음', '')

  // 7) 기록 요약
  const patient = { ...DEFAULT_PATIENT, onboarded: true, cancer: pick(CANCERS).id as any }
  const supps = rnd() < 0.4 ? [pick(SUPPLEMENTS)] : []
  const s = summarizeDay(norm, patient, supps)
  if (norm.length === 0 && s.grade !== 'none') bad('빈 날인데 등급이 매겨짐', s.grade)
  if (norm.length > 0 && s.grade === 'none' && !s.empty) bad('기록이 있는데 없음으로 판정', '')
  if (!Number.isFinite(s.kcal) || s.kcal < 0) bad('요약 열량 이상', String(s.kcal))
  if (!Number.isFinite(s.na) || s.na < 0) bad('요약 나트륨 이상', String(s.na))
  if (!s.note?.trim()) bad('요약 한 줄 평 없음', s.grade)
  // 등급과 숫자가 어긋나면 안 된다
  if (s.grade === 'none' && s.kcal > 0) bad('기록없음인데 열량 있음', String(s.kcal))
}

/* 주/월 집계: 어떤 날을 기준으로 잡아도 그 날이 포함되고 중복이 없어야 한다 */
{
  let d = new Date(2024, 0, 1)
  for (let i = 0; i < 900; i++) {
    const k = toKey(d)
    const w = weekOf(k), mo = monthOf(k)
    if (new Set(w).size !== 7) bad('주에 중복 날짜', k)
    if (new Set(mo).size !== mo.length) bad('달에 중복 날짜', k)
    if (!w.includes(k) || !mo.includes(k)) bad('기준일이 집계에서 빠짐', k)
    // 주 평균 계산에 쓰는 '기록한 날' 수가 7을 넘으면 안 된다
    if (w.filter((x) => mo.includes(x)).length > 7) bad('주-달 교집합 이상', k)
    d = new Date(d); d.setDate(d.getDate() + 1)
  }
}

/* 체중 추이: 5 % 이상 감소 경고가 올바른가 */
{
  for (let i = 0; i < 500; i++) {
    const start = 40 + rnd() * 60
    const end = start * (0.7 + rnd() * 0.5)
    const pct = ((end - start) / start) * 100
    const warn = pct <= -5
    const shouldWarn = end <= start * 0.95
    if (warn !== shouldWarn) bad('체중 감소 경고 기준 불일치', `${start.toFixed(1)}→${end.toFixed(1)} ${pct.toFixed(1)}%`)
  }
}

console.log(`세 번째 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0,4).forEach(d=>console.log('   -',d))
}
if (!bugs.length) console.log('문제 없음')
