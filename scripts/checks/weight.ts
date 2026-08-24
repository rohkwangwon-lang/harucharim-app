/**
 * 아홉 번째 검사 — 체중이 오르내릴 때.
 *
 * 치료를 받는 동안 체중은 가만히 있지 않는다.
 * 과체중이던 분이 정상이 되기도 하고, 정상이던 분이 빠지기도 하고,
 * 빠졌다가 회복되기도 한다. 그때마다 목표와 권고가 따라 움직여야 한다.
 *
 * 특히 위험한 쪽은 '빠지고 있는데 앱이 모르는' 경우다.
 * 앱은 매일 체중을 받아 적으면서도 그 기록을 계산에 쓰지 않고 있었다.
 */
import { observedWeightLoss, effectiveLossPct, nutritionRisk, personalTarget, targetNotes, dosingWeight } from '../../src/engine/nutrition'
import { buildDayMenu } from '../../src/engine/menu'
import { adviseSupplements } from '../../src/engine/supplementAdvice'
import { CANCERS } from '../../src/data/cancers'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { PatientContext } from '../../src/data/types'

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

let seed = 771103
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length]

const key = (base: Date, i: number) => {
  const d = new Date(base); d.setDate(d.getDate() + i)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── 1. 기록에서 감소를 읽어 내는가 ─────────────────── */
{
  const base = new Date(2026, 3, 1)
  const mk = (from: number, to: number, days: number) => {
    const w: Record<string, number> = {}
    for (let i = 0; i < days; i++) w[key(base, i)] = Math.round((from + (to - from) * (i / (days - 1))) * 10) / 10
    return { w, today: key(base, days - 1) }
  }

  const flat = mk(65, 65, 60)
  if (observedWeightLoss(flat.w, flat.today) !== null) bad('체중이 그대로인데 감소로 읽음', '65 kg 유지')

  const gained = mk(60, 66, 60)
  if (observedWeightLoss(gained.w, gained.today) !== null) bad('체중이 늘었는데 감소로 읽음', '60 → 66 kg')

  for (const [from, to, pct] of [[70, 62, 11.4], [80, 76, 5], [55, 52.8, 4]] as const) {
    const s = mk(from, to, 60)
    const o = observedWeightLoss(s.w, s.today)
    if (!o) { bad('감소를 읽지 못함', `${from} → ${to}`); continue }
    if (Math.abs(o.pct - pct) > 0.6) bad('감소율 계산이 어긋남', `${from} → ${to} = ${o.pct}% (${pct}% 이어야 함)`)
  }

  // 기간이 짧거나 기록이 적으면 섣불리 판단하지 않는다
  const short = mk(70, 62, 10)
  if (observedWeightLoss(short.w, short.today) !== null) bad('기간이 짧은데 감소로 단정', '10일')
  const one: Record<string, number> = { [key(base, 0)]: 70 }
  if (observedWeightLoss(one, key(base, 40)) !== null) bad('기록 하나로 감소를 판단', '1건')

  // 한 번 잘못 적은 값에 흔들리지 않아야 한다
  const noisy = mk(65, 65, 60)
  noisy.w[key(base, 30)] = 6.5   // 65 를 6.5 로 잘못 적음
  const o2 = observedWeightLoss(noisy.w, noisy.today)
  if (o2 && o2.pct > 3) bad('잘못 적은 값에 휘둘림', `${o2.pct}%`)
}

/* ── 2. 체중이 바뀌면 목표와 권고가 따라오는가 ──────── */
let runs = 0
for (let i = 0; i < 400; i++) {
  const prof = pick(CANCERS)
  const h = 150 + Math.floor(rnd() * 40)
  const base: PatientContext = {
    ...DEFAULT_PATIENT, onboarded: true, cancer: prof.id,
    phase: pick(['during_rt', 'during_chemo', 'post_op', 'survivorship'] as const) as PatientContext['phase'],
    heightCm: h, age: 30 + Math.floor(rnd() * 50), sex: rnd() < 0.5 ? 'M' : 'F',
    conditions: rnd() < 0.4 ? ['체중증가'] : []
  }
  const bmi = (kg: number) => kg / Math.pow(h / 100, 2)
  const at = (kg: number, lost = 0) => ({ ...base, weightKg: kg, observedLossPct: lost })

  // 비만 → 정상
  const heavy = at(Math.round(32 * Math.pow(h / 100, 2)))
  const normal = at(Math.round(21.5 * Math.pow(h / 100, 2)))
  runs++
  if (dosingWeight(heavy) >= heavy.weightKg) bad('비만인데 보정체중을 쓰지 않음', `BMI ${bmi(heavy.weightKg).toFixed(1)}`)
  if (dosingWeight(normal) !== normal.weightKg) bad('정상 체중인데 보정체중을 씀', `BMI ${bmi(normal.weightKg).toFixed(1)}`)
  if (!targetNotes(heavy).some((n) => n.label.includes('보정체중'))) bad('보정체중을 쓰면서 밝히지 않음', prof.id)
  if (targetNotes(normal).some((n) => n.label.includes('보정체중'))) bad('보정체중을 안 쓰는데 밝힘', prof.id)

  // 저체중 → 정상
  const thin = at(Math.round(17 * Math.pow(h / 100, 2)))
  if (nutritionRisk(thin).risk !== 'high') bad('저체중인데 고위험이 아님', `BMI ${bmi(thin.weightKg).toFixed(1)}`)
  if (nutritionRisk(normal).risk === 'high' && !normal.conditions.length)
    bad('정상 체중인데 고위험', `BMI ${bmi(normal.weightKg).toFixed(1)}`)

  // 정상인데 빠지고 있는 경우 — 목표를 낮추면 안 된다
  const losing = at(normal.weightKg, 7)
  const tLosing = personalTarget(losing, prof.target.kcalPerKg, prof.target.proteinPerKg)
  const tPlain = personalTarget(at(normal.weightKg, 0), prof.target.kcalPerKg, prof.target.proteinPerKg)
  if (tLosing.kcal[0] < tPlain.kcal[0]) bad('빠지고 있는데 목표를 낮춤', `${tPlain.kcal[0]} → ${tLosing.kcal[0]}`)
  if (effectiveLossPct(losing) < 5) bad('감소율이 반영되지 않음', String(effectiveLossPct(losing)))
  if (nutritionRisk(losing).risk === 'none') bad('7 % 빠졌는데 위험 없음으로 판정', prof.id)
  if (!adviseSupplements(losing).some((a) => a.trigger.includes('체중') || a.category === '경장영양(균형영양식)'))
    bad('빠지고 있는데 영양보충을 권하지 않음', prof.id)

  // 체중이 회복되면 되돌아와야 한다
  const recovered = at(normal.weightKg, 0)
  if (nutritionRisk(recovered).risk === 'high') bad('회복됐는데 고위험이 그대로', prof.id)

  /*
   * 볼 것은 '두 식단을 서로 견주는 것' 이 아니라 '각자 제 목표를 채우는가' 다.
   * 처음에는 빠지는 분의 식단이 회복한 분보다 적으면 안 된다고 적었는데,
   * 둘 다 제 목표 안에 들어와 있는데도 걸리는 경우가 나왔다.
   * 목표가 같으면 어느 쪽이 조금 더 많은지는 뽑기 나름이고, 그건 문제가 아니다.
   */
  try {
    const a = buildDayMenu([], losing, {})
    const b = buildDayMenu([], recovered, {})
    if ((a.totals.kcal ?? 0) < tLosing.kcal[0] * 0.9)
      bad('빠지고 있는데 목표를 못 채움', `${prof.id} ${Math.round(a.totals.kcal ?? 0)}/${tLosing.kcal[0]}`)
    if ((b.totals.kcal ?? 0) < tPlain.kcal[0] * 0.9)
      bad('회복 상태에서 목표를 못 채움', `${prof.id} ${Math.round(b.totals.kcal ?? 0)}/${tPlain.kcal[0]}`)
    // 빠지고 있는 분의 목표가 더 낮으면 안 된다 — 그게 이 검사의 핵심이다
    if (tLosing.kcal[0] < tPlain.kcal[0])
      bad('빠지고 있는데 목표가 더 낮음', `${tLosing.kcal[0]} < ${tPlain.kcal[0]}`)
  } catch (e) { bad('체중 변화 중 식단 구성 예외', (e as Error)?.message) }
}

console.log(`  체중 시나리오 ${runs}가지 · 감소 판독 규칙 8가지`)
console.log(`\n체중 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 4).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
