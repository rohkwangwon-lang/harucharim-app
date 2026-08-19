import { useCallback, useEffect, useState } from 'react'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'

const STORAGE_KEY = 'oncofood.state.v1'

export interface AppState {
  patient: PatientContext
  /** 오늘 먹었거나 먹으려는 식품 */
  selected: SelectedItem[]
  /** 복용 중인 영양제 id */
  supplements: string[]
}

export const DEFAULT_PATIENT: PatientContext = {
  cancer: 'breast',
  phase: 'during_rt',
  weightKg: 60,
  heightCm: 163,
  age: 55,
  sex: 'F',
  weightLossPct: 0,
  conditions: [],
  medications: [],
  history: [],
  cuisines: ['한식'],
  onboarded: false
}

const DEFAULT_STATE: AppState = {
  patient: DEFAULT_PATIENT,
  selected: [],
  supplements: []
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      patient: { ...DEFAULT_PATIENT, ...parsed.patient },
      selected: parsed.selected ?? [],
      supplements: parsed.supplements ?? []
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 저장 실패는 기능을 막지 않는다 (사파리 프라이빗 모드 등)
    }
  }, [state])

  const setPatient = useCallback((patch: Partial<PatientContext>) => {
    setState((s) => ({ ...s, patient: { ...s.patient, ...patch } }))
  }, [])

  /**
   * 같은 식품을 또 고르면 인분을 더한다.
   * 단, 끼니가 다르면 별개 항목으로 둔다 — 아침에 먹은 밥과 저녁에 먹은 밥은 따로 세야 한다.
   */
  const addFood = useCallback((foodId: string, servings = 1, meal?: MealSlot) => {
    setState((s) => {
      const idx = s.selected.findIndex((i) => i.foodId === foodId && i.meal === meal)
      if (idx === -1) return { ...s, selected: [...s.selected, { foodId, servings, meal }] }
      const next = [...s.selected]
      next[idx] = { ...next[idx], servings: Math.round((next[idx].servings + servings) * 10) / 10 }
      return { ...s, selected: next }
    })
  }, [])

  const setServings = useCallback((foodId: string, servings: number, meal?: MealSlot) => {
    setState((s) => ({
      ...s,
      selected:
        servings <= 0
          ? s.selected.filter((i) => !(i.foodId === foodId && i.meal === meal))
          : s.selected.map((i) =>
              i.foodId === foodId && i.meal === meal ? { ...i, servings } : i
            )
    }))
  }, [])

  /** 담은 항목의 끼니를 바꾼다 */
  const setMeal = useCallback((foodId: string, from: MealSlot | undefined, to: MealSlot | undefined) => {
    setState((s) => ({
      ...s,
      selected: s.selected.map((i) => (i.foodId === foodId && i.meal === from ? { ...i, meal: to } : i))
    }))
  }, [])

  const removeFood = useCallback((foodId: string, meal?: MealSlot) => {
    setState((s) => ({
      ...s,
      selected: s.selected.filter((i) => !(i.foodId === foodId && i.meal === meal))
    }))
  }, [])

  const clearFoods = useCallback(() => {
    setState((s) => ({ ...s, selected: [] }))
  }, [])

  const toggleSupplement = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      supplements: s.supplements.includes(id)
        ? s.supplements.filter((x) => x !== id)
        : [...s.supplements, id]
    }))
  }, [])

  /** 온보딩 완료 처리 — 첫 실행 화면을 다시 띄우지 않는다 */
  const completeOnboarding = useCallback((patch: Partial<PatientContext>) => {
    setState((s) => ({ ...s, patient: { ...s.patient, ...patch, onboarded: true } }))
  }, [])

  /** 설정을 처음부터 다시 — 온보딩을 다시 띄운다 */
  const resetOnboarding = useCallback(() => {
    setState((s) => ({ ...s, patient: { ...s.patient, onboarded: false } }))
  }, [])

  return {
    state,
    setPatient,
    addFood,
    setServings,
    setMeal,
    removeFood,
    clearFoods,
    toggleSupplement,
    completeOnboarding,
    resetOnboarding
  }
}
