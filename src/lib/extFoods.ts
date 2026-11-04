import { FOOD_BY_ID } from '../data/foods'
import type { Food, SelectedItem } from '../data/types'
import { readExtFoods } from './foodStore'

/**
 * 내려받은 시판 식품(kx-번호)을 기록과 합계가 찾을 수 있게 한다.
 *
 * 합계·끼니 목록·판정은 모두 FOOD_BY_ID 에서 음식을 찾는데, 이 표에는 앱에 든 음식만 있고
 * 시판 27만 종은 기기 저장소(IndexedDB)에 따로 있다. 그래서 찾기·바코드로 담은 제품은
 * '담았습니다' 라고 해 놓고 목록에도 합계에도 나오지 않았다. 나트륨 614 mg 짜리 국수를 담아도
 * 화면에는 0 mg '적정' 이었다(2026-11-04 화면에서 재현).
 *
 * 담을 때 그 제품을 FOOD_BY_ID 에 올리면 찾는 자리 열다섯 곳이 그대로 맞는다.
 * 다시 열 때 첫 화면이 비지 않도록, 그리고 저장소가 지워져도 기록이 남도록 사본을 함께 적어 둔다.
 * 사본은 식단 기록과 다른 칸에 둔다 — 저장 공간이 차서 사본을 못 적어도 기록은 적혀야 한다.
 */

const KEY = 'harucharim.extFoods.v1'

const isExtId = (id: string) => /^kx-\d+$/.test(id)
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** 찾지 못한 음식 옆에 적는 말. 시판 식품만 되찾을 길이 있다 */
export function missingFoodNote(foodId: string): string {
  return isExtId(foodId)
    ? '기기에 상품 데이터가 없어 이름과 성분을 모릅니다. 합계에 들어가지 않았습니다. 내 정보에서 상품 데이터를 받고 앱을 다시 여시면 돌아옵니다.'
    : '자료에서 없어진 음식입니다. 합계에 들어가지 않았습니다.'
}

/** 적어 둔 사본 하나를 믿을 수 있는 꼴로. 어긋나면 null — 무엇이 들어와도 던지지 않는다 */
export function cleanExtFood(id: string, raw: unknown): Food | null {
  if (!isExtId(id) || !isObj(raw)) return null
  const { name, group, serving, per100, tags } = raw
  if (typeof name !== 'string' || !name || typeof group !== 'string') return null
  if (!isObj(serving) || typeof serving.label !== 'string') return null
  if (typeof serving.g !== 'number' || !Number.isFinite(serving.g) || serving.g <= 0) return null
  if (!isObj(per100) || !Array.isArray(tags)) return null
  const values: Record<string, number> = {}
  for (const [k, v] of Object.entries(per100)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) values[k] = v
  }
  if (values.kcal === undefined) values.kcal = 0
  return {
    ...raw,
    id,
    per100: values,
    tags: tags.filter((t) => typeof t === 'string')
  } as unknown as Food
}

function readSaved(): Record<string, Food> {
  const out: Record<string, Food> = {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (isObj(parsed)) {
      for (const [id, raw] of Object.entries(parsed)) {
        const food = cleanExtFood(id, raw)
        if (food) out[id] = food
      }
    }
  } catch {
    /* 사본이 망가졌으면 없는 셈 친다 — 저장소에서 다시 찾는다 */
  }
  return out
}

function writeSaved(foods: Record<string, Food>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(foods))
  } catch {
    /* 저장이 막힌 브라우저이거나 공간이 찼다. 지금 화면에는 이미 올라가 있고, 다음에 열 때 저장소에서 찾는다 */
  }
}

/** 담기 전에 부른다. 앱에 든 음식은 그대로 둔다 */
export function rememberExtFood(food: Food) {
  if (!isExtId(food.id)) return
  FOOD_BY_ID[food.id] = food
  const saved = readSaved()
  saved[food.id] = food
  writeSaved(saved)
}

/** 앱을 열 때 기록을 읽기 전에 부른다 — 첫 화면부터 합계가 맞게 */
export function loadSavedExtFoods() {
  for (const [id, food] of Object.entries(readSaved())) FOOD_BY_ID[id] = food
}

/** 기록 어디에도 없는 사본을 덜어 낸다. 담았다 뺀 것이 쌓이지 않게 */
export function pruneExtFoods(diary: Record<string, SelectedItem[]>) {
  const used = new Set(extIdsIn(diary))
  const saved = readSaved()
  const kept = Object.entries(saved).filter(([id]) => used.has(id))
  if (kept.length !== Object.keys(saved).length) writeSaved(Object.fromEntries(kept))
}

export function extIdsIn(diary: Record<string, SelectedItem[]>): string[] {
  const ids = new Set<string>()
  for (const items of Object.values(diary)) {
    for (const it of items) if (isExtId(it.foodId)) ids.add(it.foodId)
  }
  return [...ids]
}

/**
 * 저장소에서 읽은 최신 값을 올린다. 달라진 음식의 id 를 돌려준다.
 *
 * 자료가 고쳐지면(나트륨 값이 돌아오는 경우처럼) 전에 담은 제품도 새 값을 따라야 한다.
 * 다만 이름이 다르면 올리지 않는다. 번호로 찾는 자료라 행이 밀리면 같은 번호가 다른 제품을 가리키는데,
 * 그때 새 값을 믿으면 어제 먹은 국수가 간장으로 바뀐다. 적어 둔 사본이 없는 예전 기록은 번호를 믿는 수밖에 없다.
 */
export function applyFreshExtFoods(fresh: Map<string, Food>): string[] {
  const changed: string[] = []
  const saved = readSaved()
  for (const [id, food] of fresh) {
    const cur = FOOD_BY_ID[id]
    if (cur && cur.name !== food.name) continue
    if (cur && JSON.stringify(cur) === JSON.stringify(food)) continue
    FOOD_BY_ID[id] = food
    saved[id] = food
    changed.push(id)
  }
  if (changed.length > 0) writeSaved(saved)
  return changed
}

/** 기록에 있는 시판 식품을 저장소와 맞춘다. 저장소가 없으면 적어 둔 사본대로 둔다 */
export async function refreshExtFoods(diary: Record<string, SelectedItem[]>): Promise<string[]> {
  const ids = extIdsIn(diary)
  if (ids.length === 0) return []
  return applyFreshExtFoods(await readExtFoods(ids))
}
