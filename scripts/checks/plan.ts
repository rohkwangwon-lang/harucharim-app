/**
 * 며칠치 식단·장보기 검사(2026-10-23).
 *
 *  1. 재료표 — 모든 id 가 음식 자료에 있고, 양은 0보다 크고, 재료 이름 분류가 '가공·기타' 로만 몰리지 않는다
 *  2. 엔진이 올리는 요리(역할 onedish·main·side·soup, 손검토 음식)에 재료표가 있다 — 없는 것은 목록으로 보고
 *  3. 5일 계획 — 날마다 '피하세요' 0, 날짜가 이어지고, 같은 요리가 연속 이틀 오르는 수가 날 경계마다 0.35 아래, 열량 미달 3 % 아래
 *  4. 장보기 — 항목이 있고, 작은술이 남지 않고, 양이 0이 아니고, 쓰임(uses)이 비지 않는다
 *  5. 재료 가짓수 — 연동 켬/끔을 함께 적는다(판정 없음)
 */
import { buildPlan, shoppingList, shoppingText, PLAN_MAX_DAYS } from '../../src/engine/plan'
import { RECIPES, parseRecipe, categoryOf, ingredientsOf, hasRecipe } from '../../src/data/foods/recipes'
import { FOOD_BY_ID, CURATED_FOODS, isIngredientOnly, mealRole } from '../../src/data/foods'
import { evaluateFood } from '../../src/engine/rules'
import { CANCERS } from '../../src/data/cancers'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS, type PatientContext } from '../../src/data/types'
import { addDays } from '../../src/lib/day'

const bad: string[] = []
const P = (o: Partial<PatientContext>): PatientContext => ({ ...DEFAULT_PATIENT, onboarded: true, cuisines: ['한식'], ...o } as PatientContext)

/* 1 */
let misc = 0, total = 0
for (const [id, text] of Object.entries(RECIPES)) {
  if (!FOOD_BY_ID[id]) bad.push(`재료표: 없는 음식 id '${id}'`)
  for (const ing of parseRecipe(text)) {
    total++
    if (!(ing.qty > 0)) bad.push(`재료표 ${id}: '${ing.name}' 양이 0`)
    if (categoryOf(ing.name) === '가공·기타') misc++
  }
}
if (misc / total > 0.12) bad.push(`재료표: 분류 못 한 재료가 ${(misc / total * 100).toFixed(0)} % — 분류 규칙을 보강할 것`)

/* 2 — 손검토 요리 가운데 재료표 없는 것(가공식품·외식·제품은 그 자체로 산다) */
const SKIP = /라면|사발면|컵라면|김밥|삼각김밥|편의점|피자|햄버거|감자튀김|치킨|돈까스|탕수육|돈코츠|쇼유|가츠동|군만두|떡|빵|베이글|크루아상|토르티야|사워도우|핫바|도시락|튀김|순대|족발|보쌈|회\(|초밥|스팸|소시지|베이컨|햄$|샌드위치|반미|라멘|짜장|짬뽕|부대|해장국|감자탕|유산슬/
/* 식재료(상추·토마토)·가공식품(참치통조림)은 그 자체로 산다 — 조리된 요리(form 'dish')만 센다 */
const noRecipe = CURATED_FOODS.filter((f) => f.form === 'dish' && !isIngredientOnly(f) && ['onedish', 'main', 'side', 'soup'].includes(mealRole(f)) && !hasRecipe(f) && !SKIP.test(f.name) && !f.auto)
if (noRecipe.length > 3) bad.push(`재료표 없는 손검토 요리 ${noRecipe.length}종: ${noRecipe.slice(0, 12).map((f) => f.name).join(', ')} …`)

/* 3·4·5 */
let seed = 20261023; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
const PH = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship'] as const
const CONDS = ['오심·구토', '식욕부진', '설사', '변비', '구강점막염', '연하곤란', '체중증가', '당뇨', '신기능저하', '위절제후'] as const
const N = Number(process.env.PEOPLE ?? 60)
let plans = 0, avoid = 0, repeats = 0, boundaries = 0, low = 0, days = 0, ingOn = 0, ingOff = 0
for (let i = 0; i < N; i++) {
  const c = pick(CANCERS)
  const p = P({ cancer: c.id, phase: pick([...PH]), sex: c.id === 'prostate' ? 'M' : c.id === 'gyn' || c.id === 'breast' ? 'F' : pick(['M', 'F'] as const),
    weightKg: Math.round(42 + rnd() * 45), heightCm: Math.round(150 + rnd() * 30), conditions: rnd() < 0.5 ? [] : [pick([...CONDS])], medications: [] })
  const start = `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 20)).padStart(2, '0')}`
  const nDays = 2 + (i % (PLAN_MAX_DAYS - 1))
  const plan = buildPlan(p, { startDay: start, days: nDays, nonce: i % 3 })
  plans++
  if (plan.length !== nDays) bad.push(`계획 길이 ${plan.length} ≠ ${nDays}`)
  for (let d = 0; d < plan.length; d++) {
    if (plan[d].day !== addDays(start, d)) bad.push(`날짜가 이어지지 않음: ${plan[d].day} (기대 ${addDays(start, d)})`)
    days++
    if ((plan[d].menu.totals.kcal ?? 0) < plan[d].menu.target.kcal[0]) low++
    /* 어제 끓여 둔 것을 이어 먹는 것은 일부러 같은 것이다 — 되풀이로 세지 않는다 */
    const ids = MEAL_SLOTS.flatMap((s) => plan[d].menu.meals[s]).filter((e) => !['dessert', 'staple', 'supp'].includes(mealRole(e.food)) && e.contribution !== '어제 끓인 것').map((e) => e.food.id)
    for (const s of MEAL_SLOTS) for (const e of plan[d].menu.meals[s]) if (evaluateFood(e.food, p, e.servings).level === 'avoid') avoid++
    if (d > 0) {
      boundaries++
      const prev = MEAL_SLOTS.flatMap((s) => plan[d - 1].menu.meals[s]).map((e) => e.food.id)
      repeats += ids.filter((id) => prev.includes(id)).length
    }
  }
  const list = shoppingList(plan)
  if (list.itemCount === 0) bad.push(`장보기 목록이 비어 있음 (${c.id})`)
  for (const g of list.groups) for (const it of g.items) {
    if (it.unit === '작은술') bad.push(`장보기: 작은술이 남음 '${it.name}'`)
    if (!(it.qty > 0)) bad.push(`장보기: 양 0 '${it.name}'`)
    if (it.uses.length === 0) bad.push(`장보기: 쓰임 없음 '${it.name}'`)
  }
  const txt = shoppingText(plan, list, (d) => d)
  if (!txt.includes('□') || txt.length < 50) bad.push('장보기 글이 비어 있음')
  const ingCount = (pl: typeof plan) => { const s = new Set<string>(); for (const d of pl) for (const sl of MEAL_SLOTS) for (const e of d.menu.meals[sl]) for (const ing of ingredientsOf(e.food)) if (!ing.self && ing.cat !== '양념·기본 재료') s.add(ing.name); return s.size }
  ingOn += ingCount(plan)
  ingOff += ingCount(buildPlan(p, { startDay: start, days: nDays, nonce: i % 3, linkIngredients: false }))
}
if (avoid) bad.push(`계획에 '피하세요' 음식 ${avoid}건`)
if (repeats / boundaries > 0.35) bad.push(`연속 이틀 같은 요리가 날 경계마다 ${(repeats / boundaries).toFixed(2)}개 — 0.35 넘음`)
if (low / days > 0.03) bad.push(`열량 미달 ${(low / days * 100).toFixed(1)} % — 3 % 넘음`)
/* 재료 연동의 효과는 1~2 % 안팎이라(2026-10-23 측정) 화면에 내세우지 않는다 — 여기서는 숫자만 보여 주고 판정하지 않는다 */

console.log(`며칠치 검사 완료 — 계획 ${plans}건·${days}일 · 피하세요 ${avoid} · 연속 되풀이 ${(repeats / boundaries).toFixed(2)}/경계 · 열량 미달 ${(low / days * 100).toFixed(1)} % · 재료 가짓수 연동 ${(ingOn / plans).toFixed(1)} vs 미연동 ${(ingOff / plans).toFixed(1)} · 재료표 ${Object.keys(RECIPES).length}종(없는 손검토 요리 ${noRecipe.length}) · 문제 ${bad.length}건`)
for (const b of bad.slice(0, 30)) console.log('   -', b)
if (bad.length) process.exitCode = 1
