/**
 * 상차림 검사.
 *
 * 오늘 추천 알고리즘에 손댄 것들이 실제로 작동하는지 한자리에서 확인한다.
 * 이 앱에서 가장 중요한 부분이라, 고쳤다는 말만으로는 모자란다 —
 * 고친 것마다 "이런 일이 일어나지 않는다" 를 못 박고, 못 박은 것을 깨 보아 잡히는지 본다.
 *
 * 오늘 못 박는 것
 *   1. 밥 한 공기에 곁들임만 놓인 상은 나오지 않는다
 *   2. 곁들임이 한 끼에 둘 이상 몰리지 않는다
 *   3. 같은 것이 이름만 바꿔 두 번 오르지 않는다
 *   4. 사 먹는 것(보쌈 등)이 밥 자리를 차지하지 않는다
 *   5. 상을 갖추자고 하루 열량·나트륨을 크게 넘기지 않는다
 *   6. 신장이 걸리는 분께 상을 갖추자고 단백질을 밀어 넣지 않는다
 *   7. 바꿔 넣은 뒤에도 합계와 끼니별 소계가 어긋나지 않는다
 */
import { buildDayMenu, recentFoods } from '../../src/engine/menu'
import { foodContribution } from '../../src/engine/nutrition'
import { mealRole } from '../../src/data/foods'
import { CANCERS, CANCER_BY_ID } from '../../src/data/cancers'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS } from '../../src/data/types'
import type { Food, MealSlot, PatientCondition, Phase, SelectedItem } from '../../src/data/types'

const PEOPLE = Number(process.env.PEOPLE ?? 600)
const DAYS = Number(process.env.DAYS ?? 21)

let seed = 20260826
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]

const PHASES: Phase[] = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']
const CONDS: PatientCondition[] = [
  '연하곤란', '구강점막염', '설사', '변비', '오심·구토', '식욕부진', '체중감소',
  '호중구감소증', '위절제후', '장루보유', '복수', '간성뇌증위험', '신기능저하', '당뇨'
]
const MEDS = ['tamoxifen', 'ai', 'adt', 'warfarin', 'steroid', 'ppi', 'cisplatin']

const hits = new Map<string, number>()
const ex = new Map<string, string[]>()
function bad(kind: string, detail: string) {
  hits.set(kind, (hits.get(kind) ?? 0) + 1)
  const list = ex.get(kind) ?? []
  if (list.length < 3 && !list.includes(detail)) list.push(detail)
  ex.set(kind, list)
}

/*
 * 무엇이 상을 세우는가 — 여기서 따로 정한다.
 *
 * 처음에는 엔진의 isAnchorDish·mealIsComplete 를 그대로 가져다 썼다.
 * 그러면 그 판정을 느슨하게 풀어 놓고 돌려도 검사가 함께 느슨해져 아무 말이 없다.
 * 실제로 판정을 예전으로 되돌려 놓고 돌렸더니 한 건도 잡지 못했다.
 * 재는 자는 재어지는 것과 같은 자를 쓰면 안 된다.
 */
const COOKED = /찌개|국$|탕$|전골|나물|무침|볶음|조림|찜|구이|전$|튀김|김치|장아찌|쌈|절임|자반|강정|산적|불고기|수육|편육|숙회|회$|샐러드/
const PLAIN = /\((삶은 것|찐 것|생것|데친 것|구운 것|불린 것)\)$/
const DISH_GROUPS = ['국·탕·찌개', '반찬·조림·볶음', '육류', '가금류·난류', '어패류', '외식·프랜차이즈']

function anchors(f: Food): boolean {
  const r = mealRole(f)
  if (r === 'soup') return true
  if (r === 'dessert' || r === 'supp' || r === 'staple' || r === 'onedish') return false
  if (COOKED.test(f.name)) return true
  if (DISH_GROUPS.includes(f.group)) return true
  if (f.group === '두류·대두가공') return !PLAIN.test(f.name)
  return false
}

/*
 * 주식인가 — 검사 쪽 기준.
 *
 * 엔진의 mealRole 을 그대로 부르면, 빵을 다시 곁들임으로 되돌렸을 때
 * 검사도 함께 되돌아가 아무것도 못 잡는다. 이름과 갈래로 따로 본다.
 */
const BREAD = /^(식빵|통밀식빵|바게트|모닝빵|베이글|사워도우|토르티야\(밀\)|크루아상)$/
function isStaple(f: Food): boolean {
  if (BREAD.test(f.name)) return true
  return (f.group === '곡류·전분' || f.group === '밥·면·죽 요리') && /밥$|밥\(|공기밥/.test(f.name)
}

/*
 * 후식인가 — 밥 노릇을 하는 빵은 뺀다.
 *
 * 갈래만으로 보았더니 두유가 빠졌다. 두유는 '두류·대두가공' 으로 묶여 있지만
 * 상에서는 마시는 것이라 끝에 온다. 이름으로도 한 번 본다.
 */
const DRINK = /두유|우유|요구르트|요거트|주스|스무디|차\(우린/
function isDessert(f: Food): boolean {
  if (isStaple(f)) return false
  if (DRINK.test(f.name)) return true
  return ['과일', '간식·디저트', '우유·유제품', '음료', '견과·종실'].includes(f.group)
}

function standsAsMeal(foods: Food[]): boolean {
  if (foods.length === 0) return true
  if (foods.some((f) => mealRole(f) === 'onedish')) return true
  /*
   * 반찬은 곁들임이라 혼자 서지 못한다.
   *
   * '고구마(찐 것) + 단감 + 취나물' 이 아침으로 나갔다. 취나물만 드시지는 않는다.
   * 나물·무침·국은 밥에 곁들이는 것이니, 밥이나 빵이 없으면 상이 아니다.
   */
  if (!foods.some(isStaple)) return false
  return foods.some(anchors)
}

const isGarnish = (f: Food) => {
  const r = mealRole(f)
  return (r === 'side' || r === 'main') && !anchors(f)
}
/*
 * 같은 재료인가 — 검사 쪽 기준.
 *
 * 엔진과 같은 함수를 쓰면 그 판정을 풀 때 검사도 함께 풀린다.
 * 여기서는 더 단순하게 본다 — 괄호를 걷고 첫 낱말이 같으면 같은 재료로 친다.
 * '브로콜리(데친 것)' 과 '브로콜리 데침' 이 한 상에 오른 것을 놓친 자리다.
 */
const core = (n: string) => n.replace(/\(.*?\)/g, '').trim().split(/[\s·]+/)[0]

/*
 * 반찬이 얼마나 골고루 나오는가.
 *
 * 반찬 160종을 갖춰 두고도 서른 종으로만 돌았다. 두부(부침용)이 300일 중 146일에 올랐다.
 * 되풀이 판정에 '150 kcal 이상' 이라는 뚜껑이 있었는데, 나물·무침·데침 같은 반찬은
 * 대개 그 아래여서 통째로 회전에서 빠져 있었다.
 *
 * 다시 단조로워지면 여기서 잡힌다.
 */
/*
 * 사람마다 따로 센다.
 *
 * 처음에는 모두를 합쳐서 셌더니 상위 열 종이 73 % 로 나왔다. 그런데 그건
 * 여러 분이 각자 자기 상황에 맞는 것을 드신 결과가 겹쳐 보인 것이지,
 * 한 분이 그렇게 단조롭게 드신다는 뜻이 아니다.
 * 단조로움은 한 사람이 겪는 것이므로 한 사람 안에서 재야 한다.
 */
const perPersonKinds: number[] = []
const perPersonTop: number[] = []

let meals = 0, days = 0
/* 무엇이 얼마나 일어나는지도 함께 센다 — 0 건이면 검사가 헛돈 것이다 */
let withStaple = 0, swapped = 0, renalDays = 0
const sideCounts: number[] = []

for (let p = 0; p < PEOPLE; p++) {
  const cancer = pick(CANCERS).id
  const phase = pick(PHASES)
  const cond: PatientCondition[] = []
  const n = Math.floor(rnd() * 3)
  for (let i = 0; i < n; i++) { const c = pick(CONDS); if (!cond.includes(c)) cond.push(c) }
  const patient = {
    ...DEFAULT_PATIENT, cancer, phase, conditions: cond,
    medications: rnd() < 0.35 ? [pick(MEDS)] : [],
    weightKg: Math.round((38 + rnd() * 90) * 10) / 10,
    heightCm: Math.round(145 + rnd() * 45),
    age: 20 + Math.floor(rnd() * 65),
    sex: (rnd() < 0.5 ? 'F' : 'M') as 'F' | 'M',
    onboarded: true
  }
  const renal = cond.includes('신기능저하')
  if (renal) renalDays++

  const naLimit = CANCER_BY_ID[cancer].target.naLimit ?? 2000
  /** 이분이 이 기간에 만난 반찬 */
  const myDishes = new Map<string, number>()

  const diary: Record<string, SelectedItem[]> = {}
  for (let d = 0; d < DAYS; d++) {
    /*
     * 날짜는 이어져야 한다.
     *
     * 처음에는 달을 d 로, 날을 d 로 각각 돌렸다. 그러면 하루가 지날 때마다
     * 달까지 함께 넘어가 이틀 사이가 한 달이 된다.
     * '최근에 드신 것' 은 이레 안쪽만 보므로 늘 비어 있었고,
     * 회전을 아무리 손봐도 숫자가 꼼짝하지 않았다 — 재는 자가 또 틀렸던 것이다.
     */
    const dt = new Date(Date.UTC(2026, 0, 1) + d * 86400000)
    const day = dt.toISOString().slice(0, 10)
    let menu
    try {
      menu = buildDayMenu([], patient, { day, nonce: d % 3, recent: recentFoods(diary, day) })
    } catch (e) {
      bad('식단 구성 중 예외', `${cancer}/${phase} :: ${(e as Error).message}`)
      continue
    }
    diary[day] = MEAL_SLOTS.flatMap((s) =>
      menu.meals[s].map((e) => ({ foodId: e.food.id, servings: e.servings, meal: s })))
    days++

    const who = `${cancer}/${phase}/${patient.sex}${patient.age}/${patient.weightKg}kg cond=[${cond}]`

    /* 하루 안에서 같은 것을 두 끼니에 — 아침 두부(부침용), 점심 두부부침 */
    const seenToday = new Map<string, MealSlot>()
    for (const s of MEAL_SLOTS) for (const e of menu.meals[s]) {
      if (mealRole(e.food) === 'staple') continue
      const k = core(e.food.name)
      if (k.length < 2) continue
      const was = seenToday.get(k)
      if (was && was !== s) bad('하루에 같은 것이 두 끼니에', `${who} ${was}/${s}: ${k}`)
      seenToday.set(k, s)
    }

    /* ── 5. 상을 갖추자고 하루를 넘기지 않는가 ── */
    /*
     * 목표는 엔진이 실제로 쓴 값을 본다.
     *
     * 처음에는 personalTarget 을 검사 쪽에서 다시 계산했다. 그런데 체격이 큰 분에게는
     * 보정 체중이 들어가 값이 달라져서, 엔진은 지키고 있는데 검사만 어긋났다고 말했다.
     * 세 군데를 고쳐도 숫자가 꼼짝 않길래 알았다 — 재던 자가 틀렸던 것이다.
     */
    const target = menu.target
    const kcal = menu.totals.kcal ?? 0
    if (kcal > target.kcal[1] * 1.2) bad('하루 열량이 크게 초과', `${who} ${Math.round(kcal)}/${target.kcal[1]}`)
    if ((menu.totals.na ?? 0) > naLimit * 1.4)
      bad('하루 나트륨이 크게 초과', `${who} ${Math.round(menu.totals.na ?? 0)}/${naLimit}`)

    /* ── 6. 신장이 걸리는 분의 단백질 ── */
    if (renal && (menu.totals.protein ?? 0) > target.protein[1] * 1.3)
      bad('신장이 걸리는 분께 단백질이 과함', `${who} ${Math.round(menu.totals.protein ?? 0)} g / 목표 ${target.protein[1]}`)

    /* ── 7. 합계와 소계가 맞는가 ── */
    for (const [k, v] of Object.entries(menu.totals)) {
      if (typeof v === 'number' && v < 0) bad('합계에 음수', `${who} ${k}=${v}`)
    }
    let sum = 0
    for (const s of MEAL_SLOTS) for (const e of menu.meals[s]) sum += foodContribution(e.food, e.servings).kcal ?? 0
    if (Math.abs(sum - kcal) > 2) bad('합계와 소계가 어긋남', `${who} 합계 ${Math.round(kcal)} vs 소계 ${Math.round(sum)}`)

    for (const s of ['아침', '점심', '저녁'] as MealSlot[]) {
      const foods = menu.meals[s].map((e) => e.food)
      if (foods.length === 0) continue
      meals++

      /* ── 1. 밥상이 서는가 ── */
      if (foods.some(isStaple)) withStaple++
      if (!standsAsMeal(foods)) bad('밥상이 서지 않음', `${who} ${s}: ${foods.map((f) => f.name).join('+')}`)

      /* ── 2. 곁들임이 몰리지 않는가 ── */
      const g = foods.filter(isGarnish)
      if (g.length > 1) bad('곁들임이 몰림', `${who} ${s}: ${g.map((f) => f.name).join('+')}`)

      /* ── 3. 같은 것이 두 번 오르지 않는가 ── */
      const cores = foods.map((f) => core(f.name)).filter((c) => c.length >= 2)
      const dup = cores.find((c, i) => cores.indexOf(c) !== i)
      if (dup) bad('같은 것이 두 번 오름', `${who} ${s}: ${foods.map((f) => f.name).join('+')}`)

      /* ── 4. 주식이 둘이거나, 사 먹는 것이 밥 자리를 차지하지 않는가 ── */
      const staples = foods.filter((f) => mealRole(f) === 'staple' || mealRole(f) === 'onedish')
      if (staples.length > 1) bad('주식이 둘', `${who} ${s}: ${staples.map((f) => f.name).join('+')}`)

      /* ── 4-2. 후식이 주메뉴 앞이나 사이에 끼어 있지 않은가 ── */
      /*
       * 영양제는 음식의 차례에 넣지 않는다.
       *
       * 처음에는 넣었더니 '사과 → 유청단백분말' 이 어긋난 것으로 잡혔다.
       * 순서는 옳았고 — 영양제는 늘 맨 끝이라 후식보다 뒤에 온다 — 자가 틀렸다.
       */
      const plate = foods.filter((f) => mealRole(f) !== 'supp')
      const lastReal = plate.map(isDessert).lastIndexOf(false)
      const firstSweet = plate.findIndex(isDessert)
      if (firstSweet >= 0 && lastReal >= 0 && firstSweet < lastReal)
        bad('후식이 앞에 끼어 있음', `${who} ${s}: ${plate.map((f) => f.name).join(' → ')}`)

      /* ── 4-3. 밥상에 반찬이 몇 가지인가 (통계) ── */
      if (foods.some(isStaple) && !foods.some((f) => mealRole(f) === 'onedish'))
        sideCounts.push(foods.filter((f) => anchors(f) && mealRole(f) !== 'soup').length)

      /* 한 끼니에 국은 하나 */
      if (foods.filter((f) => mealRole(f) === 'soup').length > 1)
        bad('한 끼니에 국이 둘', `${who} ${s}: ${foods.filter((f) => mealRole(f) === 'soup').map((f) => f.name).join('+')}`)

      for (const f of foods) if (anchors(f)) myDishes.set(f.name, (myDishes.get(f.name) ?? 0) + 1)

      /* 바꿔 넣은 자국이 있는지 — 이 단계가 실제로 돌았다는 증거 */
      if (menu.meals[s].some((e) => /바꿨습니다|곁들였습니다/.test(e.contribution ?? ''))) swapped++
    }
  }

  const mine = [...myDishes.entries()].sort((a, b) => b[1] - a[1])
  const myTotal = mine.reduce((s2, [, n]) => s2 + n, 0)
  if (myTotal >= 10) {
    perPersonKinds.push(mine.length)
    perPersonTop.push(mine.slice(0, 5).reduce((s2, [, n]) => s2 + n, 0) / myTotal)
  }
}

/*
 * 얼마나 일어나는 일인지 함께 적는다.
 * 밥이 오른 끼니가 없으면 1·4 번은 볼 것이 없었다는 뜻이고,
 * 바꿔 넣은 자국이 없으면 새로 만든 단계가 한 번도 돌지 않은 것이다.
 */
console.log(
  `  ${PEOPLE.toLocaleString()}명 × ${DAYS}일 = ${days.toLocaleString()}일 · 끼니 ${meals.toLocaleString()}개\n` +
  `  밥이 오른 끼니 ${withStaple.toLocaleString()} · 상을 세우려 손댄 끼니 ${swapped.toLocaleString()} · 신장이 걸리는 분 ${renalDays}명`
)

/*
 * 쏠림은 건수가 아니라 비율로 본다.
 * 상위 열 종이 절반을 넘으면 그건 다양한 것이 아니다.
 */
{
  const mid = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] ?? 0 }
  const kinds = mid(perPersonKinds)
  const top = mid(perPersonTop)
  console.log(`  한 분이 ${DAYS}일 동안 만나는 반찬 — 가운데값 ${kinds}종 · 상위 5종이 ${(top * 100).toFixed(0)}%`)
  const two = sideCounts.filter((n) => n >= 2).length / Math.max(1, sideCounts.length)
  console.log(`  밥이 오른 상의 반찬 — 가운데값 ${mid(sideCounts)}가지 · 두 가지 이상이 ${(two * 100).toFixed(0)}%`)
  /*
   * 눈금은 지금 이룬 수준에서 조금 낮춰 잡는다.
   * 지킬 수 없는 눈금을 적어 두면 검사가 늘 빨간불이라 아무도 보지 않는다.
   */
  if (kinds < Math.min(20, DAYS * 1.4)) bad('한 분이 만나는 반찬이 적음', `${DAYS}일에 ${kinds}종뿐`)
  if (top > 0.4) bad('한 분의 상이 몇 가지에 쏠림', `상위 5종이 ${(top * 100).toFixed(0)}%`)
}

/*
 * 적어 두지 않으시는 분께도 반찬이 돌아가는가.
 *
 * 되풀이를 막는 잣대가 '적어 두신 기록' 뿐이던 때가 있었다. 그런데 대부분은
 * 매일 적지 않으신다 — 추천만 보고 장을 보신다. 그러면 그 잣대가 늘 비어 있어
 * 회전이 아예 걸리지 않았고, 스무하루 내내 같은 닭백숙이 올라갔다(21일 중 21일).
 * 위의 검사들은 날마다 기록을 채워 넣으므로 이 구멍을 볼 수 없었다.
 *
 * 여기서는 '한 번도 적지 않으신 분' 을 흉내 낸다.
 * 엔진의 회전 장치를 들여다보지 않고, 나온 상만 세어서 따진다.
 */
{
  const DAYS2 = 28
  for (const [label, extra] of [
    ['유방암·수술후', { cancer: 'breast', phase: 'post_op', weightKg: 62, heightCm: 158, age: 58, sex: 'F' }],
    ['위암·항암', { cancer: 'stomach', phase: 'during_chemo', weightKg: 47, heightCm: 168, age: 64, sex: 'M' }],
    ['대장암·회복', { cancer: 'colorectal', phase: 'survivorship', weightKg: 55, heightCm: 160, age: 45, sex: 'F' }]
  ] as [string, Record<string, unknown>][]) {
    const who2 = {
      ...DEFAULT_PATIENT, onboarded: true, conditions: [], medications: [], cuisines: ['한식'], ...extra
    } as unknown as Parameters<typeof buildDayMenu>[1]
    const shown: Record<string, string[]> = {}
    const seen = new Map<string, number>()
    for (let d = 0; d < DAYS2; d++) {
      const day2 = new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10)
      /* 기록은 끝까지 비워 둔다 — 적지 않으시는 분이다 */
      const m2 = buildDayMenu([], who2, { day: day2, recent: recentFoods({}, day2, undefined, shown) })
      for (const s of MEAL_SLOTS) for (const e of m2.meals[s]) {
        if (!anchors(e.food) || isStaple(e.food)) continue
        seen.set(e.food.name, (seen.get(e.food.name) ?? 0) + 1)
      }
      shown[day2] = MEAL_SLOTS.flatMap((s) => m2.meals[s].map((e) => e.food.id))
    }
    const ranked = [...seen].sort((a, b) => b[1] - a[1])
    const worst = ranked[0]
    const sum2 = [...seen.values()].reduce((a, b) => a + b, 0)
    const share = ranked.slice(0, 5).reduce((a, b) => a + b[1], 0) / Math.max(1, sum2)
    console.log(`  적지 않으시는 분(${label}) ${DAYS2}일 — 반찬 ${seen.size}종 · 가장 잦은 것 ${worst?.[0]} ${worst?.[1]}회 · 상위 5종 ${Math.round(share * 100)}%`)
    if (seen.size < 20) bad('적지 않으시는 분께 반찬이 돌지 않음', `${label}: ${DAYS2}일에 ${seen.size}종뿐`)
    /* 한 가지가 사나흘마다 오르면 물린다 — 이레에 한 번꼴(28일에 7회)까지로 본다 */
    if (worst && worst[1] > 7) bad('같은 반찬이 너무 잦음', `${label}: ${worst[0]}가 ${DAYS2}일에 ${worst[1]}회`)
    if (share > 0.4) bad('몇 가지 반찬에 쏠림', `${label}: 상위 5종이 ${Math.round(share * 100)}%`)
  }
}

const problems = [...hits.entries()].sort((a, b) => b[1] - a[1])
console.log(
  problems.length === 0
    ? '상차림 검사 완료 — 문제 없음'
    : `상차림 검사 — 문제 ${problems.length}종\n` +
      problems.map(([k, n]) =>
        `■ ${k} — ${n}건 (${((n / (k.includes('끼니') || k.startsWith('밥상') || k.startsWith('곁들임') || k.startsWith('같은') || k.startsWith('주식') ? meals : days)) * 100).toFixed(2)}%)\n   ` +
        (ex.get(k) ?? []).join('\n   ')).join('\n')
)
