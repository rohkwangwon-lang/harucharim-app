import type { PatientContext, SelectedItem } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import type { PlanDay } from '../engine/plan'
import { menuConditionKey } from './menuIdentity'

/**
 * 며칠치 식단의 '다시 구성' 과 '이전 안'(2026-11-04 사용자 보고: 되돌아갈 수 없었다).
 *
 * 번호(nonce)를 하나 빼는 것으로는 앞의 안이 돌아오지 않는다. 계획을 보여 드릴 때마다 앞날의 상이
 * '보여 드린 것'(shown)에 적히고 buildPlan 이 그것을 피하므로, 같은 번호로 다시 짜면 다른 계획이 나온다.
 * 장을 이미 본 계획이 바뀌면 안 되니, 만든 계획을 그대로 들고 앞뒤로 오간다.
 *
 * 하루치(RecommendedMenu 의 drafts)와 뜻이 같다. 화면 판단을 검사에서 따질 수 있게 순수 함수로 둔다(checks/screen.ts).
 */
export type PlanBook<T> = {
  /** 이 안들을 만든 조건 — 달라지면 다른 계획이므로 버린다 */
  key: string
  /** 지금까지 만든 안. 첫 안도 여기 든다 */
  plans: T[]
  cursor: number
  /** 다음 안에 쓸 번호 — 되돌아왔다 다시 만들어도 쓴 번호를 다시 쓰지 않는다 */
  nextNonce: number
}

export function openBook<T>(key: string, make: (nonce: number) => T): PlanBook<T> {
  return { key, plans: [make(0)], cursor: 0, nextNonce: 1 }
}

export function stepBack<T>(book: PlanBook<T>): PlanBook<T> {
  return book.cursor > 0 ? { ...book, cursor: book.cursor - 1 } : book
}

/** 같은 계획만 나오면 몇 번까지 더 짜 볼지 — 며칠치는 한 번에 안을 여럿 만들어 무겁다 */
const NEXT_TRIES = 3

export function stepNext<T>(
  book: PlanBook<T>,
  make: (nonce: number) => T,
  same: (a: T, b: T) => boolean
): { book: PlanBook<T>; stuck: boolean } {
  /* 앞으로 가 본 적이 있으면 만들지 않고 그때 것을 다시 보여 드린다 */
  if (book.cursor < book.plans.length - 1) return { book: { ...book, cursor: book.cursor + 1 }, stuck: false }
  let nonce = book.nextNonce
  for (let t = 0; t < NEXT_TRIES; t++) {
    const next = make(nonce++)
    if (!same(next, book.plans[book.cursor])) {
      return { book: { ...book, plans: [...book.plans, next], cursor: book.cursor + 1, nextNonce: nonce }, stuck: false }
    }
  }
  return { book: { ...book, nextNonce: nonce }, stuck: true }
}

/** 두 계획이 같은 상인가 — 날짜·끼니·음식·양으로 견준다 */
export function planPlate(plan: PlanDay[]): string {
  return plan
    .map((p) => `${p.day}=${MEAL_SLOTS.flatMap((s) => p.menu.meals[s].map((e) => `${s}:${e.food.id}:${e.servings}`)).sort().join(',')}`)
    .join('|')
}

/**
 * 며칠치 계획의 조건. 보여 드린 것(shown)과 기록(diary)은 넣지 않는다 — 넣으면 계획을 보여 드리는 것만으로 안이 버려진다.
 * 환자 정보는 칸을 고르지 않고 통째로 본다. 여기서는 첫 안까지 들고 있어서, 빠진 칸이 있으면 바뀌기 전 계획이 그대로 남는다.
 */
export function planConditionKey(
  patient: PatientContext,
  selected: SelectedItem[],
  supplementIds: string[],
  startDay: string,
  days: number,
  pantryKey: string
): string {
  return `${menuConditionKey(patient, selected, supplementIds, startDay, new Map())}#${JSON.stringify(patient)}#${days}#${pantryKey}`
}
