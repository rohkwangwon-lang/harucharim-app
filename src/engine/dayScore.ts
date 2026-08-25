import type { PatientContext, SelectedItem, Supplement } from '../data/types'
import { CANCER_BY_ID } from '../data/cancers'
import { personalTarget, sumIntake } from './nutrition'

/**
 * 하루치 식사를 한눈에 보이는 등급으로 요약한다.
 *
 * 기록 화면에서는 날짜가 수십 개씩 늘어선다. 숫자를 다 읽게 하면 아무도 안 본다.
 * 그래서 "충분했나 모자랐나"를 색 하나로 먼저 보여 주고, 숫자는 눌렀을 때 보이게 한다.
 */

export type DayGrade = 'none' | 'low' | 'good' | 'high'

export interface DaySummary {
  grade: DayGrade
  kcal: number
  protein: number
  na: number
  target: { kcal: [number, number]; protein: [number, number] }
  /** 기록이 아예 없는 날 */
  empty: boolean
  /** 한 줄 평 */
  note: string
}

/**
 * 영양제도 함께 받는다.
 * 경장영양 한 캔에 나트륨이 200 mg 가까이 들어 있어, 화면마다 넣고 빼면
 * 같은 날의 나트륨이 화면마다 다르게 나온다.
 */
export function summarizeDay(
  items: SelectedItem[],
  patient: PatientContext,
  supplements: Supplement[] = []
): DaySummary {
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)

  /*
   * 음식 기록이 없는 날은 '기록 없음'이다.
   * 영양제 목록은 "지금 드시는 것"이라 날짜가 없어서, 이걸 과거의 빈 날에까지
   * 얹으면 아무것도 안 적은 날이 "200 kcal 부족"으로 보인다.
   */
  if (items.length === 0) {
    return {
      grade: 'none', kcal: 0, protein: 0, na: 0, target, empty: true,
      note: '기록 없음'
    }
  }

  const t = sumIntake(items, supplements)
  const kcal = Math.round(t.kcal ?? 0)
  const protein = Math.round(t.protein ?? 0)
  const na = Math.round(t.na ?? 0)
  const naLimit = profile.target.naLimit ?? 2000

  let grade: DayGrade
  let note: string

  if (kcal < target.kcal[0] * 0.8) {
    grade = 'low'
    note = `열량이 목표보다 ${target.kcal[0] - kcal} kcal 모자랍니다`
  } else if (kcal > target.kcal[1] * 1.15) {
    grade = 'high'
    note = `열량이 목표를 ${kcal - target.kcal[1]} kcal 넘었습니다`
  } else if (protein < target.protein[0] * 0.8) {
    grade = 'low'
    note = `단백질이 ${target.protein[0] - protein} g 모자랍니다`
  } else {
    grade = 'good'
    note = na > naLimit ? '열량·단백질은 충분하나 나트륨이 많습니다' : '목표 범위에 들어옵니다'
  }

  return { grade, kcal, protein, na, target, empty: false, note }
}

export const GRADE_STYLE: Record<DayGrade, { bg: string; text: string; dot: string; label: string }> = {
  none: { bg: 'bg-stone-100', text: 'text-stone-400', dot: 'bg-stone-300', label: '기록 없음' },
  low:  { bg: 'bg-warn-100',  text: 'text-warn-700',  dot: 'bg-warn-500',  label: '부족' },
  good: { bg: 'bg-brand-100', text: 'text-brand-700', dot: 'bg-brand-500', label: '충분' },
  high: { bg: 'bg-danger-100', text: 'text-danger-700', dot: 'bg-danger-500', label: '초과' }
}

/* ────────────────────────── 여러 날을 묶어서 ────────────────────────── */

/**
 * 한 주·한 달을 하나로 평가한다.
 *
 * 지금까지 기록 화면은 하루씩만 평했다. 주·월 화면에도 숫자는 있었지만
 * "평균 1,640 kcal" 같은 값만 놓여 있어서, 그게 좋은 건지 아닌지는
 * 사용자가 스스로 목표와 견주어 판단해야 했다.
 *
 * 하루의 오르내림은 원래 크다. 어제 적게 드셨다고 문제는 아니다.
 * 정작 봐야 할 것은 며칠에 걸친 흐름이다 — 사흘 내리 모자랐는지,
 * 기록 자체가 드문드문한지, 나트륨이 계속 상한 언저리인지.
 * 그건 하루 평가를 아무리 늘어놓아도 보이지 않는다.
 */
export interface PeriodSummary {
  /** 이 기간에 실제로 적으신 날 */
  recorded: number
  days: number
  avgKcal: number
  avgProtein: number
  avgNa: number
  counts: Record<DayGrade, number>
  /** 가장 길게 이어진 '모자란 날' */
  worstStreak: number
  target: { kcal: [number, number]; protein: [number, number] }
  naLimit: number
  notes: { tone: 'good' | 'low' | 'over' | 'info'; topic: string; text: string }[]
}

export function summarizePeriod(
  days: string[],
  summarize: (d: string) => DaySummary,
  patient: PatientContext,
  /** '한 주' 인지 '한 달' 인지 — 문장에 쓴다 */
  unit: '주' | '달'
): PeriodSummary {
  const all = days.map(summarize)
  const kept = all.filter((s) => !s.empty)
  const counts: Record<DayGrade, number> = { none: 0, low: 0, good: 0, high: 0 }
  for (const s of all) counts[s.grade]++

  const avg = (pick: (s: DaySummary) => number) =>
    kept.length ? Math.round(kept.reduce((n, s) => n + pick(s), 0) / kept.length) : 0

  const profile = CANCER_BY_ID[patient.cancer]
  const naLimit = profile.target.naLimit ?? 2000
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)

  /* 모자란 날이 며칠이나 내리 이어졌는가 */
  let worstStreak = 0
  let run = 0
  for (const s of all) {
    if (s.grade === 'low') { run++; worstStreak = Math.max(worstStreak, run) } else run = 0
  }

  const avgKcal = avg((s) => s.kcal)
  const avgProtein = avg((s) => s.protein)
  const avgNa = avg((s) => s.na)
  const notes: PeriodSummary['notes'] = []

  /*
   * 적으신 날이 너무 적으면 평균이라는 말 자체가 성립하지 않는다.
   * 이틀 적고 "이번 주 평균" 이라고 하면 숫자가 사실보다 커 보인다.
   */
  if (kept.length === 0) {
    notes.push({ tone: 'info', topic: '기록', text: `이번 ${unit}에는 적으신 날이 없습니다. 하루만 적어 두셔도 흐름을 보여 드릴 수 있습니다.` })
    return { recorded: 0, days: days.length, avgKcal: 0, avgProtein: 0, avgNa: 0, counts, worstStreak, target, naLimit, notes }
  }
  const thin = kept.length < Math.max(3, Math.round(days.length * 0.4))
  if (thin) {
    notes.push({ tone: 'info', topic: '기록', text: `${days.length}일 중 ${kept.length}일만 적으셨습니다. 아래 평균은 적으신 날만 셈한 것이라 실제와 다를 수 있습니다.` })
  }

  if (avgKcal < target.kcal[0]) {
    notes.push({ tone: 'low', topic: '에너지',
      text: `적으신 날의 평균이 ${avgKcal} kcal 로 목표(${target.kcal[0]}~${target.kcal[1]} kcal)에 못 미칩니다. ` +
        `하루쯤 적게 드시는 것은 흔한 일이지만, 이 ${unit} 내내 그랬다면 체중으로 나타납니다.` })
  } else if (avgKcal > target.kcal[1] * 1.1) {
    notes.push({ tone: 'over', topic: '에너지',
      text: `평균 ${avgKcal} kcal 로 목표 상단(${target.kcal[1]} kcal)을 넘습니다. 치료 중이라면 문제가 아닐 수 있습니다.` })
  } else {
    notes.push({ tone: 'good', topic: '에너지', text: `평균 ${avgKcal} kcal — 목표 범위를 이 ${unit} 동안 지키셨습니다.` })
  }

  if (avgProtein < target.protein[0]) {
    notes.push({ tone: 'low', topic: '단백질',
      text: `평균 ${avgProtein} g 으로 목표(${target.protein[0]} g 이상)에 못 미칩니다. ` +
        '근육은 며칠 만에 빠지지 않지만 몇 주면 달라집니다.' })
  } else {
    notes.push({ tone: 'good', topic: '단백질', text: `평균 ${avgProtein} g — 목표를 채우고 계십니다.` })
  }

  if (avgNa > naLimit) {
    notes.push({ tone: 'over', topic: '나트륨',
      text: `평균 ${avgNa.toLocaleString()} mg 으로 상한(${naLimit.toLocaleString()} mg)을 넘습니다. ` +
        '하루치를 고치는 것보다 국물을 남기는 습관 하나가 이 평균을 가장 크게 낮춥니다.' })
  } else if (avgNa > naLimit * 0.85) {
    notes.push({ tone: 'info', topic: '나트륨', text: `평균 ${avgNa.toLocaleString()} mg — 상한 언저리가 이어집니다.` })
  }

  /*
   * 하루 평가로는 보이지 않는 것. 이 줄이 이 화면의 존재 이유다.
   */
  if (worstStreak >= 3) {
    notes.push({ tone: 'low', topic: '이어진 부족',
      text: `${worstStreak}일 내리 모자랐던 구간이 있습니다. 하루씩 보면 넘어갈 수 있지만 이어지면 다릅니다 — ` +
        '입맛·삼킴·메스꺼움 중 걸리는 것이 있으면 담당 선생님께 말씀하실 만합니다.' })
  }

  return { recorded: kept.length, days: days.length, avgKcal, avgProtein, avgNa, counts, worstStreak, target, naLimit, notes }
}
