import { useCallback, useEffect, useState } from 'react'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { FOOD_BY_ID } from '../data/foods'
import { observedWeightLoss } from '../engine/nutrition'
import { defaultSlotFor } from '../engine/menu'
import { today as todayKey, type DayKey } from './day'

const STORAGE_KEY = 'harucharim.state.v1'

export interface AppState {
  patient: PatientContext
  /**
   * 날짜별 식단 기록. 열쇠는 'YYYY-MM-DD'.
   * 하루치만 두면 어제 무엇을 먹었는지 알 수 없어, 처음부터 날짜별로 쌓는다.
   */
  diary: Record<DayKey, SelectedItem[]>
  /**
   * 날짜별로 '보여 드린' 추천 식단의 식품 id.
   *
   * 되풀이를 막는 잣대가 적어 두신 기록뿐이었다. 그런데 대부분은 매일 적지 않으신다 —
   * 추천만 보고 장을 보신다. 그러면 어제 무엇을 보셨는지 앱이 알 길이 없어,
   * 스무하루 내내 같은 닭백숙이 올라갔다(실제로 21일 중 21일이었다).
   *
   * 그래서 드신 것과 별개로 '보여 드린 것' 도 남긴다.
   * 드셨는지는 알 수 없지만, 어제 본 것을 오늘 또 보시는 일은 이것으로 막힌다.
   */
  shown?: Record<DayKey, string[]>
  /** 날짜별 체중 (kg) */
  weights: Record<DayKey, number>
  /** 복용 중인 영양제 id */
  supplements: string[]
  /**
   * 글자 크기.
   *
   * 이 앱을 쓰시는 분 중에는 예순 넘으신 분이 많고, 항암 중에는 눈이 침침해지기도 한다.
   * 기본값은 지금 그대로 두고, 필요하신 분만 키우실 수 있게 한다.
   * Tailwind 가 rem 을 쓰므로 뿌리 글자 크기만 바꾸면 여백과 아이콘까지 함께 커진다 —
   * 글자만 키우면 상자를 뚫고 나가지만, 함께 키우면 짜임새가 그대로다.
   */
  textSize?: 'normal' | 'large' | 'xlarge'
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
  shown: {},
  weights: {},
  supplements: [],
  textSize: 'normal'
}

/**
 * 기록을 불러올 때 한 번 정리한다.
 *
 * 초기 판에는 끼니 개념이 없었다(끼니 지정은 나중에 들어왔다).
 * 그때 담은 항목에는 meal 이 비어 있는데, '내 식단'은 끼니별로 걸러 보여 주므로
 * 그런 항목은 어느 끼니에도 뜨지 않고 사라졌다. 그런데 합계에는 계속 들어가고,
 * 추천 화면은 식품군을 보고 아침에 배치해 "담지도 않은 삼계탕이 아침에 있다"가 됐다.
 *
 * 그래서 끼니를 채워 넣고, 같은 끼니에 같은 음식이 겹치면 인분을 합친다.
 * 화면에 안 보이는 기록은 없어야 한다.
 */
function normalizeDay(list: SelectedItem[]): SelectedItem[] {
  const out: SelectedItem[] = []
  for (const item of list) {
    const meal: MealSlot = item.meal ?? defaultSlotFor(FOOD_BY_ID[item.foodId])
    const same = out.find((x) => x.foodId === item.foodId && x.meal === meal)
    if (same) {
      same.servings = Math.round((same.servings + item.servings) * 10) / 10
    } else {
      out.push({ ...item, meal })
    }
  }
  return out
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
    for (const key of Object.keys(diary)) {
      diary[key as DayKey] = normalizeDay(diary[key as DayKey] ?? [])
    }

    /*
     * 이미 체중을 적어 오신 분들을 위해, 불러올 때 한 번 읽어 둔다.
     * 이 계산이 없던 동안 쌓인 기록도 이제부터는 반영된다.
     */
    const weights = parsed.weights ?? {}
    const observed = observedWeightLoss(weights, todayKey())

    return {
      patient: {
        ...DEFAULT_PATIENT, ...parsed.patient,
        observedLossPct: observed?.pct,
        observedLossNote: observed ? `${observed.fromKg} → ${observed.toKg} kg (${observed.days}일)` : undefined
      },
      diary,
      shown: pruneShown(parsed.shown ?? {}),
      weights,
      supplements: parsed.supplements ?? []
    }
  } catch {
    return DEFAULT_STATE
  }
}

/**
 * 오래된 '보여 드린 것' 은 버린다.
 *
 * 되풀이를 따지는 창이 이레 남짓이므로 그보다 오래된 것은 쓸 데가 없다.
 * 날마다 스무 남짓씩 쌓이는 것을 그대로 두면 저장 공간만 먹는다.
 */
const SHOWN_KEEP_DAYS = 14
function pruneShown(shown: Record<string, string[]>): Record<DayKey, string[]> {
  const out: Record<string, string[]> = {}
  const today = Math.round(Date.parse(todayKey()) / 86400000)
  for (const [key, ids] of Object.entries(shown)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    const ago = today - Math.round(Date.parse(key) / 86400000)
    if (ago < 0 || ago > SHOWN_KEEP_DAYS) continue
    if (Array.isArray(ids)) out[key] = ids.filter((x) => typeof x === 'string')
  }
  return out as Record<DayKey, string[]>
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

  /**
   * 오늘 보여 드린 추천을 적어 둔다.
   *
   * '다시 구성' 을 누르시면 그날 것을 덮어쓴다 — 지나간 안까지 모두 쌓으면
   * 며칠 만에 고를 것이 동나고, 정작 오늘 보시는 상이 초라해진다.
   * 마지막으로 보신 것 하나만 남긴다.
   */
  const rememberShown = useCallback((forDay: DayKey, foodIds: string[]) => {
    setState((s) => {
      const prev = s.shown?.[forDay]
      /* 같은 것을 다시 적느라 저장을 깨우지 않는다 */
      if (prev && prev.length === foodIds.length && prev.every((x, i) => x === foodIds[i])) return s
      return { ...s, shown: pruneShown({ ...(s.shown ?? {}), [forDay]: foodIds }) }
    })
  }, [])

  const setPatient = useCallback((patch: Partial<PatientContext>) => {
    setState((s) => ({ ...s, patient: { ...s.patient, ...patch } }))
  }, [])

  /**
   * 글자 크기를 바꾼다.
   *
   * 화면에 곧바로 적용되도록 <html> 의 글자 크기를 함께 바꾼다.
   * Tailwind 가 rem 을 쓰므로 이 한 줄이 글자·여백·아이콘을 한꺼번에 키운다.
   */
  const setTextSize = useCallback((size: NonNullable<AppState['textSize']>) => {
    setState((s) => ({ ...s, textSize: size }))
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

      /*
       * 체중을 적으실 때마다 감소율을 다시 읽는다.
       *
       * 예전에는 기록을 받아 적기만 하고 계산에는 쓰지 않았다.
       * 감소율은 처음 설정에서 손으로 넣은 값 그대로여서,
       * 치료 중 체중이 빠지는 분이 매일 기록해도 앱은 그걸 모르고 있었다.
       * 영양 위험도 알리지 않고 경구영양보충도 권하지 않았다.
       */
      const observed = observedWeightLoss(next, todayKey())
      const patient = {
        ...s.patient,
        // 오늘 체중을 적으면 계산 기준도 함께 맞춘다
        ...(forDay === todayKey() && kg > 0 ? { weightKg: kg } : {}),
        observedLossPct: observed?.pct,
        observedLossNote: observed
          ? `${observed.fromKg} → ${observed.toKg} kg (${observed.days}일)`
          : undefined
      }
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
  /** 로그인 계정 이름을 아직 이름이 없을 때만 채운다 (사용자가 고친 이름을 덮어쓰지 않는다) */
  const adoptName = useCallback((n: string) => {
    setState((s) => (s.patient.name ? s : { ...s, patient: { ...s.patient, name: n } }))
  }, [])

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
    setTextSize,
    adoptName,
    addFood,
    setServings,
    setMeal,
    rememberShown,
    removeFood,
    clearFoods,
    toggleSupplement,
    completeOnboarding,
    resetOnboarding
  }
}
