import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { normalizeSlot } from '../data/types'
import { FOOD_BY_ID } from '../data/foods'
import { observedWeightLoss } from '../engine/nutrition'
import { defaultSlotFor } from '../engine/menu'
import { CANCER_BY_ID } from '../data/cancers'
import { CONDITION_RULES } from '../data/conditionRules'
import { normalizeMedications } from '../data/interactions'
import { BODY_LIMITS } from './bodyInput'
import { SUBTYPE_OPTIONS } from '../data/types'
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
    /*
     * 간식 자리가 하나에서 둘로 나뉘었다.
     *
     * 그전에 담으신 것에는 meal 이 '간식' 으로 적혀 있다. 그대로 두면 어느 자리에도
     * 걸리지 않아 화면에서 사라지고, 합계에는 남아 "담지 않은 것이 들어가 있다" 로 보인다.
     * 어느 쪽이었는지는 알 수 없으니 오후 간식으로 옮긴다 —
     * 간식은 점심과 저녁 사이에 드시는 일이 더 흔하다.
     */
    const meal: MealSlot = normalizeSlot(item.meal) ?? defaultSlotFor(FOOD_BY_ID[item.foodId])
    const same = out.find((x) => x.foodId === item.foodId && x.meal === meal)
    if (same) {
      same.servings = Math.round((same.servings + item.servings) * 10) / 10
    } else {
      out.push({ ...item, meal })
    }
  }
  return out
}

/* ── 불러올 때 자료를 정리한다 ─────────────────────────────
 *
 * 이 앱의 건강 기록은 서버에 사본이 없다. 그래서 저장된 값 하나가 어긋나 화면이 멈추면
 * 환자분은 기록에 닿을 길이 없다 — "다시 열기" 를 눌러도 같은 자리에서 또 멈춘다.
 *
 * 한동안 불러오기는 저장된 것을 그대로 믿었다. 화면 자가시험(2026-10)이 낡거나 망가진
 * 자료 서른네 가지를 넣어 보니 다섯 가지가 화면을 멈췄다 — 없어진 암종, 목록 모양으로 적힌 체중,
 * 목록이 아닌 증상·영양제, null 인 약. 두 가지는 "NaN kcal"·"BMI Infinity" 를 화면에 냈다.
 * 예전 판이 남긴 자료와 앞으로 없앨 항목이 모두 이 길로 들어온다.
 *
 * 원칙은 둘이다.
 *  · 성한 것은 손대지 않는다. 고칠 수 있는 것은 고쳐서 살린다(목록 모양 체중 → 날짜별 표).
 *  · 암종·시기·몸 치수처럼 판정의 바탕이 되는 값이 어긋났으면, 기본값으로 **조용히 바꾸지 않고**
 *    처음 설정을 다시 여쭌다. 유방암으로 슬쩍 바뀐 채 다른 암의 안내를 보시면 안 된다.
 *    그때도 적어 두신 식단과 체중은 그대로 둔다.
 */
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const asNum = (v: unknown): number | undefined => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
const KNOWN_PHASES: readonly string[] = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']
const KNOWN_CONDITIONS = new Set(Object.keys(CONDITION_RULES))
const TEXT_SIZES: readonly string[] = ['normal', 'large', 'xlarge']

/** 환자 설정. 바탕이 되는 값이 어긋났으면 onboarded 를 내려 다시 여쭙게 한다 */
export function restorePatient(raw: unknown): PatientContext {
  const p = isObj(raw) ? raw : {}
  let sound = isObj(raw)
  const within = (v: unknown, lo: number, hi: number, fallback: number): number => {
    const n = asNum(v)
    if (n !== undefined && n >= lo && n <= hi) return n
    sound = false
    return fallback
  }
  const cancer = typeof p.cancer === 'string' && p.cancer in CANCER_BY_ID
    ? (p.cancer as PatientContext['cancer']) : (sound = false, DEFAULT_PATIENT.cancer)
  const phase = typeof p.phase === 'string' && KNOWN_PHASES.includes(p.phase)
    ? (p.phase as PatientContext['phase']) : (sound = false, DEFAULT_PATIENT.phase)
  const sex = p.sex === 'M' || p.sex === 'F' ? p.sex : (sound = false, DEFAULT_PATIENT.sex)
  const validSubs = new Set(((SUBTYPE_OPTIONS as Record<string, { id: string }[] | undefined>)[cancer] ?? []).map((x) => x.id))
  const loss = asNum(p.weightLossPct)

  const restored: PatientContext = {
    ...DEFAULT_PATIENT,
    ...(p as Partial<PatientContext>),
    cancer, phase, sex,
    weightKg: within(p.weightKg, BODY_LIMITS.weightKg.min, BODY_LIMITS.weightKg.max, DEFAULT_PATIENT.weightKg),
    heightCm: within(p.heightCm, BODY_LIMITS.heightCm.min, BODY_LIMITS.heightCm.max, DEFAULT_PATIENT.heightCm),
    age: within(p.age, BODY_LIMITS.age.min, BODY_LIMITS.age.max, DEFAULT_PATIENT.age),
    weightLossPct: loss !== undefined && loss >= 0 && loss <= 60 ? loss : 0,
    /* 없어진 증상·약·세부 유형은 덜어 낸다 — 남은 것은 그대로 쓴다 */
    conditions: asList(p.conditions).filter((c): c is PatientContext['conditions'][number] => typeof c === 'string' && KNOWN_CONDITIONS.has(c)),
    /* 모르는 약은 버리고, 윗칸 없이 남은 아랫칸(레트로졸만 있고 '아로마타제 억제제' 가 없는 경우)에는 윗칸을 채운다 */
    medications: normalizeMedications(asList(p.medications)),
    subtypes: asList(p.subtypes).filter((t): t is NonNullable<PatientContext['subtypes']>[number] => typeof t === 'string' && validSubs.has(t)),
    history: asList(p.history).filter((x): x is NonNullable<PatientContext['history']>[number] => typeof x === 'string'),
    cuisines: (() => {
      const c = asList(p.cuisines).filter((x): x is NonNullable<PatientContext['cuisines']>[number] => typeof x === 'string')
      return c.length ? c : DEFAULT_PATIENT.cuisines
    })(),
    onboarded: p.onboarded === true && sound
  }
  return linkWarfarin(restored)
}

/**
 * 와파린은 두 군데서 고를 수 있다 — 증상·상태의 '와파린복용' 과 드시는 약의 '와파린'.
 *
 * 둘 중 하나만 고르면 답이 갈렸다(2026-10-15 안전 검토). 엔진의 상호작용·영양제 판정은 약 쪽만 보아서,
 * 증상 쪽으로만 고르신 분께는 오메가-3 제품이 '권장', 은행잎·홍삼이 '주의' 로 나왔다
 * (약으로 고르면 '주의' 와 '피하세요'). 같은 분이 어느 칸을 눌렀느냐로 출혈 위험의 답이 달라지면 안 된다.
 * 그래서 하나를 켜면 다른 하나도 켜고, 끄면 함께 끈다.
 */
const WARFARIN_CONDITION = '와파린복용' as PatientContext['conditions'][number]
export function linkWarfarin(p: PatientContext, patch?: Partial<PatientContext>): PatientContext {
  const hasCond = p.conditions.includes(WARFARIN_CONDITION)
  const hasMed = p.medications.includes('warfarin')
  if (hasCond === hasMed) return p
  /* 이번에 바꾼 쪽을 따른다. 읽어 들일 때(바꾼 쪽이 없을 때)는 켜는 쪽으로 맞춘다 — 끄는 쪽으로 맞추면 경고를 잃는다 */
  const changedMeds = !!patch && 'medications' in patch && !('conditions' in patch)
  const changedConds = !!patch && 'conditions' in patch && !('medications' in patch)
  const on = changedMeds ? hasMed : changedConds ? hasCond : true
  return {
    ...p,
    conditions: on ? (hasCond ? p.conditions : [...p.conditions, WARFARIN_CONDITION]) : p.conditions.filter((c) => c !== WARFARIN_CONDITION),
    medications: on ? (hasMed ? p.medications : normalizeMedications([...p.medications, 'warfarin'])) : p.medications.filter((m) => m !== 'warfarin')
  }
}

/** 하루 기록. 분량이 없거나 0 이하면 1인분으로 본다 — 예전 판은 분량 칸 없이 담았다 */
function restoreDay(raw: unknown): SelectedItem[] {
  const list = Array.isArray(raw) ? raw : isObj(raw) ? [raw] : []
  const items: SelectedItem[] = []
  for (const x of list) {
    if (!isObj(x) || typeof x.foodId !== 'string' || !x.foodId) continue
    const n = asNum(x.servings)
    const servings = n === undefined || n <= 0 ? 1 : Math.min(n, 50)
    items.push({ ...(x as unknown as SelectedItem), foodId: x.foodId, servings })
  }
  return normalizeDay(items)
}

/** 체중. 목록 모양([{date, kg}])으로 적힌 것도 날짜별 표로 살린다 */
export function restoreWeights(raw: unknown): Record<DayKey, number> {
  const out: Record<DayKey, number> = {}
  const put = (d: unknown, kg: unknown) => {
    const n = asNum(kg)
    if (typeof d === 'string' && DAY_KEY.test(d) && n !== undefined && n >= 20 && n <= 300) out[d as DayKey] = n
  }
  if (Array.isArray(raw)) { for (const x of raw) if (isObj(x)) put(x.date, x.kg ?? x.weightKg) }
  else if (isObj(raw)) { for (const [d, kg] of Object.entries(raw)) put(d, kg) }
  return out
}

/** 저장된 것을 앱이 쓸 수 있는 꼴로 되살린다. 무엇이 들어와도 던지지 않는다 */
export function restoreState(parsed: unknown, today: DayKey = todayKey()): AppState {
  const src = isObj(parsed) ? parsed : {}

  const diary: Record<DayKey, SelectedItem[]> = {}
  if (isObj(src.diary)) {
    for (const [k, v] of Object.entries(src.diary)) {
      if (!DAY_KEY.test(k)) continue
      const day = restoreDay(v)
      if (day.length) diary[k as DayKey] = day
    }
  }
  // 예전 판은 하루치만 담고 있었다. 그 내용을 오늘 기록으로 옮긴다.
  if (!diary[today]) {
    const legacy = restoreDay(src.selected)
    if (legacy.length) diary[today] = legacy
  }

  /*
   * 이미 체중을 적어 오신 분들을 위해, 불러올 때 한 번 읽어 둔다.
   * 이 계산이 없던 동안 쌓인 기록도 이제부터는 반영된다.
   */
  const weights = restoreWeights(src.weights)
  const observed = observedWeightLoss(weights, today)

  const shown: Record<string, string[]> = {}
  if (isObj(src.shown)) {
    for (const [k, v] of Object.entries(src.shown)) {
      if (DAY_KEY.test(k) && Array.isArray(v)) shown[k] = v.filter((x): x is string => typeof x === 'string')
    }
  }

  return {
    patient: {
      ...restorePatient(src.patient),
      observedLossPct: observed?.pct,
      observedLossNote: observed ? `${observed.fromKg} → ${observed.toKg} kg (${observed.days}일)` : undefined
    },
    diary,
    shown: pruneShown(shown),
    weights,
    supplements: asList(src.supplements).filter((x): x is string => typeof x === 'string'),
    /*
     * 글자 크기도 돌려준다. 한동안 이 칸을 빼먹고 돌려줘서, 글자를 키워 두셔도
     * 앱을 다시 여실 때마다 원래 크기로 돌아갔다 — 저장은 되고 있었는데 읽지를 않았다.
     */
    textSize: typeof src.textSize === 'string' && TEXT_SIZES.includes(src.textSize)
      ? (src.textSize as NonNullable<AppState['textSize']>) : 'normal'
  }
}

/**
 * 화면에서 올라온 바뀐 값을 저장하기 전에 한 번 거른다.
 *
 * 저장 자료를 읽을 때는 걸러 읽는데(restorePatient) 쓰는 길에는 문이 없었다. 그래서 화면 어느 한 군데가
 * 범위 밖 값을 올리면 그대로 저장됐다가, 다음에 열 때 "잘못된 값" 으로 버려졌다 — 쓰시는 분은 고친 것이 사라진 줄 안다.
 * 읽는 문과 같은 잣대를 쓰는 문을 쓰는 길에도 둔다. 범위 밖 값은 그 칸만 버리고 나머지는 받는다.
 */
export function cleanPatch(patch: Partial<PatientContext>): Partial<PatientContext> {
  const out: Partial<PatientContext> = { ...patch }
  const inRange = (v: unknown, lim: { min: number; max: number }) => typeof v === 'number' && Number.isFinite(v) && v >= lim.min && v <= lim.max
  if ('weightKg' in out && !inRange(out.weightKg, BODY_LIMITS.weightKg)) delete out.weightKg
  if ('heightCm' in out && !inRange(out.heightCm, BODY_LIMITS.heightCm)) delete out.heightCm
  if ('age' in out && !inRange(out.age, BODY_LIMITS.age)) delete out.age
  if ('weightLossPct' in out) {
    const v = out.weightLossPct
    /* 60 % 를 넘는 감소율은 잘못 친 것이다(6개월 전 체중에 300 을 넣은 경우) — 읽는 문이 0 으로 되돌리는 값이라 여기서도 받지 않는다 */
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 60) delete out.weightLossPct
  }
  if ('medications' in out) out.medications = normalizeMedications(Array.isArray(out.medications) ? out.medications : [])
  return out
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return restoreState(JSON.parse(raw))
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

/** 빈 날에 돌려줄 고정된 빈 목록 — 그릴 때마다 새로 만들지 않는다 */
const EMPTY_DAY: SelectedItem[] = []

export function useAppState() {
  const [state, setState] = useState<AppState>(load)
  /** 지금 보고 있는 날짜. 기본은 오늘이고, 기록에서 다른 날로 옮겨 갈 수 있다. */
  const [day, setDay] = useState<DayKey>(todayKey())

  /** 그날의 식단 */
  /*
   * 그날의 식단.
   *
   * 예전에는 `state.diary[day] ?? []` 였다. 아직 아무것도 담지 않으신 날에는
   * 그릴 때마다 새 빈 배열이 만들어져, 이 값을 지켜보는 쪽에서는
   * '식단이 바뀌었다' 로 읽혔다. 추천 화면은 그 신호에 지금까지 만든 안을 버리므로,
   * 앱의 다른 무엇이든(체중을 적으셔도) 바뀌면 '다시 구성' 이 처음으로 되돌아갔다.
   * 빈 날에는 늘 같은 빈 배열을 돌려준다.
   */
  const selected = useMemo(() => state.diary[day] ?? EMPTY_DAY, [state.diary, day])

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
    setState((s) => {
      const clean = cleanPatch(patch)
      return { ...s, patient: linkWarfarin({ ...s.patient, ...clean }, clean) }
    })
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
      /*
       * 범위 안의 값만 적는다. 0 은 "그날 기록을 지운다" 는 뜻이고, 그 밖의 범위 밖 값은 없던 일로 한다 —
       * 1000 kg 이 한 번 들어가면 그것이 '예전 체중' 이 되어 감소율이 90 % 로 계산된다.
       * 화면에서도 막지만 여기서 한 번 더 막는다. 화면은 여러 군데고 이 문은 하나다.
       */
      if (kg === 0) delete next[forDay]
      else if (Number.isFinite(kg) && kg >= BODY_LIMITS.weightKg.min && kg <= BODY_LIMITS.weightKg.max) next[forDay] = kg
      else return s

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
