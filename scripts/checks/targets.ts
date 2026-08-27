/**
 * 여섯 번째 검사 — 목표값과 그 사유.
 *
 * 앱은 환자마다 열량·단백질·식이섬유 목표를 다르게 잡는다.
 * 그 값이 말이 되는지, 그리고 기본값과 다르게 잡았을 때 그 이유를
 * 화면에 밝히고 있는지를 본다. 조용히 목표를 낮추면 앱이 덜 먹으라고
 * 하는 것처럼 읽히는데, 그건 암환자에게 위험한 오해다.
 */
import { personalTarget, dosingWeight, targetNotes, nutritionRisk } from '../../src/engine/nutrition'
import { fiberGoal, planNotes } from '../../src/engine/menu'
import { CANCERS } from '../../src/data/cancers'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { PatientCondition, PatientContext } from '../../src/data/types'

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

let seed = 90210
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length]

const CONDS: PatientCondition[] = ['체중증가', '체중감소', '식욕부진', '설사', '장루보유', '위절제후', '당뇨', '신기능저하']
// 실제로 쓰이는 값만 쓴다. 'survivor'·'pre_op' 는 존재하지 않는 값이라
// 생존기·호중구감소증 규칙이 한 번도 검사되지 않고 있었다.
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const

let n = 0, adjusted = 0, lowered = 0
for (let i = 0; i < 3000; i++) {
  const patient: PatientContext = {
    ...DEFAULT_PATIENT, onboarded: true,
    cancer: pick(CANCERS).id,
    phase: pick([...PHASES]) as PatientContext['phase'],
    weightKg: [32, 45, 58, 72, 95, 128][Math.floor(rnd() * 6)],
    heightCm: [142, 155, 163, 175, 190][Math.floor(rnd() * 5)],
    age: [20, 45, 60, 78, 92][Math.floor(rnd() * 5)],
    sex: rnd() < 0.5 ? 'M' : 'F',
    weightLossPct: [0, 3, 6, 11, 18][Math.floor(rnd() * 5)],
    conditions: rnd() < 0.6 ? [pick(CONDS)] : rnd() < 0.5 ? [pick(CONDS), pick(CONDS)] : []
  }
  const prof = CANCERS.find((c) => c.id === patient.cancer)!
  const t = personalTarget(patient, prof.target.kcalPerKg, prof.target.proteinPerKg)
  const ctx = `${patient.cancer}/${patient.sex}${patient.age}/${patient.weightKg}kg ${patient.heightCm}cm cond=[${patient.conditions}] loss=${patient.weightLossPct}%`
  n++

  /* ── 목표값이 말이 되는가 ── */
  if (!(t.kcal[0] > 0) || !Number.isFinite(t.kcal[0])) bad('열량 목표 이상', `${ctx} ${t.kcal}`)
  if (t.kcal[0] > t.kcal[1]) bad('열량 하단이 상단보다 큼', `${ctx} ${t.kcal}`)
  if (t.protein[0] > t.protein[1]) bad('단백질 하단이 상단보다 큼', `${ctx} ${t.protein}`)
  // 사람이 하루에 먹을 수 있는 범위를 벗어나면 안 된다
  if (t.kcal[0] < 800) bad('열량 목표가 지나치게 낮음', `${ctx} ${t.kcal[0]}`)
  if (t.kcal[1] > 4200) bad('열량 목표가 지나치게 높음', `${ctx} ${t.kcal[1]}`)
  if (t.protein[0] < 30) bad('단백질 목표가 지나치게 낮음', `${ctx} ${t.protein[0]}`)
  if (t.protein[1] > 250) bad('단백질 목표가 지나치게 높음', `${ctx} ${t.protein[1]}`)
  if (!(t.fluid > 500) || t.fluid > 5000) bad('수분 목표 이상', `${ctx} ${t.fluid}`)

  /* ── 보정체중 ── */
  const dw = dosingWeight(patient)
  const h = patient.heightCm / 100
  const bmi = patient.weightKg / (h * h)
  if (dw > patient.weightKg) bad('보정체중이 실제 체중보다 큼', `${ctx} ${dw}`)
  /*
   * 보정은 BMI 28 부터 32 사이에 걸쳐 천천히 걸린다.
   *
   * 예전에는 BMI 30 에서 곧바로 갈아탔는데, 그러면 200 g 늘었다고 하루 500 kcal 을
   * 덜 드시라는 말이 되었다. 이제는 걸쳐서 걸리므로 '28 아래에서는 손대지 않는다' 만 본다.
   */
  if (bmi < 28 && dw !== patient.weightKg) bad('보정할 체격이 아닌데 보정체중을 씀', `${ctx} BMI ${bmi.toFixed(1)}`)
  /*
   * 깎을 때는 표준체중 아래로 내려가지 않는다.
   *
   * 마르신 분은 실제 체중이 표준체중보다 낮은 것이 당연하므로 보정이 걸리는 쪽만 본다 —
   * 처음에는 그 구분 없이 걸어 두었다가 저체중인 분 600명을 문제로 잡았다.
   */
  if (bmi > 28 && dw < 22 * h * h - 0.5)
    bad('보정체중이 표준체중보다 낮음', `${ctx} ${dw} < ${(22 * h * h).toFixed(1)}`)
  if (bmi >= 30 && dw >= patient.weightKg) bad('비만인데 보정하지 않음', `${ctx} BMI ${bmi.toFixed(1)}`)

  /* ── 조정했으면 반드시 밝혀야 한다 ── */
  const base = personalTarget(
    { ...patient, conditions: [], weightLossPct: 0, weightKg: patient.weightKg, heightCm: patient.heightCm },
    prof.target.kcalPerKg, prof.target.proteinPerKg
  )
  const notes = [...targetNotes(patient), ...planNotes(patient)]
  const changed = t.kcal[0] !== base.kcal[0] || t.kcal[1] !== base.kcal[1]
  if (changed) {
    adjusted++
    if (t.kcal[0] < base.kcal[0]) lowered++
    if (notes.length === 0) bad('목표를 조정했는데 사유를 밝히지 않음', `${ctx} ${base.kcal} → ${t.kcal}`)
  }
  for (const a of notes) {
    if (!a.label?.trim()) bad('조정 사유에 제목 없음', ctx)
    if (!a.reason?.trim()) bad('조정 사유에 설명 없음', `${ctx} ${a.label}`)
    if (a.reason && a.reason.length < 20) bad('조정 사유 설명이 너무 짧음', `${ctx} ${a.label}`)
  }

  /* ── 체중이 줄고 있는데 목표를 낮추면 안 된다 ── */
  if ((patient.weightLossPct ?? 0) >= 5 && t.kcal[0] < base.kcal[0])
    bad('체중 감소 중인데 열량 목표를 낮춤', `${ctx} ${base.kcal[0]} → ${t.kcal[0]}`)

  /* ── 식이섬유 목표 ── */
  const fg = fiberGoal(patient, prof)
  if (fg.range[0] > fg.range[1]) bad('식이섬유 범위 역전', `${ctx} ${fg.range}`)
  if (fg.range[0] < 5 || fg.range[1] > 40) bad('식이섬유 목표가 범위를 벗어남', `${ctx} ${fg.range}`)
  const needsLow = patient.conditions.some((c) => c === '설사' || c === '장루보유')
  if (needsLow !== fg.lowResidue) bad('저잔사 판정이 증상과 어긋남', `${ctx} ${fg.lowResidue}`)
  if (fg.lowResidue && !planNotes(patient).some((a) => a.label.includes('식이섬유')))
    bad('저잔사로 낮췄는데 밝히지 않음', ctx)

  /* ── 영양 위험 판정 ── */
  const risk = nutritionRisk(patient)
  if (!Number.isFinite(risk.bmi) || risk.bmi <= 0) bad('BMI 계산 이상', `${ctx} ${risk.bmi}`)
  if (!risk.message?.trim()) bad('영양 위험 설명 없음', ctx)
  if ((patient.weightLossPct ?? 0) >= 10 && risk.risk !== 'high')
    bad('10 % 이상 감소인데 고위험이 아님', `${ctx} ${risk.risk}`)
  if (bmi < 18.5 && risk.risk !== 'high') bad('저체중인데 고위험이 아님', `${ctx} BMI ${bmi.toFixed(1)}`)
}

console.log(`  환자 ${n.toLocaleString()}명 — 목표를 조정한 경우 ${adjusted} (그중 낮춘 것 ${lowered})`)

console.log(`\n목표 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 4).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
