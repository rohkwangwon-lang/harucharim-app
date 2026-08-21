import { useCallback, useEffect, useState } from 'react'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { today as todayKey, type DayKey } from './day'

const STORAGE_KEY = 'oncofood.state.v1'

export interface AppState {
  patient: PatientContext
  /**
   * 날짜별 식단 기록. 열쇠는 'YYYY-MM-DD'.
   * 하루치만 두면 어제 무엇을 먹었는지 알 수 없어, 처음부터 날짜별로 쌓는다.
   */
  diary: Record<DayKey, SelectedItem[]>
  /** 날짜별 체중 (kg) */
  weights: Record<DayKey, number>
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
  diary: {},
  weights: {},
  supplements: []
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<AppState> & { selected?: SelectedItem[] }

    // 예전 판은 하루치만 담고 있었다. 그 내용을 오늘 기록으로 옮긴다.
    const diary = parsed.diary ?? {}
    if (parsed.selected?.length && !diary[todayKey()]) {
      diary[todayKey()] = parsed.selected
    }

    return {
      patient: { ...DEFAULT_PATIENT, ...parsed.patient },
      diary,
      weights: parsed.weights ?? {},
      supplements: parsed.supplements ?? []
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load)
  /** 지금 보고 있는 날짜. 기본은 오늘이고, 기록에서 다른 날로 옮겨 갈 수 있다. */
  const [day, setDay] = useState<DayKey>(todayKey())

  /** 그날의 식단 */
  const selected = state.diary[day] ?? []

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
      const list = s.diary[day] ?? []
      const idx = list.findIndex((i) => i.foodId === foodId && i.meal === meal)
      const next =
        idx === -1
          ? [...list, { foodId, servings, meal }]
          : list.map((x, k) =>
              k === idx ? { ...x, servings: Math.round((x.servings + servings) * 10) / 10 } : x
            )
      return { ...s, diary: { ...s.diary, [day]: next } }
    })
  }, [day])

  const setServings = useCallback((foodId: string, servings: number, meal?: MealSlot) => {
    setState((s) => {
      const list = s.diary[day] ?? []
      const next =
        servings <= 0
          ? list.filter((i) => !(i.foodId === foodId && i.meal === meal))
          : list.map((i) => (i.foodId === foodId && i.meal === meal ? { ...i, servings } : i))
      return { ...s, diary: { ...s.diary, [day]: next } }
    })
  }, [day])

  /** 담은 항목의 끼니를 바꾼다 */
  const setMeal = useCallback((foodId: string, from: MealSlot | undefined, to: MealSlot | undefined) => {
    setState((s) => {
      const list = s.diary[day] ?? []
      return {
        ...s,
        diary: {
          ...s.diary,
          [day]: list.map((i) => (i.foodId === foodId && i.meal === from ? { ...i, meal: to } : i))
        }
      }
    })
  }, [day])

  const removeFood = useCallback((foodId: string, meal?: MealSlot) => {
    setState((s) => ({
      ...s,
      diary: {
        ...s.diary,
        [day]: (s.diary[day] ?? []).filter((i) => !(i.foodId === foodId && i.meal === meal))
      }
    }))
  }, [day])

  const clearFoods = useCallback(() => {
    setState((s) => {
      const next = { ...s.diary }
      delete next[day]
      return { ...s, diary: next }
    })
  }, [day])

  /** 그날 체중을 적는다. 0 이면 지운다. */
  const setWeight = useCallback((kg: number, forDay: DayKey = day) => {
    setState((s) => {
      const next = { ...s.weights }
      if (kg > 0) next[forDay] = kg
      else delete next[forDay]
      // 오늘 체중을 적으면 계산 기준도 함께 맞춘다
      const patient = forDay === todayKey() && kg > 0 ? { ...s.patient, weightKg: kg } : s.patient
      return { ...s, weights: next, patient }
    })
  }, [day])

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
    /** 지금 보고 있는 날짜 */
    day,
    setDay,
    /** 그날의 식단 */
    selected,
    setWeight,
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
