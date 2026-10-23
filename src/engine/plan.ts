/**
 * 여러 날 식단과 장보기 목록(2026-10-23).
 *
 * 하루 식단(buildDayMenu)을 날짜별로 이어 짠다 — 앞날에 오른 음식은 뒷날에 '최근에 보신 것' 으로 넘겨 되풀이를 막고,
 * 앞날 재료는 뒷날에 '이미 사 둘 재료' 로 넘겨 장보기 가짓수를 줄인다.
 *
 * 최대 5일: 육류·생선을 냉장 보관으로 신선하게 둘 수 있는 기간을 가늠해 정한 범위다(전문의 결정, 2026-10-23).
 * 같은 이유로 생선·고기 요리가 든 날을 앞으로 둔다 — 날짜마다 식단이 따로 유효하므로 순서를 바꿔도 판정은 그대로다.
 */
import type { PatientContext, SelectedItem, Supplement, MealSlot } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { buildDayMenu, recentFoods, type DayMenu } from './menu'
import { ingredientsOf, INGREDIENT_CATEGORIES, type Ingredient, type IngredientCategory } from '../data/foods/recipes'
import { mealRole } from '../data/foods'
import { addDays } from '../lib/day'

export const PLAN_MAX_DAYS = 5

export interface PlanDay {
  day: string
  menu: DayMenu
}

export interface PlanOptions {
  supplements?: Supplement[]
  /** 첫날에만 담으신 것이 들어간다 — 뒷날은 처음부터 짠다 */
  selected?: SelectedItem[]
  diary?: Record<string, SelectedItem[]>
  shown?: Record<string, string[]>
  nonce?: number
  days: number
  startDay: string
  /** 앞날 재료를 뒷날 요리 고르기에 반영할지(기본 켬) — 검사에서 효과를 재려고 끌 수 있다 */
  linkIngredients?: boolean
}

const PERISH = { fish: /고등어|연어|대구|갈치|꽁치|생선|새우|오징어|문어|꽃게|바지락|전복|해삼|방어|굴비|명란|미꾸라지|장어/, meat: /소고기|돼지|삼겹|닭|오리|영계|갈비|양지|사태|등심|안심/ }

/** 날의 '상하기 쉬움' — 생선 2점, 고기 1점. 큰 날부터 앞에 둔다 */
function perishability(menu: DayMenu): number {
  let score = 0
  for (const slot of MEAL_SLOTS) for (const e of menu.meals[slot]) {
    for (const ing of ingredientsOf(e.food, e.servings)) {
      if (ing.cat === '어패류' || PERISH.fish.test(ing.name)) score = Math.max(score, 2)
      else if (ing.cat === '육류' || PERISH.meat.test(ing.name)) score = Math.max(score, 1)
    }
  }
  return score
}

export function buildPlan(patient: PatientContext, opts: PlanOptions): PlanDay[] {
  const days = Math.max(1, Math.min(PLAN_MAX_DAYS, Math.round(opts.days)))
  const out: PlanDay[] = []
  const bought = new Set<string>()
  const built: { day: string; ids: string[] }[] = []
  for (let d = 0; d < days; d++) {
    const day = addDays(opts.startDay, d)
    const recent = recentFoods(opts.diary ?? {}, day, undefined, opts.shown ?? {})
    /* 앞날에 오른 것은 '며칠 전에 보신 것' 으로 — 첫날 것은 둘째 날에 1일 전 */
    for (const b of built) {
      const ago = d - built.indexOf(b)
      for (const id of b.ids) if (!recent.has(id) || recent.get(id)! > ago) recent.set(id, ago)
    }
    /*
     * 어제와 같은 요리가 또 오르지 않게 — 하루치 엔진의 되풀이 방지는 '눈에 띄는 것' 에만 걸려,
     * 청경채 두부덮밥·들깨 두부죽 같은 한 그릇 요리는 닷새 중 사흘 오르기도 했다(2026-10-23 측정: 날 경계마다 0.6개).
     * 그래서 안을 셋 만들어 보고 어제·그제와 요리가 가장 덜 겹치는 것을 고른다. 과일·우유·밥은 겹쳐도 된다(사 두고 먹는 것이다).
     */
    const prev1 = built[built.length - 1]?.ids ?? [], prev2 = built[built.length - 2]?.ids ?? []
    const countable = (m: DayMenu) => MEAL_SLOTS.flatMap((s) => m.meals[s]).filter((e) => !['dessert', 'staple', 'supp'].includes(mealRole(e.food))).map((e) => e.food.id)
    let menu: DayMenu | undefined, best = Infinity
    for (let t = 0; t < (d === 0 ? 1 : 3); t++) {
      const m = buildDayMenu(d === 0 ? (opts.selected ?? []) : [], patient, {
        supplements: opts.supplements ?? [], day, nonce: (opts.nonce ?? 0) + t, recent,
        preferIngredients: opts.linkIngredients === false ? undefined : (bought.size ? bought : undefined)
      })
      const ids = countable(m)
      const overlap = ids.filter((id) => prev1.includes(id)).length + 0.5 * ids.filter((id) => prev2.includes(id)).length
      if (overlap < best) { best = overlap; menu = m }
      if (overlap === 0) break
    }
    menu = menu!
    const ids = MEAL_SLOTS.flatMap((s) => menu.meals[s].map((e) => e.food.id))
    built.push({ day, ids })
    for (const s of MEAL_SLOTS) for (const e of menu.meals[s]) for (const ing of ingredientsOf(e.food)) if (!ing.self && ing.cat !== '양념·기본 재료') bought.add(ing.name)
    out.push({ day, menu })
  }
  /*
   * 생선·고기가 든 날을 앞으로. 첫날은 담으신 것이 있을 수 있으니 그대로 두고, 나머지만 정렬한다.
   * 날짜는 자리를 지키고 식단만 옮긴다 — 날짜가 바뀌어도 계절은 같고(5일 안), 판정은 하루 단위로 유효하다.
   */
  if (out.length > 2) {
    const head = out[0]
    const rest = out.slice(1).map((p) => ({ p, k: perishability(p.menu) }))
    rest.sort((a, b) => b.k - a.k)
    const dates = out.slice(1).map((p) => p.day)
    return [head, ...rest.map((r, i) => ({ day: dates[i], menu: r.p.menu }))]
  }
  return out
}

/* ─────────────────────────── 장보기 목록 ─────────────────────────── */
export interface ShoppingItem {
  name: string
  qty: number
  unit: string
  cat: IngredientCategory
  /** 어느 요리에 쓰는가(화면에서 '왜 사는지' 를 보여 준다) */
  uses: string[]
  /** 음식 그 자체를 사는 것 */
  self?: boolean
  label?: string
}

export interface ShoppingList {
  groups: { cat: IngredientCategory; items: ShoppingItem[] }[]
  /** 재료표가 없어 그 음식 자체로 적은 것의 수 */
  selfCount: number
  itemCount: number
}

const CAT_ORDER = new Map(INGREDIENT_CATEGORIES.map((c, i) => [c, i]))

/** 작은술은 큰술로 모은다(3작은술 = 1큰술) — '간장 2큰술' 과 '간장 3작은술' 이 두 줄로 서지 않게 */
function normalize(ing: Ingredient): Ingredient {
  if (ing.unit === '작은술') return { ...ing, unit: '큰술', qty: Math.round((ing.qty / 3) * 100) / 100 }
  return ing
}

export function shoppingList(plan: PlanDay[]): ShoppingList {
  const acc = new Map<string, ShoppingItem>()
  for (const p of plan) for (const slot of MEAL_SLOTS) for (const e of p.menu.meals[slot]) {
    for (const raw of ingredientsOf(e.food, e.servings)) {
      const ing = normalize(raw)
      const key = `${ing.name}|${ing.unit}`
      const cur = acc.get(key)
      if (cur) {
        cur.qty = Math.round((cur.qty + ing.qty) * 100) / 100
        if (!cur.uses.includes(e.food.name)) cur.uses.push(e.food.name)
      } else {
        acc.set(key, { name: ing.name, qty: ing.qty, unit: ing.unit, cat: ing.cat, uses: [e.food.name], self: ing.self, label: ing.label })
      }
    }
  }
  const byCat = new Map<IngredientCategory, ShoppingItem[]>()
  for (const it of acc.values()) (byCat.get(it.cat) ?? byCat.set(it.cat, []).get(it.cat)!).push(it)
  const groups = [...byCat].sort((a, b) => (CAT_ORDER.get(a[0]) ?? 99) - (CAT_ORDER.get(b[0]) ?? 99))
    .map(([cat, items]) => ({ cat, items: items.sort((a, b) => a.name.localeCompare(b.name, 'ko')) }))
  const all = [...acc.values()]
  return { groups, selfCount: all.filter((i) => i.self).length, itemCount: all.length }
}

/** 양을 사람이 읽는 말로 — '1.5 큰술' 은 '1과 1/2 큰술', 'g' 은 반올림 */
export function fmtQty(it: Pick<ShoppingItem, 'qty' | 'unit' | 'self' | 'label'>): string {
  if (it.self) return it.qty === 1 ? (it.label ?? '1인분') : `${it.label ?? '1인분'} × ${fmtNum(it.qty)}`
  if (it.unit === 'g' || it.unit === 'mL') return `${Math.round(it.qty)} ${it.unit}`
  return `${fmtNum(it.qty)} ${it.unit}`
}
function fmtNum(n: number): string {
  /* ¼·⅓·½·⅔·¾ 가운데 가장 가까운 것으로 */
  const whole = Math.floor(n + 1e-6)
  const r = n - whole
  const steps: [number, string][] = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']]
  let best = steps[0]
  for (const st of steps) if (Math.abs(st[0] - r) < Math.abs(best[0] - r)) best = st
  const w = best[0] === 1 ? whole + 1 : whole
  return w === 0 ? (best[1] || '0') : best[1] ? `${w}${best[1]}` : String(w)
}

/** 복사·공유용 글 */
export function shoppingText(plan: PlanDay[], list: ShoppingList, label: (d: string) => string): string {
  const lines: string[] = []
  lines.push(`하루차림 장보기 — ${label(plan[0].day)}${plan.length > 1 ? ` ~ ${label(plan[plan.length - 1].day)} (${plan.length}일, 1인분)` : ' (1인분)'}`)
  for (const g of list.groups) {
    lines.push('', `[${g.cat}]`)
    for (const it of g.items) lines.push(`□ ${it.name} ${fmtQty(it)}`)
  }
  lines.push('', '양은 집에서 1인분을 만들 때의 가늠입니다. 포장 단위에 맞춰 조정하세요.')
  return lines.join('\n')
}

/** 하루치를 담을 때 넘길 항목 */
export function planItems(p: PlanDay): { foodId: string; servings: number; meal: MealSlot }[] {
  return MEAL_SLOTS.flatMap((slot) => p.menu.meals[slot].filter((e) => e.origin === 'added').map((e) => ({ foodId: e.food.id, servings: e.servings, meal: slot })))
}
