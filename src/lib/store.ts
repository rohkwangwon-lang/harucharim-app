import { useCallback, useEffect, useState } from 'react'
import type { PatientContext, SelectedItem } from '../data/types'

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
  medications: []
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

  /** 같은 식품을 또 고르면 인분을 더한다 (요구사항: 개수 중복 가능) */
  const addFood = useCallback((foodId: string, servings = 1) => {
    setState((s) => {
      const idx = s.selected.findIndex((i) => i.foodId === foodId)
      if (idx === -1) return { ...s, selected: [...s.selected, { foodId, servings }] }
      const next = [...s.selected]
      next[idx] = { ...next[idx], servings: Math.round((next[idx].servings + servings) * 10) / 10 }
      return { ...s, selected: next }
    })
  }, [])

  const setServings = useCallback((foodId: string, servings: number) => {
    setState((s) => ({
      ...s,
      selected:
        servings <= 0
          ? s.selected.filter((i) => i.foodId !== foodId)
          : s.selected.map((i) => (i.foodId === foodId ? { ...i, servings } : i))
    }))
  }, [])

  const removeFood = useCallback((foodId: string) => {
    setState((s) => ({ ...s, selected: s.selected.filter((i) => i.foodId !== foodId) }))
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

  return {
    state,
    setPatient,
    addFood,
    setServings,
    removeFood,
    clearFoods,
    toggleSupplement
  }
}
