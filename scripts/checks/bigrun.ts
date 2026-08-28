/**
 * 대규모 무작위 실행.
 *
 * 지금까지의 검사는 각자 한 가지를 본다. 여기서는 그 규칙들을 한자리에 모아
 * 훨씬 큰 표본으로 돌린다. 드물게만 나타나는 조합은 작은 표본에서 보이지 않는다.
 *
 * 그리고 실행하면서 무엇이 얼마나 자주 추천되는지 센다.
 * 앱이 "무슨 말을 하는가" 는 규칙을 읽으면 알 수 있지만,
 * "무엇을 실제로 내놓는가" 는 돌려 봐야 안다. 그 둘은 같지 않을 수 있다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildDayMenu, recentFoods, fiberGoal, dayNotes, naUnknownNames, intakeTrend } from '../../src/engine/menu'
import { summarizeDay } from '../../src/engine/dayScore'
import { evaluateFood, activeRules, activeInteractions, evaluateSelection } from '../../src/engine/rules'
import { foodContribution, personalTarget, targetNotes, nutritionRisk, effectiveLossPct } from '../../src/engine/nutrition'
import { adviseSupplements, adviseForShortfall } from '../../src/engine/supplementAdvice'
import { summarizePeriod, reportNutrients } from '../../src/engine/dayScore'
import { sumIntake } from '../../src/engine/nutrition'
import { ideasFromIngredients } from '../../src/engine/menu'
import { isIngredientOnly, mealIsComplete, isAnchorDish, mealRole } from '../../src/data/foods'
import { CANCERS } from '../../src/data/cancers'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { MEDICATIONS } from '../../src/data/interactions'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS, SUBTYPE_OPTIONS } from '../../src/data/types'
import { portionLabel } from '../../src/lib/portion'
import type { Food, MealSlot, PatientCondition, PatientContext, SelectedItem, TreatmentHistory } from '../../src/data/types'

const PEOPLE = Number(process.env.PEOPLE ?? 2000)
const DAYS = Number(process.env.DAYS ?? 90)

/*
 * 난수.
 *
 * 예전에는 선형합동(LCG)을 썼다. 그 방식은 자리별로 주기가 짧아,
 * 확률이 낮은 갈래가 뜻대로 나오지 않는다 — 옮기기 검사에서 5% 로 잡은 갈래가
 * 실제로는 0.2% 만 일어난 적이 있다. 드문 조합을 찾자는 검사에서 그것은 치명적이다.
 * mulberry32 는 32비트 전체를 고르게 섞는다.
 */
let seed = 19700101
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const times = <T,>(n: number, f: () => T): T[] => Array.from({ length: n }, f)
const uniq = <T,>(a: T[]): T[] => [...new Set(a)]


/*
 * 상차림을 재는 잣대 — 검사 쪽에서 따로 적는다.
 *
 * 엔진의 판정 함수(mealIsComplete·isAnchorDish)를 그대로 부르면,
 * 그 판정을 푸는 순간 검사도 함께 풀려 아무것도 못 잡는다.
 * 같은 실수를 두 번 했으므로 여기서는 처음부터 따로 적는다.
 */
const COOKED = /찌개|국$|탕$|전골|나물|무침|볶음|조림|찜|구이|전$|튀김|김치|장아찌|쌈|절임|자반|강정|산적|불고기|수육|편육|숙회|회$|샐러드/
const PLAIN = /\((삶은 것|찐 것|생것|데친 것|구운 것|불린 것)\)$/
const DISH_GROUPS = ['국·탕·찌개', '반찬·조림·볶음', '육류', '가금류·난류', '어패류', '외식·프랜차이즈']
const BREAD = /^(식빵|통밀식빵|바게트|모닝빵|베이글|사워도우|토르티야\(밀\)|크루아상)$/
/*
 * 마시는 것인가.
 *
 * 이름 어디에든 '우유' 가 있으면 음료로 보았다. 그래서 '귀리 우유죽' 이 후식으로 잡혀,
 * 죽을 먼저 놓은 상이 모두 '후식이 앞에 끼어 있음' 이 되었다 — 36만 일 중 19 % 였다.
 * 앱의 잘못이 아니라 재는 자의 잘못이었다.
 *
 * compose 검사에서는 같은 것을 이미 고쳤는데 여기만 옛 식이 남아 있었다 —
 * 고친 자리 옆에 안 고친 자리가 남는 일이 여섯 번째다.
 * 괄호를 걷고, 그 낱말로 끝나는 것만 마시는 것으로 본다.
 */
const DRINK = /(두유|우유|요구르트|요거트|주스|스무디|라떼|차)$/

/** 밥 노릇을 하는가 */
function myStaple(f: Food): boolean {
  if (BREAD.test(f.name)) return true
  return (f.group === '곡류·전분' || f.group === '밥·면·죽 요리') && /밥$|밥\(|공기밥/.test(f.name)
}
/** 상을 세우는 반찬인가 */
function myAnchor(f: Food): boolean {
  const r = mealRole(f)
  if (r === 'soup') return true
  if (r === 'dessert' || r === 'supp' || r === 'onedish' || myStaple(f)) return false
  if (COOKED.test(f.name)) return true
  if (DISH_GROUPS.includes(f.group)) return true
  if (f.group === '두류·대두가공') return !PLAIN.test(f.name)
  return false
}
/** 후식인가 — 밥 노릇을 하는 빵은 뺀다 */
function myDessert(f: Food): boolean {
  if (myStaple(f)) return false
  if (DRINK.test(f.name.replace(/\(.*?\)/g, '').replace(/\s+/g, '').trim())) return true
  return ['과일', '간식·디저트', '우유·유제품', '음료', '견과·종실'].includes(f.group)
}
/**
 * 같은 재료를 두 번 놓았는가 — 검사 쪽 잣대.
 *
 * 엔진은 이름에서 조리법 꼬리말을 벗겨 견준다. 여기서 같은 방식을 쓰면
 * 그 벗기기가 잘못되었을 때 검사도 똑같이 잘못 본다 —
 * 실제로 '콩나물' 이 '콩' 으로 줄어드는 바람에 엔진의 겹침 검사가 통째로 빠져나갔는데,
 * 검사가 같은 식이었다면 그것을 놓쳤을 것이다.
 *
 * 그래서 아주 다른 방식으로 본다 — 괄호를 걷고 나서
 * 한쪽 이름이 다른 쪽 이름으로 시작하면 같은 재료로 친다.
 * '콩나물' 과 '콩나물무침', '두부' 와 '두부부침', '브로콜리' 와 '브로콜리 데침'.
 * 놓치는 짝이 있어도 좋다 — 틀리게 잡지만 않으면 된다.
 */
function bareName(f: Food): string {
  return f.name.replace(/\(.*?\)/g, '').replace(/\s+/g, '').trim()
}
function samePlant(a: Food, b: Food): boolean {
  const x = bareName(a), y = bareName(b)
  if (x.length < 2 || y.length < 2 || x === y) return x === y
  return x.startsWith(y) || y.startsWith(x)
}

const bugs: string[] = []
const seenB = new Set<string>()
/** 유형별 실제 발생 건수 — 유형 수만 세면 얼마나 흔한지 알 수 없다 */
const hits = new Map<string, number>()
const bad = (k: string, d: string) => {
  hits.set(k, (hits.get(k) ?? 0) + 1)
  const s = `${k} :: ${d}`
  if (!seenB.has(s)) { seenB.add(s); bugs.push(s) }
}

const CONDS: PatientCondition[] = [
  '연하곤란', '구강점막염', '설사', '변비', '오심·구토', '식욕부진', '체중감소', '체중증가',
  '호중구감소증', '위절제후', '장루보유', '복수', '간성뇌증위험', '신기능저하', '당뇨', '고혈압', '와파린복용'
]
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const
const HISTORY: TreatmentHistory[] = [
  '수술', '방사선치료', '항암화학요법', '항호르몬치료', '표적치료', '면역항암제', '조혈모세포이식'
]
const CUISINES = ['양식', '중식', '일식', '동남아'] as const

const RealDate = Date
const useDate = (d: Date) => {
  ;(globalThis as { Date: DateConstructor }).Date = class extends RealDate {
    constructor(...a: unknown[]) { if (a.length) super(...(a as [])); else super(d.getFullYear(), d.getMonth(), d.getDate()) }
    static now() { return d.getTime() }
  } as unknown as DateConstructor
}
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* 무엇이 얼마나 나왔는지 */
interface Stat {
  name: string; group: string; kcal: number; na: number; protein: number; fiber: number
  count: number; seasonal: number; withEvidence: number
  slots: Record<MealSlot, number>
  cancers: Map<string, number>
}
const stats = new Map<string, Stat>()
let totalItems = 0, totalDays = 0

const now0 = new RealDate().getTime()
const realNow = () => new RealDate().getTime()
for (let person = 0; person < PEOPLE; person++) {
  if (person % 200 === 0 && person > 0)
    process.stdout.write(`\r  ${person}/${PEOPLE}명 · ${totalDays.toLocaleString()}일 · ${Math.round((realNow() - now0) / 1000)}초   `)

  const h = 142 + Math.floor(rnd() * 52)
  const cancerId = pick(CANCERS).id
  const patient: PatientContext = {
    ...DEFAULT_PATIENT, onboarded: true,
    cancer: cancerId,
    phase: pick(PHASES) as PatientContext['phase'],
    weightKg: 34 + Math.floor(rnd() * 96),
    heightCm: h,
    age: 19 + Math.floor(rnd() * 76),
    sex: rnd() < 0.5 ? 'M' : 'F',
    weightLossPct: [0, 0, 0, 3, 7, 12, 18][Math.floor(rnd() * 7)],
    conditions: uniq(times(rnd() < 0.45 ? 1 : rnd() < 0.6 ? 2 : rnd() < 0.85 ? 0 : 3, () => pick(CONDS))),
    medications: uniq(times(rnd() < 0.3 ? 1 : rnd() < 0.5 ? 2 : 0, () => pick(MEDICATIONS).id)),
    /*
     * 식성.
     *
     * 예전에는 늘 한식이 들어 있었다. 그런데 한식을 빼고 고르실 수도 있고,
     * 여럿 고르실 수도 있다 — 그때 후보가 얼마나 남는지는 돌려 봐야 안다.
     */
    cuisines: (() => {
      const r = rnd()
      if (r < 0.55) return ['한식'] as PatientContext['cuisines']
      if (r < 0.8) return ['한식', pick(CUISINES)] as PatientContext['cuisines']
      if (r < 0.93) return uniq(['한식', pick(CUISINES), pick(CUISINES)]) as PatientContext['cuisines']
      return [pick(CUISINES)] as PatientContext['cuisines']
    })(),
    /*
     * 치료 이력.
     *
     * 여태 한 번도 넣지 않았다. 영양제 권고가 이력에 걸리는데도 그랬다 —
     * '위 전절제면 B12', '항호르몬치료면 칼슘·비타민 D' 같은 갈래가
     * 이 검사에서는 한 번도 밟히지 않았던 셈이다.
     */
    history: uniq(times(rnd() < 0.4 ? 1 : rnd() < 0.65 ? 2 : rnd() < 0.8 ? 3 : 0, () => pick(HISTORY))),
    /*
     * 세부 변수.
     *
     * 여태 한 번도 넣지 않았다. 그래서 HER2 양성이신 분도, 위를 모두 떼신 분도,
     * 간경변이 함께 있는 분도 이 검사에서는 존재하지 않았다 —
     * 그분들에게만 걸리는 규칙이 스무 가지 넘게 있는데도 그랬다.
     */
    subtypes: (() => {
      const opts = SUBTYPE_OPTIONS[cancerId] ?? []
      if (opts.length === 0 || rnd() < 0.35) return []
      return uniq(times(rnd() < 0.75 ? 1 : 2, () => pick(opts).id))
    })()
  }
  /* 영양제도 여러 가지를 함께 드실 수 있다 */
  const supps = times(rnd() < 0.3 ? 1 : rnd() < 0.5 ? 2 : rnd() < 0.58 ? 3 : 0, () => pick(SUPPLEMENTS))
    .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
  const diary: Record<string, SelectedItem[]> = {}
  /*
   * 보여 드린 상 — 적어 두지 않으시는 분의 회전은 이것으로만 걸린다.
   *
   * 여태 이 검사는 날마다 기록을 채워 넣으며 돌았다. 그래서 '한 번도 적지 않으시는 분'
   * 이라는, 실제로는 가장 흔한 경우가 표본에 아예 없었다.
   * 그 구멍 때문에 스무하루 내내 닭백숙이 올라가는 것을 못 보고 지나쳤다.
   */
  const shown: Record<string, string[]> = {}
  /** 열에 넷은 거의 적지 않으신다 */
  const logs = rnd() < 0.6
  const start = new RealDate(2026, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 25))

  for (let i = 0; i < DAYS; i++) {
    const d = new RealDate(start); d.setDate(d.getDate() + i)
    useDate(d)
    const key = fmt(d)

    const prevKey = fmt(new RealDate(d.getTime() - 86400000))
    const preFill = rnd() < Number(process.env.PREFILL ?? 0.25)

    // 지내는 동안 상태가 바뀐다
    if (rnd() < 0.03) patient.phase = pick(PHASES) as PatientContext['phase']
    if (rnd() < 0.05) patient.conditions = rnd() < 0.5 ? [pick(CONDS)] : []
    if (rnd() < 0.04) patient.weightKg = Math.max(32, Math.min(140, patient.weightKg + (rnd() < 0.5 ? -1 : 1)))

    let menu: ReturnType<typeof buildDayMenu>
    try {
      /*
       * 이미 담아 두신 것이 있는 날도 있다.
       *
       * 여태 늘 빈 손([])으로 불렀다. 그런데 실제로는 두어 가지 담아 두고
       * 나머지를 추천받으시는 일이 흔하다 — 그 길은 한 번도 밟히지 않았다.
       */
      const already: SelectedItem[] = preFill
        ? (diary[prevKey] ?? []).slice(0, 1 + Math.floor(rnd() * 3)).map((x) => ({ ...x }))
        : []
      menu = buildDayMenu(already, patient, {
        supplements: supps, day: key,
        recent: recentFoods(logs ? diary : {}, key, undefined, shown)
      })
    } catch (e) { bad('식단 구성 중 예외', `${patient.cancer}/${patient.phase} :: ${(e as Error)?.message}`); continue }
    totalDays++

    const prof = CANCERS.find((c) => c.id === patient.cancer)!
    const target = personalTarget(patient, prof.target.kcalPerKg, prof.target.proteinPerKg)
    const naLimit = prof.target.naLimit ?? 2000
    const ctx = `${patient.cancer}/${patient.phase}/${patient.sex}${patient.age}/${patient.weightKg}kg cond=[${patient.conditions}]`
    const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }

    /* ── 하루가 성립하는가 ── */
    const kcal = menu.totals.kcal ?? 0
    if (kcal < target.kcal[0] * 0.75) bad('식단이 무너짐', `${ctx} ${Math.round(kcal)}/${target.kcal[0]}`)
    if (kcal > target.kcal[1] * 1.25) bad('열량이 크게 초과', `${ctx} ${Math.round(kcal)}/${target.kcal[1]}`)
    if ((menu.totals.na ?? 0) > naLimit * 1.5) bad('나트륨이 감당 못 할 만큼 초과', `${ctx} ${Math.round(menu.totals.na ?? 0)}/${naLimit}`)
    for (const s of ['아침', '점심', '저녁'] as const)
      if (menu.meals[s].length === 0 && !menu.slotNotes[s]) bad('빈 끼니에 사유 없음', `${ctx} ${s}`)
    for (const [k, v] of Object.entries(menu.totals))
      if (!Number.isFinite(v as number) || (v as number) < -1e-9) bad('합계 이상값', `${ctx} ${k}=${v}`)

    /* ── 끼니가 상차림으로 읽히는가 ── */
    const grazing = patient.conditions.some((c) => ['식욕부진', '체중감소', '위절제후', '오심·구토'].includes(c))
    if (!grazing) {
      const kc = (s: MealSlot) => menu.meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
      if (kc('아침') > kc('저녁') * 1.1) bad('아침이 저녁보다 무거움', `${ctx} ${Math.round(kc('아침'))} > ${Math.round(kc('저녁'))}`)
    }

    /*
     * 하루가 어떻게 나뉘었는지 — 순서만이 아니라 크기도 본다.
     *
     * 여태 아침과 저녁의 '순서' 만 견주고 있었다. 그래서 아침 128 · 점심 104 ·
     * 저녁 390 · 간식 976 인 날이 아무 신고 없이 지나갔다. 순서는 맞았기 때문이다.
     * 간식이 하루의 61 % 를 지고 있었고 아침·점심은 식사라고 부를 수 없었다.
     * 경장영양·음료가 간식에만 갈 수 있어 거기로 몰린 탓이었다.
     *
     * 잦은 소량 식사를 하시는 분에게도 이 기준은 그대로다 —
     * 넷으로 고르게 나누자는 것이지 간식 하나에 몰자는 것이 아니다.
     */
    {
      const kc = (s: MealSlot) => menu.meals[s].reduce((n, e) => n + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
      const day = MEAL_SLOTS.reduce((n, s) => n + kc(s), 0)
      if (day > 400) {
        if ((kc('오전간식') + kc('오후간식')) > day * 0.35)
          bad('간식이 하루를 지고 있음', `${ctx} 간식 ${Math.round((kc('오전간식') + kc('오후간식')))} / 하루 ${Math.round(day)}`)
        for (const s of ['아침', '점심', '저녁'] as MealSlot[]) {
          if (kc(s) < day * 0.08)
            bad('한 끼가 식사라고 하기 어려움', `${ctx} ${s} ${Math.round(kc(s))} / 하루 ${Math.round(day)}`)
        }
      }

      /*
       * 단백질은 아래만 보고 있었다. 그래서 목표 62~78 g 인 분께 111 g 을 내놓고도
       * '적정' 이라고 적었다. 위험해서라기보다, 앱이 제 목표를 스스로 부정하면
       * 나머지 숫자도 믿기 어려워진다. 신장이 걸리는 분에게는 실제로 위험하다.
       */
      const prot = menu.totals.protein ?? 0
      const hi = menu.target.protein[1]
      if (patient.conditions.includes('신기능저하') && prot > hi * 1.3)
        bad('신기능이 떨어진 분께 단백질이 과함', `${ctx} ${Math.round(prot)} g / 목표 ${hi} g`)
      if (prot > hi * 1.25) {
        const told = menu.notes.some((n) => n.topic === '단백질' && /보다 많습니다/.test(n.text))
        if (!told) bad('단백질이 넘쳤는데 말하지 않음', `${ctx} ${Math.round(prot)} g / 목표 ${hi} g`)
      }
    }
    for (const s of MEAL_SLOTS) {
      const ids = menu.meals[s].map((e) => e.food.id)
      if (new Set(ids).size !== ids.length) bad('한 끼니에 같은 음식 중복', `${ctx} ${s}`)
      const byGroup = new Map<string, number>()
      for (const e of menu.meals[s]) byGroup.set(e.food.group, (byGroup.get(e.food.group) ?? 0) + 1)
      for (const [g, n] of byGroup)
        if (['과일', '우유·유제품', '음료', '간식·디저트'].includes(g) && n > 1)
          bad('한 끼니에 같은 종류가 둘', `${ctx} ${s} ${g} ${n}개`)
    }

    /* ── 추천이 이 환자에게 맞는가 · 그리고 무엇이 나왔는지 센다 ── */
    for (const s of MEAL_SLOTS) for (const e of menu.meals[s]) {
      /*
       * 앱이 권한 것만 따진다.
       *
       * 처음에는 상에 오른 것을 모두 보았다. 그런데 거기에는 직접 담으신 것도 섞여 있다 —
       * 장루가 있으신 분이 현미밥을 담으셨다고 해서 앱이 그것을 권한 것은 아니다.
       * 앱은 담으신 것을 지우지 않고 곁에서 일러 드린다. 그것이 옳다.
       * 36만 일을 돌려 나온 '주의 항목을 추천' 221건이 모두 이 경우였다.
       */
      const v = evaluateFood(e.food, patient, e.servings, cached)
      if (e.origin !== 'added') continue
      if (v.level === 'avoid') bad('피해야 할 것을 추천', `${ctx} ${e.food.name}`)
      /*
       * '주의' 라고 다 같은 '주의' 가 아니다.
       *
       * 이 자리는 지난번 정책을 바꿀 때 빠졌다 — engine·journey 검사는 고쳤는데
       * 여기만 옛 기준을 붙들고 있었다. 고친 자리 옆에 안 고친 자리가 남는 일이
       * 이번에만 세 번째다(내 식단 탭, 단계 번호, 그리고 여기).
       *
       * 등급이나 엔진의 표시를 그대로 믿지 않고, 임상 기준을 여기에 직접 적는다.
       */
      const naServe = (e.food.per100.na ?? 0) * e.food.serving.g * e.servings / 100
      if (naServe > 800) bad('아주 짠 것을 추천', `${ctx} ${e.food.name} ${Math.round(naServe)}mg`)
      for (const t of ['가공육', '초가공식품', '염장'] as const)
        if (e.food.tags.includes(t)) bad('올려서는 안 될 것을 추천', `${ctx} ${e.food.name} — ${t}`)
      const hard = v.hits.filter((x) => x.rule.level === 'caution' && !x.rule.advisory)
      if (hard.length > 0) {
        bad('주의 항목을 추천', `${ctx} ${e.food.name} — ${hard[0].rule.title}`)
        if (process.env.DBG_CAU) console.log('[주의]', e.origin, '|', e.food.name, '|', hard[0].rule.id, '|', `servings=${e.servings}`)
      }
      /* 엔진이 쓰는 것과 같은 함수로 본다 — 따로 적어 두면 고칠 때마다 어긋난다 */
      if (isIngredientOnly(e.food)) bad('재료를 메뉴로 추천', `${ctx} ${e.food.name}`)
      if (e.food.tags.some((t) => ['알코올', '가공육', '염장', '훈제', '튀김', '직화구이', '초가공식품'].includes(t as string)))
        bad('먼저 권하지 않기로 한 것을 추천', `${ctx} ${e.food.name}`)

      const c = foodContribution(e.food, e.servings)
      let st = stats.get(e.food.id)
      if (!st) {
        st = {
          name: e.food.name, group: e.food.group,
          kcal: Math.round(c.kcal ?? 0), na: Math.round(c.na ?? 0),
          protein: Math.round((c.protein ?? 0) * 10) / 10, fiber: Math.round((c.fiber ?? 0) * 10) / 10,
          count: 0, seasonal: 0, withEvidence: 0,
          slots: { 아침: 0, 오전간식: 0, 점심: 0, 오후간식: 0, 저녁: 0 }, cancers: new Map()
        }
        stats.set(e.food.id, st)
      }
      st.count++; totalItems++
      if (e.seasonal) st.seasonal++
      if (e.evidence) st.withEvidence++
      st.slots[s]++
      st.cancers.set(patient.cancer, (st.cancers.get(patient.cancer) ?? 0) + 1)
    }

    /*
     * 기록에는 '추천받은 대로 다 드신 것' 을 넣지 않는다.
     *
     * 예전에는 추천을 그대로 기록으로 되먹였다. 그러면 목표를 늘 맞추게 되어
     * 부족한 날이 한 번도 생기지 않고, 주간 보고와 거기서 나오는 보충 권고가
     * 아예 굴러가지 않는다 — 방어를 꺼 놓고 돌려도 아무 말이 없었다.
     *
     * 실제로는 추천대로 다 드시지 않는다. 끼니를 거르고, 반만 드시고,
     * 입맛이 없어 몇 가지만 드신다. 그 쪽이 보고가 다루어야 할 현실이다.
     */
    const eaten = MEAL_SLOTS.flatMap((s) => menu.meals[s].map((e) => ({ foodId: e.food.id, servings: e.servings, meal: s })))
    const mood = rnd()
    shown[key] = MEAL_SLOTS.flatMap((sl) => menu.meals[sl].map((e) => e.food.id))

    diary[key] =
      !logs ? []                                                      // 적지 않으시는 분
      : mood < 0.35 ? eaten                                             // 그대로 드신 날
      : mood < 0.7 ? eaten.filter(() => rnd() > 0.35)                 // 몇 가지 남기신 날
      : mood < 0.9 ? eaten.filter((x) => x.meal !== pick(MEAL_SLOTS)) // 한 끼 거르신 날
      : eaten.map((x) => ({ ...x, servings: x.servings * 0.5 }))      // 반만 드신 날

    /*
     * ── 밥상이 서는가 ──
     *
     * 밥 한 공기에 삶은 콩이나 옥수수만 곁들인 것은 상이 아니다.
     * 국이든 조리된 반찬이든 하나는 있어야 한다.
     * 이 검사가 없던 동안 끼니의 4분의 1이 그랬다.
     */
    for (const s of ['아침', '점심', '저녁'] as MealSlot[]) {
      const entries = menu.meals[s]
      const foods = entries.map((e) => e.food)
      if (foods.length === 0) continue

      /*
       * 상이 서는가 — 엔진의 판정을 빌리지 않고 여기서 따진다.
       *
       * 예전에는 mealIsComplete 를 그대로 불렀다. 그러면 그 판정을 풀 때
       * 검사도 함께 풀려 아무것도 못 잡는다(2026-08-26 에 실제로 겪었다).
       */
      const oneDish = foods.some((f) => mealRole(f) === 'onedish')
      if (!oneDish) {
        if (!foods.some(myStaple)) {
          bad('주식 없이 반찬만', `${ctx} ${s}: ${foods.map((f) => f.name).join('+')}`)
          if (process.env.DBG_ST && bugs.length < 400) console.log('[진단]', JSON.stringify({
            slot: s, day: key, cancer: patient.cancer, phase: patient.phase,
            cond: patient.conditions, meds: patient.medications, sub: patient.subtypes,
            cuis: patient.cuisines, kg: patient.weightKg, supps: supps.map((x) => x.id),
            logs,
            kcal: Math.round(menu.totals.kcal ?? 0), sup: Math.round(menu.suppTotals.kcal ?? 0),
            hi: target.kcal[1], items: foods.map((f) => f.name)
          }))
        }
        else if (!foods.some(myAnchor))
          bad('밥만 놓이고 반찬이 없음', `${ctx} ${s}: ${foods.map((f) => f.name).join('+')}`)
      }

      /* 곁들임만 여럿 늘어놓지 않았는가 */
      const garnish = entries.filter((e) => e.origin === 'added' &&
        !myAnchor(e.food) && !myStaple(e.food) && !myDessert(e.food) &&
        (mealRole(e.food) === 'side' || mealRole(e.food) === 'main')).map((e) => e.food)
      if (garnish.length > 1)
        bad('곁들임이 몰림', `${ctx} ${s}: ${garnish.map((f) => f.name).join('+')}`)

      /* 국은 한 그릇이면 족하다 */
      const soups = foods.filter((f) => mealRole(f) === 'soup')
      if (soups.length > 1)
        bad('한 끼니에 국이 둘', `${ctx} ${s}: ${soups.map((f) => f.name).join('+')}`)

      /* 주식이 둘이어도 곤란하다 */
      const staples = foods.filter((f) => myStaple(f) || mealRole(f) === 'onedish')
      if (staples.length > 1)
        bad('주식이 둘', `${ctx} ${s}: ${staples.map((f) => f.name).join('+')}`)

      /* 후식은 맨 뒤에 — 영양제는 차례에서 뺀다 */
      const plate = entries.filter((e) => mealRole(e.food) !== 'supp').map((e) => e.food)
      const lastReal = plate.map(myDessert).lastIndexOf(false)
      const firstSweet = plate.findIndex(myDessert)
      if (firstSweet >= 0 && lastReal >= 0 && firstSweet < lastReal)
        bad('후식이 주메뉴 앞에 끼어 있음', `${ctx} ${s}: ${plate.map((f) => f.name).join(' → ')}`)

      /* 같은 재료가 한 상에 둘 — '브로콜리(데친 것)' 과 '브로콜리 데침' */
      /* 둘 다 직접 담으신 것이면 앱의 잘못이 아니다 — 한쪽이라도 앱이 놓은 것일 때만 따진다 */
      const plain = entries.filter((e) => !myStaple(e.food) && mealRole(e.food) !== 'supp')
      for (let i = 0; i < plain.length; i++)
        for (let j = i + 1; j < plain.length; j++)
          if (samePlant(plain[i].food, plain[j].food) &&
              (plain[i].origin === 'added' || plain[j].origin === 'added'))
            bad('같은 재료가 한 상에 둘', `${ctx} ${s}: ${plain[i].food.name} + ${plain[j].food.name}`)

      /* 담는 양이 잘못 읽히지 않는가 — '밥 1공기' 의 절반이 '밥 1공기 반' 이면 안 된다 */
      for (const e of entries) {
        const lab = portionLabel(e.food.serving.label, e.servings)
        if (/\d\s*[가-힣]+\s*반$/.test(lab))
          bad('담는 양 표기가 더 많은 양으로 읽힘', `${ctx} ${e.food.name} ${e.servings} → '${lab}'`)
      }
    }

    /* ── 부속 계산도 함께 굴린다 ── */
    try {
      summarizeDay(diary[key], patient, supps)
      evaluateSelection(diary[key], patient)
      dayNotes(menu.totals, menu.suppTotals, patient, naUnknownNames(diary[key]))
      targetNotes(patient); nutritionRisk(patient); effectiveLossPct(patient)
      fiberGoal(patient, prof); adviseSupplements(patient); intakeTrend(diary, patient, key)
    } catch (e) { bad('부속 계산 중 예외', `${ctx} :: ${(e as Error)?.message}`) }
  }

  /*
   * ── 여러 날을 모아야 보이는 것 ──
   *
   * 주간·월간 보고와 거기서 나오는 보충 권고는 하루치로는 나오지 않는다.
   * 이 대규모 실행이 그것을 전혀 굴리지 않고 있었다 —
   * 석 달 치 기록을 만들어 놓고 하루씩만 보고 버린 셈이다.
   */
  /*
   * ctx 는 하루 루프 안에서 만들어지므로 여기서는 쓸 수 없다.
   * 처음에 그걸 그대로 썼더니 ReferenceError 로 검사가 통째로 죽었는데,
   * 평소에는 try/catch 에 삼켜져 조용히 넘어가고 무언가 어긋났을 때만 터졌다.
   * scripts/ 가 타입 검사를 안 받고 있어서 컴파일에서도 안 걸렸다.
   */
  const who = `${patient.cancer}/${patient.phase}/${patient.sex}${patient.age}/${patient.weightKg}kg cond=[${patient.conditions}]`
  const keys = Object.keys(diary).sort()
  for (const [unit, n] of [['주', 7], ['달', 30]] as const) {
    const span = keys.slice(-n)
    if (span.length < 2) continue
    try {
      summarizePeriod(span, (d) => summarizeDay(diary[d] ?? [], patient, supps), patient, unit)
      /*
       * intakeOf 는 '그날 드신 것의 영양소 합계' 를 내야 한다.
       * 처음에는 식품 목록을 그대로 넘겼는데, 그러면 함수가 조용히 빈 배열을 낸다 —
       * 120번 돌려도 항목이 0개라 새 검사가 한 번도 굴러가지 않았다.
       * 방어를 꺼 놓고 돌려도 아무 말이 없어서 그때 알았다.
       */
      const rows = reportNutrients(
        span,
        (d) => (diary[d]?.length ? sumIntake(diary[d], supps) : null),
        patient,
        unit
      )

      for (const r of rows) {
        if (!Number.isFinite(r.under) || !Number.isFinite(r.over) || !Number.isFinite(r.days)) {
          bad('보고 숫자가 이상함', `${who} ${unit} :: ${r.label} under=${r.under} over=${r.over}`)
        }
        if (r.under + r.over > r.days) {
          bad('모자란 날+넘친 날이 전체보다 많음', `${who} ${unit} :: ${r.label} ${r.under}+${r.over}>${r.days}`)
        }
        if (!r.label?.trim()) bad('보고 항목에 이름이 없음', `${who} ${unit}`)
      }

      /* 기록에서 드러난 부족을 채우는 권고 */
      const advice = adviseForShortfall(rows, patient)
      for (const a of advice) {
        if (!a.products?.length) bad('보충 권고에 보여 줄 제품이 없음', `${who} :: ${a.nutrient}`)
        if (!a.byFood?.trim()) bad('보충 권고에 식품으로 채우는 길이 없음', `${who} :: ${a.nutrient}`)
        if (!a.refIds?.length) bad('보충 권고에 근거가 없음', `${who} :: ${a.nutrient}`)

        /*
         * 지금 상태에서 늘리면 해로운 것을 권하지 않는가.
         * 이것이 이 기능의 핵심이고, 어긋나면 앱이 다른 화면에서 하는 말과 정면으로 부딪힌다.
         */
        const c = patient.conditions
        const sub = patient.subtypes ?? []
        if (a.nutrient === '식이섬유' && (c.includes('설사') || c.includes('장루보유')))
          bad('해로운 보충을 권함', `${who} :: 설사·장루에 식이섬유`)
        if (a.nutrient === '단백질' && (c.includes('신기능저하') || c.includes('간성뇌증위험')))
          bad('해로운 보충을 권함', `${who} :: 신기능·간성뇌증에 단백질`)
        /*
         * 골 보호가 필요한 ADT 중에는 칼슘을 채워야 한다.
         * ADT 는 약으로 적으실 수도 있고 세부 변수로 고르실 수도 있다 —
         * 처음에는 약만 보았고, 세부 변수를 넣어 돌리자 멀쩡한 권고가 '해롭다' 로 잡혔다.
         * 엔진(wanted)은 처음부터 둘 다 보고 있었다.
         */
        const onAdt = patient.medications.includes('adt') || sub.includes('안드로겐차단요법중')
        if (a.nutrient === '칼슘' && patient.cancer === 'prostate' && !onAdt)
          bad('해로운 보충을 권함', `${who} :: 전립선암(ADT 아님)에 칼슘`)
        /* 철도 마찬가지 — 증상으로 적으실 수도, 세부 변수로 고르실 수도 있다 */
        const gastrectomy = c.includes('위절제후') || sub.some((t) => t === '위전절제' || t === '위부분절제')
        if (a.nutrient === '철' && !gastrectomy)
          bad('해로운 보충을 권함', `${who} :: 위절제 없이 철분`)
      }
    } catch (e) { bad('보고 계산 중 예외', `${who} ${unit} :: ${(e as Error)?.message}`) }
  }

  /* ── 재료를 담았을 때 요리를 일러 주는가 ── */
  try {
    const some = (diary[keys[keys.length - 1]] ?? []).slice(0, 3)
    if (some.length) {
      const ideas = ideasFromIngredients(some, patient)
      for (const it of ideas) {
        if (!it.dishes?.length) bad('재료만 알려 주고 요리를 못 댐', `${who} :: ${it.source.name}`)
      }
    }
  } catch (e) { bad('재료→요리 중 예외', `${who} :: ${(e as Error)?.message}`) }
}
;(globalThis as { Date: DateConstructor }).Date = RealDate
process.stdout.write('\r' + ' '.repeat(70) + '\r')

const secs = Math.round((realNow() - now0) / 1000)
console.log(`  ${PEOPLE.toLocaleString()}명 × ${DAYS}일 = ${totalDays.toLocaleString()}일 · ${totalItems.toLocaleString()}건 추천 · ${secs}초`)
console.log(`  서로 다른 음식 ${stats.size}종이 쓰였다`)

/* ── 많이 나온 순서로 파일에 적는다 ── */
const ranked = [...stats.entries()].sort((a, b) => b[1].count - a[1].count)
const top = ranked.slice(0, 100)
const dayPct = (n: number) => ((n / totalDays) * 100).toFixed(1)

const lines: string[] = []
lines.push('# 하루차림 — 가장 자주 추천되는 식단 100')
lines.push('')
lines.push(`무작위로 만든 환자 ${PEOPLE.toLocaleString()}명이 ${DAYS}일씩 지내게 하고(${totalDays.toLocaleString()}일),`)
lines.push(`앱이 실제로 내놓은 ${totalItems.toLocaleString()}건을 세었습니다. 암종·치료 시기·증상·계절은 모두 무작위입니다.`)
lines.push('')
lines.push('앱이 "무슨 말을 하는가" 는 규칙을 읽으면 알 수 있지만, "무엇을 실제로 내놓는가" 는 돌려 봐야 압니다.')
lines.push('이 표는 그 둘이 같은지 확인하시라고 만들었습니다.')
lines.push('')
lines.push(`- 쓰인 음식 **${stats.size}종** · 상위 10종이 전체의 **${(top.slice(0, 10).reduce((n, [, s]) => n + s.count, 0) / totalItems * 100).toFixed(1)}%**`)
lines.push(`- 근거 규칙이 붙은 추천 **${(ranked.reduce((n, [, s]) => n + s.withEvidence, 0) / totalItems * 100).toFixed(1)}%**`)
lines.push('')
lines.push('| # | 음식 | 식품군 | 1회 제공량 | 나온 날 | 주로 오르는 끼니 | 근거 | 제철 |')
lines.push('|---:|---|---|---|---:|---|---:|---:|')
top.forEach(([, s], i) => {
  const slot = (Object.entries(s.slots) as [MealSlot, number][]).sort((a, b) => b[1] - a[1])[0]
  const slotPct = Math.round((slot[1] / s.count) * 100)
  lines.push(
    `| ${i + 1} | ${s.name} | ${s.group} | ${s.kcal} kcal · 단백 ${s.protein} g · Na ${s.na} mg |` +
    ` ${dayPct(s.count)}% | ${slot[0]} ${slotPct}% |` +
    ` ${Math.round((s.withEvidence / s.count) * 100)}% | ${s.seasonal ? `${Math.round((s.seasonal / s.count) * 100)}%` : '-'} |`
  )
})
lines.push('')
lines.push('## 읽는 법')
lines.push('')
lines.push('- **나온 날** — 그 음식이 추천에 오른 날의 비율입니다. 100 % 면 매일 나왔다는 뜻입니다.')
lines.push('- **근거** — 그 추천에 임상 규칙이 붙은 비율입니다. 낮으면 "특별히 권하거나 피할 이유는 없지만 모자란 부분을 채우려고" 넣은 것입니다.')
lines.push('- **제철** — 제철로 표시되어 오른 비율입니다. 계절 음식이 아니면 `-` 입니다.')
lines.push('')
lines.push('한 음식이 지나치게 자주 오르면 후보가 부족하다는 뜻입니다. 그 자리에 넣을 만한 음식을 늘리면 됩니다.')
lines.push('')
lines.push('## 식품군별 비중')
lines.push('')
const byGroup = new Map<string, number>()
for (const [, s] of ranked) byGroup.set(s.group, (byGroup.get(s.group) ?? 0) + s.count)
lines.push('| 식품군 | 비중 |')
lines.push('|---|---:|')
for (const [g, n] of [...byGroup].sort((a, b) => b[1] - a[1]))
  lines.push(`| ${g} | ${(n / totalItems * 100).toFixed(1)}% |`)
lines.push('')
lines.push('---')
lines.push('')
lines.push('`node_modules/.bin/jiti scripts/checks/bigrun.ts` 로 다시 만들 수 있습니다.')
lines.push('난수는 고정 씨앗이라 같은 결과가 나옵니다.')

const out = path.join(process.cwd(), 'docs', '추천-식단-top100.md')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, lines.join('\n'))
console.log(`  → docs/추천-식단-top100.md 에 적었습니다`)

console.log(`\n대규모 실행 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  const n = hits.get(k) ?? 0
  console.log(`■ ${k} — ${n.toLocaleString()}일 (${(n / totalDays * 100).toFixed(2)}%) · 서로 다른 상황 ${l.length}가지`)
  l.slice(0, 3).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
