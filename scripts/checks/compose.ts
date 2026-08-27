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

function standsAsMeal(foods: Food[]): boolean {
  if (foods.length === 0) return true
  if (foods.some((f) => mealRole(f) === 'onedish')) return true
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

let meals = 0, days = 0
/* 무엇이 얼마나 일어나는지도 함께 센다 — 0 건이면 검사가 헛돈 것이다 */
let withStaple = 0, swapped = 0, renalDays = 0

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

  const diary: Record<string, SelectedItem[]> = {}
  for (let d = 0; d < DAYS; d++) {
    const day = `2026-${String(1 + (d % 12)).padStart(2, '0')}-${String(1 + (d % 28)).padStart(2, '0')}`
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
      if (foods.some((f) => mealRole(f) === 'staple')) withStaple++
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

      /* 바꿔 넣은 자국이 있는지 — 이 단계가 실제로 돌았다는 증거 */
      if (menu.meals[s].some((e) => /바꿨습니다|곁들였습니다/.test(e.contribution ?? ''))) swapped++
    }
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

const problems = [...hits.entries()].sort((a, b) => b[1] - a[1])
console.log(
  problems.length === 0
    ? '상차림 검사 완료 — 문제 없음'
    : `상차림 검사 — 문제 ${problems.length}종\n` +
      problems.map(([k, n]) =>
        `■ ${k} — ${n}건 (${((n / (k.includes('끼니') || k.startsWith('밥상') || k.startsWith('곁들임') || k.startsWith('같은') || k.startsWith('주식') ? meals : days)) * 100).toFixed(2)}%)\n   ` +
        (ex.get(k) ?? []).join('\n   ')).join('\n')
)
