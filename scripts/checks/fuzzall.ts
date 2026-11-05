/**
 * 모든 입력을 한꺼번에 변수로 두는 무작위 시험(2026-11-05, 출시 전).
 *
 * 다른 검사는 각자 몇 칸만 흔든다. 알레르기·투석·재영양·체중 추세는 safety·weight 에만 있었고
 * 대량 실행(bigrun)에는 없었다. '알레르기가 있고 투석 중이며 받아 온 시판 식품을 담은 분' 은
 * 어느 검사에도 없었다. 여기서는 환자 칸 전부 + 기록 + 검색어 + 바코드를 함께 흔든다.
 *
 * 입력은 앱이 쓰는 문(restoreState)으로 넣는다 — 범위 안 70 %, 경계값 20 %, 망가진 값 10 %.
 * 잣대는 엔진에서 빌리지 않고 여기 따로 적는다([[harucharim-testing]]).
 * 끝에 어떤 값·짝·규칙이 한 번도 안 밟혔는지 함께 적는다 — 안 밟힌 길은 검사하지 않은 길이다.
 *
 *   PEOPLE=5000 SEED=1 node_modules/.bin/jiti scripts/checks/fuzzall.ts
 *   SWEEP=1 node_modules/.bin/jiti scripts/checks/fuzzall.ts   # 시판 식품 273,080행 전부도 훑는다
 */
import fs from 'node:fs'
import { envSeed } from './_seed'
import { buildDayMenu, recentFoods, ideasFromIngredients, intakeTrend, naUnknownNames } from '../../src/engine/menu'
import { summarizeDay, summarizePeriod, reportNutrients } from '../../src/engine/dayScore'
import { activeRules, activeInteractions, evaluateFood, evaluateSelection, howToLines } from '../../src/engine/rules'
import { foodContribution, personalTarget, targetNotes, nutritionRisk, microTargets, refeedingStage } from '../../src/engine/nutrition'
import { adviseSupplements, reviewCurrentSupplements } from '../../src/engine/supplementAdvice'
import { buildPlan, shoppingList, shoppingText } from '../../src/engine/plan'
import { judgeProduct } from '../../src/engine/ingredientVerdict'
import { CANCERS, CANCER_BY_ID } from '../../src/data/cancers'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { MEDICATIONS } from '../../src/data/interactions'
import { ALLERGENS, allergensIn } from '../../src/data/allergens'
import { FOODS, FOOD_BY_ID } from '../../src/data/foods'
import { rowToFood, type PackedFoods } from '../../src/data/foods/generated'
import { MEAL_SLOTS, SUBTYPE_OPTIONS, DIALYSIS_CHOICES, LOW_INTAKE_CHOICES } from '../../src/data/types'
import type { Food, PatientContext, SelectedItem } from '../../src/data/types'
import { restoreState, cleanPatch } from '../../src/lib/store'
import { BODY_LIMITS, parseInRange } from '../../src/lib/bodyInput'
import { cleanExtFood } from '../../src/lib/extFoods'
import { portionLabel } from '../../src/lib/portion'
import { matchSupplements, squeeze, spellings, suppWords, toSuppIndexRow, type SuppRow } from '../../src/lib/suppSearch'
import { matchMedicines, MEDICINE_NOTICE } from '../../src/lib/medicines'
import { productSearchTerm, scanOutcome, squeezedName } from '../../src/lib/barcodeOutcome'

const PEOPLE = Number(process.env.PEOPLE ?? 1500)
const SWEEP = process.env.SWEEP === '1'

let seed = envSeed(20261105)
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const some = <T,>(a: readonly T[], p: number): T[] => a.filter(() => rnd() < p)
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo)

/* ── 걸린 것 — 낱건마다 짖지 않고 종류별로 세고 처음 몇 건만 적는다 ── */
const found = new Map<string, { n: number; first: string[] }>()
const seen = new Map<string, number>()
const hit = (what: string, detail: string) => {
  const r = found.get(what) ?? { n: 0, first: [] }
  r.n++
  if (r.first.length < 6) r.first.push(detail.slice(0, 260))
  found.set(what, r)
}
const cover = (k: string) => seen.set(k, (seen.get(k) ?? 0) + 1)

/* ── 자료 ── */
const read = (p: string) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'))
const ext = read('../../public/data/foods-extended.json') as PackedFoods
const suppDom = read('../../public/data/supplements-extended.json') as { items: SuppRow[] }
const suppImp = read('../../public/data/supplements-imported.json') as { items: SuppRow[] }
const suppAll: SuppRow[] = [...suppDom.items, ...suppImp.items]
const suppIndex = suppAll.map((r, i) => toSuppIndexRow(i, r))
const medRows = (read('../../public/data/medicines.json') as { items: [string, string][] }).items
const bars = read('../../public/data/barcodes.json') as { b: string; n: string; p: string; lk?: string; old?: number }[]

const CONDITIONS = ['연하곤란', '구강점막염', '설사', '변비', '오심·구토', '식욕부진', '체중감소', '체중증가', '호중구감소증',
  '위절제후', '장루보유', '복수', '간성뇌증위험', '신기능저하', '당뇨', '고혈압', '와파린복용'] as const
const HISTORY = ['수술', '방사선치료', '항암화학요법', '항호르몬치료', '표적치료', '면역항암제', '조혈모세포이식'] as const
const CUISINES = ['한식', '양식', '중식', '일식', '동남아', '무관'] as const
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const
const MED_IDS = MEDICATIONS.map((m) => m.id)
const NAMES = ['김영희', '', ' ', 'Kim', '<script>alert(1)</script>', "O'Brien", '😀', 'ㄱ'.repeat(200), '123', '%s', '\\n']
const JUNK: unknown[] = [null, undefined, '', 'abc', -1, 0, 1e9, NaN, Infinity, [], {}, true, '60', ' 72 ', '６０', '1e3', [1, 2], { a: 1 }]
const QUERIES = ['', ' ', 'ㄱ', '%', '_', "'", '"', '\\', '(', ')', '[', ']', '.*', '^$', '<b>', '😀', '비타민', '비타민 C', 'vitamin c',
  '칼슘 마그네슘', '  칼슘  ', '칼슘,,,마그네슘', 'zzzz', 'a', '1', 'ＡＢＣ', '오메가-3', 'OMEGA 3', '가'.repeat(500), '🍚🍚', 'null', 'undefined', '삐콤씨', '비 콤 씨']

/* ── 날짜 — 윤년·월말·연말이 섞이도록 시계를 옮긴다 ── */
const RealDate = Date
const setClock = (d: Date) => {
  ;(globalThis as { Date: DateConstructor }).Date = class extends RealDate {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [number])); else super(d.getTime())
    }
    static now() { return d.getTime() }
  } as DateConstructor
}
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const CLOCKS = [[2028, 1, 29], [2027, 11, 31], [2027, 0, 1], [2026, 10, 5], [2027, 2, 31], [2027, 5, 15], [2027, 8, 30]] as const

/* ── 입력 만들기 ── */
const bodyValue = (f: keyof typeof BODY_LIMITS, mode: number) => {
  const { min, max } = BODY_LIMITS[f]
  if (mode < 0.7) {
    const usual = f === 'age' ? between(30, 90) : f === 'weightKg' ? between(35, 100) : between(145, 190)
    return f === 'age' ? Math.round(usual) : Math.round(usual * 10) / 10
  }
  if (mode < 0.9) return pick([min, max, min + 0.5, max - 0.5, f === 'age' ? 64 : min + 1, f === 'age' ? 65 : max - 1].map((v) => (f === 'age' ? Math.round(v) : v)))
  return pick(JUNK)
}

function genPatient(cancer: string): Record<string, unknown> {
  const mode = rnd()
  const opts = SUBTYPE_OPTIONS[cancer as keyof typeof SUBTYPE_OPTIONS] ?? []
  const p: Record<string, unknown> = {
    name: pick(NAMES),
    cancer,
    phase: pick(PHASES),
    weightKg: bodyValue('weightKg', mode),
    heightCm: bodyValue('heightCm', mode),
    age: bodyValue('age', mode),
    sex: pick(['M', 'F'] as const),
    subtypes: some(opts.map((o) => o.id), rnd() < 0.5 ? 0 : 0.4),
    weightLossPct: pick([0, 0, 0, 2, 5, 5.01, 10, 10.01, 20, 40]),
    conditions: some(CONDITIONS, pick([0, 0.08, 0.2, 0.5])),
    medications: some(MED_IDS, pick([0, 0.05, 0.15, 0.4])),
    allergies: some(ALLERGENS, pick([0, 0.05, 0.2, 0.6])),
    history: some(HISTORY, pick([0, 0.2, 0.5])),
    cuisines: rnd() < 0.5 ? ['한식'] : some(CUISINES, 0.4),
    onboarded: true,
    useBarcode: rnd() < 0.8
  }
  if (rnd() < 0.3) p.observedLossPct = pick([0, 3, 5, 7.5, 12, 25])
  if (rnd() < 0.3) p.dialysis = pick(DIALYSIS_CHOICES)
  if (rnd() < 0.3) {
    p.lowIntake = pick(LOW_INTAKE_CHOICES)
    p.lowIntakeSince = pick(['2026-11-05', '2026-01-01', '2030-01-01', 'abc', '', '2026-13-45'])
  }
  /* 한 칸을 망가뜨린다 */
  if (mode >= 0.9) p[pick(Object.keys(p))] = pick(JUNK)
  return p
}

/** 흔한 음식과 시판 식품을 섞어 담는다 */
const extFoodAt = (i: number): Food => {
  const id = `kx-${i}`
  if (!FOOD_BY_ID[id]) FOOD_BY_ID[id] = rowToFood(ext.items[i], ext, id)
  return FOOD_BY_ID[id]
}
function genItem(): Record<string, unknown> {
  const r = rnd()
  const foodId = r < 0.5 ? pick(FOODS).id : r < 0.95 ? extFoodAt(Math.floor(rnd() * ext.items.length)).id : pick(['kx-999999999', 'kx-abc', '없는음식', ''])
  const servings = rnd() < 0.9 ? pick([0.5, 1, 1, 1, 1.5, 2, 3]) : pick(JUNK)
  return { foodId, servings, meal: rnd() < 0.9 ? pick(MEAL_SLOTS) : pick(['야식', '', null]) }
}

/* ── 잣대 — 깨진 값 ── */
const BROKEN = /\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]|-Infinity/
/* '이금기' 는 굴소스 회사, '앙금기정' 은 떡, '소금기름없이' 는 김 이름이다 */
const FORBIDDEN = /(?<![이앙소])금기|면역력|재발을 막는|치료 효과/
function walk(what: string, v: unknown, where: string, depth = 0): void {
  if (depth > 9 || v === null || v === undefined) return
  if (typeof v === 'number') { if (!Number.isFinite(v)) hit(`${what}: 숫자가 깨짐`, `${where} = ${v}`); return }
  if (typeof v === 'string') {
    if (BROKEN.test(v)) hit(`${what}: 글자가 깨짐`, `${v.slice(0, 160)} ← ${where}`)
    if (FORBIDDEN.test(v)) hit(`${what}: 쓰면 안 되는 말`, `${v.slice(0, 160)} ← ${where}`)
    return
  }
  if (Array.isArray(v)) { v.slice(0, 80).forEach((x, i) => walk(what, x, `${where}[${i}]`, depth + 1)); return }
  if (v instanceof Map || v instanceof Set) return
  if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v as object)) {
      /* 음식 자체의 값은 SWEEP 에서 본다 — 이름에 '치료 효과' 같은 말이 든 제품이 있을 수 있다 */
      if (k === 'food' || k === 'alternative' || k === 'per100' || k === 'rule' || k === 'interaction' || k === 'refIds') continue
      walk(what, x, `${where}.${k}`, depth + 1)
    }
  }
}

/* ── 잣대 — 안전(엔진과 다른 방식으로 이름만 본다) ── */
const ALLERGY_WORDS: Record<string, RegExp> = {
  알류: /계란|달걀|메추리알/, 우유: /우유|치즈|요거트|요구르트/, 메밀: /메밀/, 땅콩: /땅콩/, 대두: /두부|두유|된장|청국장/,
  밀: /밀가루|라면|우동|칼국수/, 고등어: /고등어/, 게: /꽃게|게장/, 새우: /새우/, 돼지고기: /돼지|삼겹|제육/,
  복숭아: /복숭아/, 토마토: /토마토/, 호두: /호두/, 닭고기: /닭|치킨/, 쇠고기: /소고기|쇠고기|한우/,
  오징어: /오징어/, 조개류: /조개|바지락|홍합|전복/, 잣: /^잣|잣죽/
}
/* 표본을 보고 옳다고 판단한 예외 — '밀가루 0%' 쌀국수, 두유로 만든 요거트 */
const allergyException = (a: string, n: string) => (a === '밀' && /밀가루\s*0/.test(n)) || (a === '우유' && /두유/.test(n))
const RAW_FOOD = /육회|생선회|회덮밥|사시미|초밥|생굴|날달걀|게장/
const HARD_TO_SWALLOW = /땅콩|아몬드|호두|누룽지|강정|오징어채|진미채/

function checkMenu(what: string, menu: ReturnType<typeof buildDayMenu>, p: PatientContext, ctx: string, dayOf: string) {
  walk(what, { notes: menu.notes, slotNotes: menu.slotNotes, totals: menu.totals, slotTotals: menu.slotTotals, target: menu.target, removed: menu.removed.map((r) => r.reason) }, ctx)
  const entries = MEAL_SLOTS.flatMap((s) => menu.meals[s])
  const neutropenic = p.phase === 'neutropenia' || p.conditions.includes('호중구감소증')
  let kcal = 0
  for (const e of entries) {
    kcal += foodContribution(e.food, e.servings).kcal ?? 0
    const n = e.food.name
    if (!(e.servings > 0) || e.servings > 50) hit(`${what}: 분량이 이상함`, `${ctx} ${n} ${e.servings}`)
    for (const a of p.allergies ?? []) {
      const re = ALLERGY_WORDS[a]
      /* 두유·콩 밀크, 쌀 우동 같은 예외는 표본을 보고 검사를 고친다 */
      if (re && re.test(n) && !allergyException(a, n)) hit(`${what}: 알레르기 음식이 ${e.origin === 'chosen' ? '담은 채' : '추천에'} 남음`, `${a} / ${n} / ${ctx}`)
    }
    if (e.origin === 'added') {
      if (neutropenic && RAW_FOOD.test(n)) hit(`${what}: 호중구감소에 날것 추천`, `${n} / ${ctx}`)
      if (p.conditions.includes('연하곤란') && HARD_TO_SWALLOW.test(n)) hit(`${what}: 삼킴곤란에 딱딱한 음식 추천`, `${n} / ${ctx}`)
      /* 자몽 — 타목시펜·레트로졸·항암 중에는 피하세요, ADT·아나스트로졸은 주의(전문의 결정) */
      if (/자몽/.test(n) && (p.phase === 'during_chemo' || p.medications.some((m) => m === 'tamoxifen' || m === 'ai-letrozole')))
        hit(`${what}: 자몽을 피해야 할 분께 추천`, `${n} / ${p.phase} / ${p.medications.join(',')}`)
      const lv = evaluateFood(e.food, p, e.servings).level
      if (lv === 'avoid') hit(`${what}: 피하세요 음식을 추천`, `${n} / ${ctx}`)
    }
  }
  const foodKcal = (menu.totals.kcal ?? 0) - (menu.suppTotals.kcal ?? 0)
  if (Math.abs(foodKcal - kcal) > 5) hit(`${what}: 항목 합과 합계가 다름`, `항목 ${Math.round(kcal)} / 합계 ${Math.round(foodKcal)} / ${ctx}`)
  for (const [lo, hi, name] of [[menu.target.kcal[0], menu.target.kcal[1], '열량'], [menu.target.protein[0], menu.target.protein[1], '단백질']] as const)
    if (!(lo > 0 && hi >= lo)) hit(`${what}: 목표 범위가 이상함`, `${name} ${lo}~${hi} / ${ctx}`)
  /* 재영양 첫 주는 일부러 5~10 kcal/kg 까지 낮춘다(NICE CG32) */
  if (!refeedingStage(p, dayOf) && !(menu.target.kcal[0] >= 300 && menu.target.kcal[1] <= 7000)) hit(`${what}: 열량 목표가 믿기 어려움`, `${menu.target.kcal} / ${ctx}`)
  if (!(menu.target.protein[1] <= 400)) hit(`${what}: 단백질 목표가 믿기 어려움`, `${menu.target.protein} / ${ctx}`)
  if (!(menu.target.fluid > 0 && menu.target.fluid < 8000)) hit(`${what}: 수분 목표가 믿기 어려움`, `${menu.target.fluid} / ${ctx}`)
}

/* ── 한 사람 ── */
function onePerson(idx: number) {
  const clock = pick(CLOCKS)
  const nowD = new RealDate(clock[0], clock[1], clock[2], 9)
  setClock(nowD)
  const today = keyOf(nowD)
  const cancer = pick(CANCERS).id
  const raw: Record<string, unknown> = { patient: genPatient(cancer), diary: {}, weights: {}, shown: {}, supplements: some(SUPPLEMENTS.map((s) => s.id), pick([0, 0.05, 0.2])), textSize: pick(['normal', 'large', 'xlarge', 'huge', null]) }
  const logDays = pick([0, 0, 1, 7, 30])
  for (let i = 0; i < logDays; i++) {
    const d = new RealDate(nowD); d.setDate(d.getDate() - Math.floor(rnd() * 60))
    ;(raw.diary as Record<string, unknown>)[keyOf(d)] = Array.from({ length: pick([0, 1, 3, 8]) }, genItem)
    if (rnd() < 0.6) (raw.weights as Record<string, unknown>)[keyOf(d)] = rnd() < 0.9 ? between(30, 110) : pick(JUNK)
  }
  const chosenRaw = Array.from({ length: pick([0, 0, 1, 3, 12]) }, genItem)
  ;(raw.diary as Record<string, unknown>)[today] = chosenRaw
  if (rnd() < 0.03) raw[pick(['diary', 'weights', 'shown', 'supplements'])] = pick(JUNK)

  const ctxBase = `#${idx} ${cancer}`
  let st
  try {
    st = restoreState(JSON.parse(JSON.stringify(raw)), today as never)
  } catch (e) { hit('저장 자료 읽기: 예외', `${ctxBase} ${(e as Error).message}`); return }

  const again = restoreState(JSON.parse(JSON.stringify(st)), today as never)
  if (JSON.stringify(again) !== JSON.stringify(st)) {
    const diff = (Object.keys(st) as (keyof typeof st)[]).filter((k) => JSON.stringify(st[k]) !== JSON.stringify(again[k]))
    const dayDiff = Object.keys(st.diary).concat(Object.keys(again.diary)).find((d) => JSON.stringify(st.diary[d as never]) !== JSON.stringify(again.diary[d as never]))
    if (dayDiff) hit('저장 자료 읽기: 기록이 달라짐(자세히)', `${dayDiff} ${JSON.stringify(st.diary[dayDiff as never])?.slice(0, 110)} → ${JSON.stringify(again.diary[dayDiff as never])?.slice(0, 110)} / 오늘 ${today}`)
    const pk = (Object.keys(st.patient) as (keyof typeof st.patient)[]).filter((k) => JSON.stringify(st.patient[k]) !== JSON.stringify(again.patient[k]))
    hit('저장 자료 읽기: 두 번 읽으면 달라짐', `${ctxBase} 칸 ${diff.join()} 환자 ${pk.map((k) => `${String(k)}: ${JSON.stringify(st.patient[k])}→${JSON.stringify(again.patient[k])}`).join()}`)
  }

  const p = st.patient
  cover(`암종:${p.cancer}`); cover(`시기:${p.phase}`); cover(`성별:${p.sex}`)
  cover(`암종×시기:${p.cancer}×${p.phase}`)
  for (const c of p.conditions) { cover(`증상:${c}`); cover(`암종×증상:${p.cancer}×${c}`); cover(`시기×증상:${p.phase}×${c}`) }
  for (const m of p.medications) { cover(`약:${m}`); cover(`시기×약:${p.phase}×${m}`) }
  for (const a of p.allergies ?? []) { cover(`알레르기:${a}`); cover(`암종×알레르기:${p.cancer}×${a}`) }
  for (const s of p.subtypes ?? []) cover(`세부:${p.cancer}×${s}`)
  for (const h of p.history ?? []) cover(`이력:${h}`)
  for (const c of p.cuisines ?? []) cover(`요리:${c}`)
  if (p.dialysis) cover(`투석:${p.dialysis}`)
  if (p.lowIntake) cover(`못드심:${p.lowIntake}`)

  /* 몸 수치는 앱의 범위 안이어야 한다 — 범위 밖은 읽는 문에서 걸러진다 */
  for (const f of ['weightKg', 'heightCm', 'age'] as const) {
    const v = p[f], L = BODY_LIMITS[f]
    if (!(typeof v === 'number' && v >= L.min && v <= L.max)) hit('저장 자료 읽기: 몸 수치가 범위 밖', `${f}=${String(v)} ${ctxBase}`)
  }

  const ctx = `${ctxBase}/${p.phase}/${p.sex}${p.age}/${p.weightKg}kg/${p.heightCm}cm 증상[${p.conditions.join(',')}] 약[${p.medications.join(',')}] 알[${(p.allergies ?? []).join(',')}] 투석:${p.dialysis ?? '-'} 못드심:${p.lowIntake ?? '-'}`
  const supps = SUPPLEMENTS.filter((s) => st.supplements.includes(s.id))
  const chosen = (st.diary[today as never] ?? []) as SelectedItem[]
  const guard = <T,>(what: string, f: () => T): T | undefined => {
    try { return f() } catch (e) { hit(`${what}: 예외`, `${ctx} :: ${(e as Error).message}`) }
    return undefined
  }

  const prof = CANCER_BY_ID[p.cancer]
  const target = guard('목표', () => personalTarget(p, prof.target.kcalPerKg, prof.target.proteinPerKg))
  if (target) walk('목표', target, ctx)
  walk('목표 설명', guard('목표 설명', () => targetNotes(p)), ctx)
  walk('영양 위험', guard('영양 위험', () => nutritionRisk(p)), ctx)
  walk('미량 목표', guard('미량 목표', () => microTargets(p)), ctx)
  walk('재영양', guard('재영양', () => refeedingStage(p, today)), ctx)

  const rules = guard('규칙', () => activeRules(p)) ?? []
  const inter = guard('상호작용', () => activeInteractions(p)) ?? []
  for (const h of rules) cover(`규칙:${h.rule.id ?? h.rule.title}`)
  for (const h of inter) cover(`상호작용:${h.medicationName}`)

  walk('영양제 권고', guard('영양제 권고', () => adviseSupplements(p).map((a) => ({ ...a, supplement: undefined }))), ctx)
  walk('드시는 영양제 검토', guard('드시는 영양제 검토', () => reviewCurrentSupplements(p, st.supplements)), ctx)

  const recent = guard('최근 음식', () => recentFoods(st.diary, today, undefined, st.shown))
  const opt = { day: today, nonce: pick([0, 0, 1, 2, 7]), supplements: supps, ...(recent ? { recent } : {}) }
  const menu = guard('식단', () => buildDayMenu(chosen, p, opt))
  if (menu) {
    checkMenu('식단', menu, p, ctx, today)
    const twice = guard('식단(같은 조건)', () => buildDayMenu(chosen, p, opt))
    const ids = (m: typeof menu) => MEAL_SLOTS.flatMap((s) => m.meals[s].map((e) => e.food.id)).join()
    if (twice && ids(twice) !== ids(menu)) hit('식단: 같은 조건에 다른 답', ctx)
    const tot = MEAL_SLOTS.flatMap((s) => menu.meals[s]).length
    if (tot === 0 && chosen.length === 0) hit('식단: 아무것도 없음', ctx)
    cover(menu.removed.length ? '갈래:뺀 음식 있음' : '갈래:뺀 음식 없음')
  }
  const days = pick([1, 2, 3, 5])
  const plan = guard('며칠치', () => buildPlan(p, { days, startDay: today, selected: chosen, diary: st.diary, shown: st.shown, supplements: supps, nonce: pick([0, 1]) }))
  if (plan) {
    if (plan.length !== days) hit('며칠치: 날 수가 다름', `${plan.length}/${days} ${ctx}`)
    plan.forEach((d, i) => { if (i > 0) checkMenu('며칠치', d.menu, p, ctx, d.day) })
    const list = guard('장보기', () => shoppingList(plan))
    if (list) {
      walk('장보기', list, ctx)
      walk('장보기 글', guard('장보기 글', () => shoppingText(plan, list, (d) => d)), ctx)
    }
  }
  walk('하루 요약', guard('하루 요약', () => summarizeDay(chosen, p, supps)), ctx)
  guard('담은 것 판정', () => evaluateSelection(chosen, p))
  walk('재료로 찾기', guard('재료로 찾기', () => ideasFromIngredients(chosen.slice(0, 4), p).map((x) => ({ ...x, food: undefined, ideas: undefined }))), ctx)
  guard('나트륨 빠진 음식', () => naUnknownNames(chosen))
  const trend = guard('섭취 추세', () => intakeTrend(st.diary, p, today))
  if (trend) walk('섭취 추세', trend, ctx)

  const dayKeys = Object.keys(st.diary).sort().slice(-14)
  const summarize = (d: string) => summarizeDay((st.diary[d as never] ?? []) as SelectedItem[], p, supps)
  walk('기간 요약', guard('기간 요약', () => summarizePeriod(dayKeys, summarize, p, pick(['주', '달'] as const))), ctx)
  walk('영양소 보고', guard('영양소 보고', () => reportNutrients(dayKeys, (d) => ({ kcal: summarize(d).kcal, protein: summarize(d).protein, na: summarize(d).na } as never), p, '주')), ctx)

  /* 아무 음식이나 열어 본다 */
  const cached = { rules, interactions: inter }
  for (let i = 0; i < 12; i++) {
    const f = rnd() < 0.3 ? pick(FOODS) : extFoodAt(Math.floor(rnd() * ext.items.length))
    const s = pick([0.5, 1, 2])
    const v = guard('음식 판정', () => evaluateFood(f, p, s, cached))
    if (!v) continue
    cover(`판정:${v.level ?? '없음'}`)
    if (v.level && !v.hits.length && !v.interactions.length) hit('음식 판정: 판정은 있는데 이유가 없음', `${f.name} ${v.level} ${ctx}`)
    walk('음식 판정', guard('how', () => howToLines(v)), ctx)
    for (const a of p.allergies ?? []) {
      const re = ALLERGY_WORDS[a]
      if (re?.test(f.name) && !allergyException(a, f.name) && v.level !== 'avoid') hit('음식 판정: 알레르기인데 피하세요가 아님', `${a} / ${f.name} / ${v.level}`)
    }
    /* 나트륨 판단은 1회 제공량으로 한다(전문의 결정). 쥐포 100 g 이 짜도 1회 30 g 이면 다른 이야기다 */
    if (typeof f.per100.na === 'number' && f.per100.na * f.serving.g / 100 >= 600 && v.level === 'prefer')
      hit('음식 판정: 1회 나트륨 600 mg 넘는 음식이 권장', `${f.name} ${Math.round(f.per100.na * f.serving.g / 100)} mg ${ctx}`)
  }

  /* 시판 영양제 */
  for (let i = 0; i < 6; i++) {
    const r = pick(suppAll)
    const v = guard('영양제 판정', () => judgeProduct(r[0], r[2], p))
    if (!v) continue
    cover(`영양제 판정:${v.level ?? '모름'}`)
    walk('영양제 판정', v.items.map((x) => ({ level: x.level, reason: x.reason, because: x.because })), `${r[0]} ${ctx}`)
    if (/가르시니아/.test(r[0]) && v.level !== 'avoid') hit('영양제 판정: 가르시니아가 피하세요가 아님', `${r[0]} ${v.level} ${ctx}`)
  }
}

/* ── 찾기·바코드 — 환자와 무관하게 큰 표본으로 ── */
function searchFuzz(n: number) {
  for (let i = 0; i < n; i++) {
    /* 1. 엉뚱한 말 */
    const q = rnd() < 0.5 ? pick(QUERIES) : String.fromCodePoint(...Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => pick([0x20, 0x41, 0x31, 0xac00 + Math.floor(rnd() * 11172), 0x3131, 0x1f600, 0x2d, 0x28, 0x5b])))
    try {
      const words = suppWords(q)
      if (words.some((w) => !w)) hit('찾기: 빈 낱말', JSON.stringify(q))
      if (Object.keys(words).length !== words.length) hit('찾기: 낱말 목록이 깨짐', JSON.stringify(q))
      if (words.length) {
        const m = matchSupplements(suppIndex, words, 30)
        if (m.ids.length > 30) hit('찾기: 개수 한도를 넘김', q)
        for (const id of m.ids) {
          const hay = suppIndex[id].hay
          const need = words.filter((w) => !m.dropped.includes(w))
          /* 판매 이름으로 이은 것은 낱말이 자료에 없어도 맞다 */
          if (!m.soldAs.has(id) && !need.every((w) => spellings(w).some((a) => hay.includes(a)))) hit('찾기: 낱말이 없는 제품이 나옴', `${q} → ${suppAll[id][0]}`)
        }
        if (m.dropped.length === 0 && m.ids.length === suppIndex.length) hit('찾기: 전 제품이 나옴', q)
      }
      const med = matchMedicines(medRows, q)
      if (med.items.length > 6) hit('의약품: 개수 한도를 넘김', q)
      if (!BROKEN.test(q)) for (const it of [productSearchTerm(q), squeezedName(q)]) if (BROKEN.test(it)) hit('바코드 이름: 글자가 깨짐', q)
    } catch (e) { hit('찾기: 예외', `${JSON.stringify(q)} ${(e as Error).message}`) }

    /* 2. 실제 제품 이름으로 치면 그 제품이 나와야 한다 */
    const idx = Math.floor(rnd() * suppAll.length)
    const name = suppAll[idx][0]
    if (squeeze(name).length >= 2) {
      const m = matchSupplements(suppIndex, suppWords(name), 100000)
      if (!m.ids.includes(idx)) hit('찾기: 제 이름으로 쳐도 안 나옴', name)
    }

    /* 3. 의약품 이름으로 치면 알린다 */
    const med = pick(medRows)
    const brand = med[0].split(/[([{]/)[0]
    if (squeeze(brand).length >= 3 && !matchMedicines(medRows, brand, 100000).items.some((x) => x.name === med[0]))
      hit('의약품: 제 이름으로 쳐도 안 나옴', med[0])
  }
  if (!MEDICINE_NOTICE.includes('담당 의사')) hit('의약품: 안내 문구', MEDICINE_NOTICE)

  /* 바코드 — 다음 네 갈래 판단은 표로 다 돈다 */
  for (const hasFood of [true, false]) for (const similar of [true, false]) for (const stale of [true, false]) for (const linkedByUser of [true, false]) {
    const o = scanOutcome({ hasFood, similar, stale, linkedByUser })
    if (o === 'detail' && !hasFood) hit('바코드: 값이 없는데 바로 표시', JSON.stringify({ hasFood, similar, stale, linkedByUser }))
    if (o === 'detail' && similar && !linkedByUser) hit('바코드: 비슷한 제품을 묻지 않고 표시', JSON.stringify({ hasFood, similar, stale, linkedByUser }))
    if (o === 'detail' && stale && !linkedByUser) hit('바코드: 끝난 등록을 묻지 않고 표시', JSON.stringify({ hasFood, similar, stale, linkedByUser }))
  }
  const codes = new Set<string>()
  for (const b of bars) {
    if (!/^\d{6,14}$/.test(b.b)) hit('바코드: 번호 모양이 이상함', b.b)
    if (codes.has(b.b)) hit('바코드: 같은 번호가 둘', b.b)
    codes.add(b.b)
    if (!b.p || BROKEN.test(b.p)) hit('바코드: 제품명이 비었거나 깨짐', b.b)
    if (b.lk && !['cell', 'maker', 'similar'].includes(b.lk)) hit('바코드: 모르는 잇기', b.lk)
  }

  /* 몸 수치 칸 — 친 글자가 범위 안의 숫자이거나 '없음' 이어야 한다 */
  for (let i = 0; i < n; i++) {
    const f = pick(['weightKg', 'heightCm', 'age'] as const)
    const text = pick(['60', '54.5', '', ' ', '-5', '0', '999', '1e3', 'abc', '６０', '60kg', ' 72 ', '.', '1,000', '٦٠', String(rnd() * 500), '00060', '+60', '60.', '.5'])
    const v = parseInRange(text, BODY_LIMITS[f], f === 'age')
    if (v !== null && v !== undefined && !(typeof v === 'number' && v >= BODY_LIMITS[f].min && v <= BODY_LIMITS[f].max))
      hit('몸 수치 칸: 범위 밖 값이 통과', `${f} ${JSON.stringify(text)} → ${v}`)
    const patch = cleanPatch({ [f]: pick(JUNK) } as Partial<PatientContext>)
    const pv = (patch as Record<string, unknown>)[f]
    if (pv !== undefined && !(typeof pv === 'number' && pv >= BODY_LIMITS[f].min && pv <= BODY_LIMITS[f].max)) hit('쓰는 문: 범위 밖 값이 저장', `${f} → ${String(pv)}`)
  }

  /* 담아 둔 시판 식품 사본이 망가졌을 때 */
  for (let i = 0; i < n; i++) {
    const good = extFoodAt(Math.floor(rnd() * ext.items.length))
    const broken: Record<string, unknown> = JSON.parse(JSON.stringify(good))
    broken[pick(Object.keys(broken))] = pick(JUNK)
    if (rnd() < 0.5) { const pr = broken.per100 as Record<string, unknown> | undefined; if (pr && typeof pr === 'object') pr[pick(['kcal', 'na', 'protein'])] = pick(JUNK) }
    try {
      const c = cleanExtFood(good.id, rnd() < 0.1 ? pick(JUNK) : broken)
      if (c) {
        const t = foodContribution(c, 1)
        walk('담아 둔 사본', t, good.id)
        if (!(c.serving.g > 0)) hit('담아 둔 사본: 1회량이 이상함', `${good.id} ${c.serving.g}`)
      }
    } catch (e) { hit('담아 둔 사본: 예외', (e as Error).message) }
  }
}

/* ── 시판 식품 전부 ── */
function sweep() {
  const P = (o: Partial<PatientContext>): PatientContext => ({ cancer: 'breast', phase: 'during_rt', weightKg: 60, heightCm: 160, age: 60, sex: 'F', conditions: [], medications: [], allergies: [], history: [], cuisines: ['한식'], onboarded: true, ...o })
  const ps = [P({}), P({ cancer: 'lung', phase: 'neutropenia', sex: 'M', conditions: ['연하곤란', '신기능저하', '고혈압'], medications: MED_IDS.slice(0, 4), allergies: [...ALLERGENS] })]
  const cs = ps.map((p) => ({ rules: activeRules(p), interactions: activeInteractions(p) }))
  const names = new Set<string>()
  ext.items.forEach((row, i) => {
    let f: Food
    try { f = rowToFood(row, ext, `kx-${i}`) } catch (e) { hit('시판 식품: 풀기 예외', `${i} ${(e as Error).message}`); return }
    if (!f.name) hit('시판 식품: 이름 없음', String(i))
    if (BROKEN.test(f.name)) hit('시판 식품: 이름이 깨짐', f.name)
    if (!(f.serving.g > 0)) hit('시판 식품: 1회량이 없음', f.name)
    if (f.serving.g > 3000) hit('시판 식품: 1회량이 3 kg 초과', `${f.name} ${f.serving.g}`)
    for (const [k, v] of Object.entries(f.per100)) {
      if (v === undefined || v === null) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) hit('시판 식품: 영양값이 이상함', `${f.name} ${k}=${String(v)}`)
    }
    if ((f.per100.kcal ?? 0) > 950) hit('시판 식품: 100 g 열량이 950 초과', `${f.name} ${f.per100.kcal}`)
    if ((f.per100.protein ?? 0) + (f.per100.fat ?? 0) + (f.per100.carb ?? 0) > 110) hit('시판 식품: 3대 영양소 합이 100 g 초과', `${f.name} ${f.per100.protein}/${f.per100.fat}/${f.per100.carb}`)
    if ((f.per100.na ?? 0) > 40000) hit('시판 식품: 나트륨이 소금보다 많음', `${f.name} ${f.per100.na}`)
    const label = portionLabel(f.serving.label, 0.5)
    if (BROKEN.test(String(label))) hit('시판 식품: 분량 글자가 깨짐', `${f.name} ${label}`)
    const t = foodContribution(f, 1)
    for (const [k, v] of Object.entries(t)) if (typeof v === 'number' && !Number.isFinite(v)) hit('시판 식품: 합계가 깨짐', `${f.name} ${k}`)
    if (i % 3 === 0) ps.forEach((p, j) => {
      try {
        const v = evaluateFood(f, p, 1, cs[j])
        if (v.level && !v.hits.length && !v.interactions.length) hit('시판 식품: 판정 이유 없음', `${f.name} ${v.level}`)
      } catch (e) { hit('시판 식품: 판정 예외', `${f.name} ${(e as Error).message}`) }
    })
    names.add(f.name)
  })
  console.log(`  시판 식품 전부 훑음 — ${ext.items.length.toLocaleString()}행 · 이름 ${names.size.toLocaleString()}가지`)
}

/* ── 못 박아 둔 사례 — 무작위로 찾은 것이 되돌아오지 않게 ── */
{
  const names: [string, string, boolean][] = [
    ['한우닭죽', '쇠고기', true], ['쇠고기육포 오리지널', '쇠고기', true], ['워커힐 오리지널 불고기 노엣지 피자', '쇠고기', true],
    ['오리불고기', '쇠고기', false], ['돼지갈비', '쇠고기', false], ['땅콩두부전병', '대두', true], ['땅콩', '대두', false],
    ['조이 그릭요거트 땅콩버터애플', '우유', true], ['땅콩버터 두유그릭요거트', '우유', false], ['땅콩버터', '우유', false]
  ]
  for (const [name, a, want] of names)
    if (allergensIn({ name }).includes(a as never) !== want) hit('알레르기 낱말', `${name} ${a} ${want ? '이어야 함' : '아니어야 함'}`)
  const bad = restoreState({ patient: { cancer: 'lung', phase: 'during_rt', weightKg: 40, heightCm: 170, age: 70, sex: 'M', conditions: [], medications: [], lowIntake: '15일 넘게', lowIntakeSince: '2026-13-45', onboarded: true } }, '2026-11-05' as never)
  if (bad.patient.lowIntakeSince !== undefined) hit('저장 자료 읽기: 없는 날짜가 통과', String(bad.patient.lowIntakeSince))
}

/* ── 실행 ── */
const t0 = RealDate.now()
for (let i = 0; i < PEOPLE; i++) {
  onePerson(i)
  if ((i + 1) % 500 === 0) process.stderr.write(`  ${i + 1}/${PEOPLE}명 ${Math.round((RealDate.now() - t0) / 1000)}초\n`)
}
;(globalThis as { Date: DateConstructor }).Date = RealDate
searchFuzz(Math.min(2000, Math.max(200, PEOPLE)))
if (SWEEP) sweep()

/* ── 덮은 범위 — 안 밟힌 값·짝을 적는다 ── */
const expected: string[] = []
for (const c of CANCERS) {
  expected.push(`암종:${c.id}`)
  for (const ph of PHASES) expected.push(`암종×시기:${c.id}×${ph}`)
  for (const s of CONDITIONS) expected.push(`암종×증상:${c.id}×${s}`)
  for (const a of ALLERGENS) expected.push(`암종×알레르기:${c.id}×${a}`)
  for (const o of SUBTYPE_OPTIONS[c.id] ?? []) expected.push(`세부:${c.id}×${o.id}`)
}
for (const ph of PHASES) {
  expected.push(`시기:${ph}`)
  for (const s of CONDITIONS) expected.push(`시기×증상:${ph}×${s}`)
  for (const m of MED_IDS) expected.push(`시기×약:${ph}×${m}`)
}
for (const m of MED_IDS) expected.push(`약:${m}`)
for (const h of HISTORY) expected.push(`이력:${h}`)
for (const c of CUISINES) expected.push(`요리:${c}`)
for (const d of DIALYSIS_CHOICES) expected.push(`투석:${d}`)
for (const l of LOW_INTAKE_CHOICES) expected.push(`못드심:${l}`)
expected.push('갈래:뺀 음식 있음', '갈래:뺀 음식 없음')
const missing = expected.filter((k) => !seen.has(k))

const firedRules = [...seen.keys()].filter((k) => k.startsWith('규칙:')).length
const line = (...keys: string[]) => keys.map((k) => `${k} ${(seen.get(k) ?? 0).toLocaleString()}`).join(' · ')
console.log(`\n모든 입력 무작위 시험 — ${PEOPLE.toLocaleString()}명 · 씨앗 ${process.env.SEED ?? '기본'} · ${Math.round((RealDate.now() - t0) / 1000)}초`)
console.log(`  덮은 값·짝 ${expected.length - missing.length}/${expected.length}${missing.length ? ` · 못 밟음: ${missing.slice(0, 12).join(', ')}` : ''}`)
console.log(`  발동한 규칙 ${firedRules}종 · ${line('판정:avoid', '판정:caution', '판정:prefer', '판정:info', '판정:없음')}`)
console.log(`  영양제 ${line('영양제 판정:avoid', '영양제 판정:caution', '영양제 판정:prefer', '영양제 판정:info', '영양제 판정:모름')}`)
console.log(`  ${line('갈래:뺀 음식 있음', '갈래:뺀 음식 없음')}`)

const kinds = [...found.entries()].sort((a, b) => b[1].n - a[1].n)
console.log(`\n걸린 종류 ${kinds.length}`)
for (const [k, r] of kinds) {
  console.log(`■ ${k} — ${r.n.toLocaleString()}건`)
  for (const f of r.first) console.log(`   - ${f}`)
}
if (!kinds.length) console.log('문제 없음')
process.exit(kinds.length ? 1 : 0)
