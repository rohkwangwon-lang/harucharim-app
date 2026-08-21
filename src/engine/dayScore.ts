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
  none: { bg: 'bg-slate-100', text: 'text-slate-400', dot: 'bg-slate-300', label: '기록 없음' },
  low:  { bg: 'bg-warn-100',  text: 'text-warn-700',  dot: 'bg-warn-500',  label: '부족' },
  good: { bg: 'bg-brand-100', text: 'text-brand-700', dot: 'bg-brand-500', label: '충분' },
  high: { bg: 'bg-danger-100', text: 'text-danger-700', dot: 'bg-danger-500', label: '초과' }
}
