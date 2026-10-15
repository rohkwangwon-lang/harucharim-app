import type {
  Food, NutritionRule, PatientContext, RuleLevel, RuleMatch,
  SelectedItem, Supplement, Interaction
} from '../data/types'
import { isDrink } from '../data/types'
import { FOOD_BY_ID, swallowSafe } from '../data/foods'
import { allergenHits, allergensFromIngredients } from '../data/allergens'
import { CANCER_BY_ID } from '../data/cancers'
import { COMMON_RULES } from '../data/commonRules'
import { CONDITION_RULES } from '../data/conditionRules'
import { INTERACTIONS, MEDICATIONS } from '../data/interactions'
import { effectiveLossPct, foodContribution } from './nutrition'

/** 규칙의 강도 — 여러 규칙이 같은 식품에 걸리면 강한 쪽을 대표로 쓴다 */
const LEVEL_RANK: Record<RuleLevel, number> = { avoid: 3, caution: 2, prefer: 1, info: 0 }

/** 이 태그가 붙은 음식은 권할 음식으로 내세우지 않는다 — evaluateFood 참조 */
const NO_PRAISE_TAGS = new Set<string>(['염장', '가공육', '훈제'])

export interface RuleHit {
  rule: NutritionRule
  /** 어디서 온 규칙인지 — 화면에 출처를 표시한다 */
  source: '공통' | '암종' | '증상' | '알레르기'
  /** 증상 규칙이면 어떤 증상인지 */
  sourceLabel?: string
}

export interface InteractionHit {
  interaction: Interaction
  /** 어떤 약제 때문에 걸렸는지 */
  medicationName: string
}

/** 한 식품에 대한 종합 평가 결과 */
export interface FoodVerdict {
  food: Food
  /** 가장 강한 수준 */
  level: RuleLevel | null
  hits: RuleHit[]
  interactions: InteractionHit[]
}

/* ────────────────────────── 매칭 ────────────────────────── */

function matchesFood(match: RuleMatch, food: Food, servings = 1): boolean {
  // restrictGroups 는 AND 조건 — 여기서 걸러지면 나머지는 볼 필요가 없다
  if (match.restrictGroups && !match.restrictGroups.includes(food.group)) return false
  // excludeTags 도 AND 조건. 하나라도 걸리면 이 규칙은 이 음식에 해당하지 않는다.
  if (match.excludeTags?.some((t) => food.tags.includes(t))) return false
  // minServing 도 AND 조건. 1회 분량에 그만큼 들어 있지 않으면 해당하지 않는다(모르면 통과).
  if (match.minServing) {
    /*
     * 한 성분만 곱해 본다. foodContribution 은 성분 스물아홉 개를 모두 계산해 새 객체를 만드는데,
     * 이 자리는 음식 하나를 볼 때마다 규칙 수만큼 불린다 — 그대로 불렀더니 29만 종 훑기가 여섯 배 느려졌다.
     */
    const { key, value, liquidPer100 } = match.minServing
    const per100 = food.per100[key]
    if (typeof per100 === 'number' && (per100 * food.serving.g) / 100 < value) {
      /* 마시는 것은 고시대로 100 mL 당으로도 본다 — 100 g 으로만 적힌 우유가 여기서 살아난다 */
      const drink = liquidPer100 !== undefined && food.serving.g >= 100 &&
        per100 >= liquidPer100 && isDrink(food)
      if (!drink) return false
    }
  }

  if (match.foodIds?.includes(food.id)) return true
  if (match.groups?.includes(food.group)) return true
  if (match.tags?.some((t) => food.tags.includes(t))) return true

  if (match.nutrient) {
    const { key, op, value, basis } = match.nutrient
    let v: number | undefined
    if (basis === 'per100') v = food.per100[key]
    else if (basis === 'serving') v = foodContribution(food, servings)[key]
    // basis === 'day' 는 개별 식품이 아니라 하루 합계에 대한 규칙이므로 여기서는 매칭하지 않는다
    if (typeof v === 'number') {
      if (op === '>' && v > value) return true
      if (op === '<' && v < value) return true
    }
  }
  return false
}

function matchesSupplement(match: RuleMatch, s: Supplement): boolean {
  if (match.supplementIds?.includes(s.id)) return true
  if (match.supplementCategories?.includes(s.category)) return true
  return false
}

/** 규칙이 현재 치료 시기에 적용되는지 */
function appliesToPhase(rule: NutritionRule, patient: PatientContext): boolean {
  if (!rule.phases || rule.phases.length === 0) return true
  if (rule.phases.includes('all')) return true
  /*
   * 증상에서 '호중구감소증' 을 고르신 분도 호중구가 낮은 분이다.
   *
   * 한동안 '호중구감소 시기' 규칙은 치료 시기로 고르신 분께만 켜졌다. 그래서 시기는 '항암치료 중' 으로 두고
   * 증상에서 호중구감소증을 고르신 분께는 회덮밥·육회비빔밥이 아무 말 없이 지나갔고 모듬회는 '권장' 으로 떴다
   * (증상 규칙은 손으로 붙인 '생식' 태그만 보았다). 같은 상태를 두 군데서 고를 수 있으면 두 길 모두 같은 답이 나와야 한다.
   */
  if (rule.phases.includes('neutropenia') && patient.conditions.includes('호중구감소증')) return true
  return rule.phases.includes(patient.phase)
}

/**
 * 세부 변수가 맞는지.
 *
 * 아직 고르지 않았으면(빈 목록) 통과시킨다 — 자세히 적어 주신 분에게만
 * 더 정확해지는 것이지, 안 적으면 아무 말도 안 해 주는 식이면 곤란하다.
 */
function appliesToSubtype(rule: NutritionRule, patient: PatientContext): boolean {
  if (!rule.subtypes || rule.subtypes.length === 0) return true
  const mine = patient.subtypes ?? []
  if (mine.length === 0) return true
  return rule.subtypes.some((t) => mine.includes(t))
}

/**
 * 항암제로 치는 약의 계열.
 *
 * 항호르몬제(타목시펜·아로마타제 억제제·ADT)는 넣지 않았다. 수년씩 드시는 약이라
 * 여기에 넣으면 그 기간 내내 '항암제를 쓰는 중' 이 된다. 넣을지는 임상 판단이다.
 * 항응고제·보조약제는 항암제가 아니다.
 */
const ANTICANCER_CLASSES = new Set(['경구 항암제', '표적치료제', '항암제'])
const MED_CLASS: Record<string, string> = Object.fromEntries(MEDICATIONS.map((m) => [m.id, m.cls]))

/**
 * 지금 항암제를 쓰고 계신가.
 *
 * 두 길 가운데 하나면 그렇다고 본다.
 *  · 치료 시기가 '항암치료 중' 이거나 '호중구감소증' — 약을 고르지 않으셨어도 항암제를 쓰는 시기다
 *  · 복용 약에 항암제 계열이 있다 — 시기를 무엇으로 고르셨든 (방사선과 함께 드시는 카페시타빈,
 *    치료를 마쳤다고 고르고 유지요법으로 드시는 표적치료제)
 */
export function onAnticancerDrug(patient: PatientContext): boolean {
  if (patient.phase === 'during_chemo' || patient.phase === 'neutropenia') return true
  return (patient.medications ?? []).some((id) => ANTICANCER_CLASSES.has(MED_CLASS[id]))
}

function applies(rule: NutritionRule, patient: PatientContext): boolean {
  if (rule.onAnticancer && !onAnticancerDrug(patient)) return false
  if (rule.unlessTaking?.some((m) => effectiveMedications(patient).includes(m))) return false
  return appliesToPhase(rule, patient) && appliesToSubtype(rule, patient)
}

/* ────────────────────────── 규칙 수집 ────────────────────────── */

/** 현재 환자 맥락에서 유효한 모든 규칙 */
export function activeRules(patient: PatientContext): RuleHit[] {
  const hits: RuleHit[] = []

  for (const r of COMMON_RULES) {
    if (applies(r, patient)) hits.push({ rule: r, source: '공통' })
  }

  const profile = CANCER_BY_ID[patient.cancer]
  for (const r of profile.rules) {
    if (applies(r, patient)) hits.push({ rule: r, source: '암종' })
  }

  for (const cond of patient.conditions) {
    for (const r of CONDITION_RULES[cond] ?? []) {
      if (applies(r, patient)) hits.push({ rule: r, source: '증상', sourceLabel: cond })
    }
  }

  /* 체중이 뚜렷이 줄고 있으면 증상을 덜려는 '피하세요' 를 '주의' 로 낮추고, 그 사유를 이유 글 끝에 남긴다 */
  if (effectiveLossPct(patient) >= LOSING_PCT) {
    return hits.map((h) => h.rule.softenWhenLosing && h.rule.level === 'avoid'
      ? { ...h, rule: { ...h.rule, level: 'caution' as const, reason: h.rule.reason + SOFTEN_NOTE } }
      : h)
  }
  return hits
}

/**
 * '뚜렷한 체중 감소' 의 문턱 — 최근(6개월 안) 5 % 넘게.
 * 앱의 악액질 안내(lung-cachexia, 국제 합의 기준)와 같은 잣대를 쓴다.
 */
const LOSING_PCT = 5
const SOFTEN_NOTE =
  ' [체중이 줄고 있어 낮춘 판정] 최근 체중이 5 % 넘게 줄어, 이 항목은 \'피하세요\' 대신 \'주의\' 로 낮췄습니다. ' +
  '지금은 드실 수 있는 것을 드셔서 열량과 단백질을 채우는 것이 먼저이기 때문입니다. ' +
  '드셔 보고 증상이 심해지면 그때 줄이시고, 증상이 계속되면 담당 의료진께 알려 주세요.'

/** 환자가 복용 중인 약제에 해당하는 상호작용만 추린다 */
/**
 * 판정에 쓰는 약 목록 — 증상 칸의 '와파린복용' 은 약 '와파린' 과 같은 뜻으로 읽는다(2026-10-15 안전 검토).
 * 저장소(linkWarfarin)가 둘을 맞춰 두지만, 엔진을 직접 부르는 자리(검사·예전 기록)에서도 같은 답이 나오게 한다.
 */
export function effectiveMedications(patient: PatientContext): PatientContext['medications'] {
  return patient.conditions.includes('와파린복용') && !patient.medications.includes('warfarin')
    ? [...patient.medications, 'warfarin']
    : patient.medications
}

export function activeInteractions(patient: PatientContext): InteractionHit[] {
  const meds = effectiveMedications(patient)
  const also = (i: (typeof INTERACTIONS)[number]) => {
    if (!i.alsoTaking) return true
    const want = i.alsoTaking.medications ?? [], conds = i.alsoTaking.conditions ?? []
    return want.some((m) => meds.includes(m)) || conds.some((c) => patient.conditions.includes(c))
  }
  /* 더 자세한 약을 고르셨으면, 윗칸에 붙여 둔 "어느 약인지에 따라 다릅니다" 는 내지 않는다 */
  const unless = (i: (typeof INTERACTIONS)[number]) =>
    !i.unlessTaking || !i.unlessTaking.some((m) => meds.includes(m))
  return INTERACTIONS.filter((i) => meds.includes(i.agent) && also(i) && unless(i)).map((i) => ({
    interaction: i,
    medicationName: i.agent
  }))
}

/* ────────────────────────── 평가 ────────────────────────── */

function strongestLevel(levels: RuleLevel[]): RuleLevel | null {
  if (levels.length === 0) return null
  return levels.reduce((a, b) => (LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a))
}

/** 식품 1건을 환자 맥락에서 평가한다 */
/**
 * 이분에게는 '권장' 을 붙이지 않을 음식(2026-10-15 안전 검토).
 *
 *  · 삼키기 어려우신 분께 질감이 맞지 않는 음식(data/foods 의 swallowSafe). 단백질·열량 규칙이 김·상추·스테이크·땅콩조림에까지
 *    '권장' 을 붙이고 있었다. 권장은 "이대로 드셔도 된다" 로 읽힌다 — 질감이 맞는지 모르는 음식에는 붙이지 않는다.
 *  · 호중구가 낮은 분께 동물성 '생것' 재료. 표준성분표의 '연어,육,생것'·'달걀 생것' 이 단백질 규칙으로 '권장' 이었다.
 *    익혀 먹을 재료라 피하라고 하지는 않는다(쇠고기 생것까지 피하게 된다) — 날로 내세우지 않을 뿐이다.
 *    실제로 날로 먹는 것(굴·성게·연어알·생간·천엽)은 autoTag 가 '생식동물성' 을 붙여 '피하세요' 로 간다.
 */
const ANIMAL = new Set<string>(['어패류', '육류', '가금류·난류'])
function allergyRule(list: string[], fromIngredients: string[] = []): NutritionRule {
  const what = list.join('·')
  const ing = fromIngredients.filter((a) => list.includes(a))
  return {
    id: `allergy-${list.join('-')}`,
    level: 'avoid',
    match: {},
    title: `알레르기 — ${what}이(가) 들어 있을 수 있습니다`,
    howTo: '드시지 마세요. 가공식품은 포장의 알레르기 표시를 꼭 확인하세요',
    reason:
      (ing.length
        ? `내 정보에서 ${what} 알레르기를 고르셨고, 이 제품의 원재료(식약처 품목제조보고)에 ${ing.join('·')}이(가) 들어 있습니다. `
        : `내 정보에서 ${what} 알레르기를 고르셨습니다. `) +
      '하루차림은 음식 이름과, 가공식품은 원재료 신고 내용으로 알레르기 유발물질을 찾습니다 — ' +
      '흔히 들어가는 것(빵의 달걀·우유, 간장의 밀·대두, 해물 요리의 새우·오징어·조개)은 넓게 잡지만, ' +
      '이름에 드러나지 않는 재료는 놓칠 수 있습니다. 포장된 식품은 포장의 알레르기 표시란을, 외식은 직원에게 꼭 확인하세요.',
    evidence: 'G',
    refIds: []
  }
}
function praiseBlockedFor(food: Food, patient: PatientContext): boolean {
  if (patient.conditions.includes('연하곤란') && !swallowSafe(food)) return true
  const neutropenic = patient.phase === 'neutropenia' || patient.conditions.includes('호중구감소증')
  if (neutropenic && ANIMAL.has(food.group) && /생것/.test(food.name)) return true
  return false
}

export function evaluateFood(
  food: Food,
  patient: PatientContext,
  servings = 1,
  cached?: { rules: RuleHit[]; interactions: InteractionHit[] }
): FoodVerdict {
  const rules = cached?.rules ?? activeRules(patient)
  const inter = cached?.interactions ?? activeInteractions(patient)

  /*
   * 염장·가공육·훈제 음식에는 '권장' 을 붙이지 않는다.
   *
   * 공통 단백질 규칙은 이 셋을 제외한다고 적어 두었고, 공통 채소 규칙도 염장을 뺀다.
   * 그런데 그 제외가 그 두 규칙에만 있었다. 암종별 권장 규칙 22개에는 없어서
   * 굴비(자반)가 폐암·췌장암에서 "체중을 지키는 것이 가장 중요한 영양 목표" 로,
   * 런천미트가 간암에서 "자기 전 간단한 야식이 근육 손실을 줄입니다" 로,
   * 배추김치가 유방암에서 "채소 중심 식사" 로 **권장**이 되었다(2026-10, 상식 검사가 찾음).
   *
   * 규칙마다 제외를 달면 다음 규칙에서 또 빠진다. 그래서 판정하는 이 한 자리에서 막는다.
   * 드시지 말라는 뜻이 아니다 — 권할 음식으로 내세우지 않을 뿐이고, 주의·피하세요는 그대로 간다.
   */
  const noPraise = food.tags.some((t) => NO_PRAISE_TAGS.has(t)) || praiseBlockedFor(food, patient)
  const all = rules.filter((h) =>
    !(noPraise && h.rule.level === 'prefer') && matchesFood(h.rule.match, food, servings))
  const interactions = inter.filter((h) =>
    !(noPraise && h.interaction.level === 'prefer') && matchesFood(h.interaction.match, food, servings))

  /*
   * 알레르기 — 근거 등급을 다는 임상 권고가 아니라 이분이 알려 주신 사실이다. 그래서 규칙 목록에 두지 않고 여기서 붙인다.
   * 이름으로 찾으므로 놓칠 수 있다 — 이유 글에 그 한계를 함께 적는다.
   */
  const allergy = allergenHits(food, patient.allergies)
  if (allergy.length) all.push({ rule: allergyRule(allergy, allergensFromIngredients(food)), source: '알레르기', sourceLabel: allergy.join('·') })

  const level = strongestLevel([
    ...all.map((h) => h.rule.level),
    ...interactions.map((h) => h.interaction.level)
  ])

  /*
   * 피해야 할 음식이면 권장 사유는 보여 주지 않는다.
   *
   * 두 규칙이 동시에 맞는 일이 실제로 있다. 폐암 방사선치료 중 견과는
   * 거친 질감이라 피해야 하지만, 악액질에는 열량이 높아 도움이 된다.
   * 둘 다 맞는 말이라 규칙을 고칠 것은 아니다.
   * 다만 화면에 "견과를 드세요" 와 "견과를 피하세요" 가 나란히 붙으면
   * 무엇을 믿어야 할지 알 수 없다. 결론이 '피하세요' 라면 그 이유만 보여 준다.
   */
  const shown = level === 'avoid' ? all.filter((h) => h.rule.level !== 'prefer') : all

  /* 같은 말을 두 번 하지 않는다 — 다른 규칙이 '내가 대신 말한다' 고 한 것은 뺀다 (types.ts 의 supersedes) */
  const covered = new Set(shown.flatMap((h) => h.rule.supersedes ?? []))
  const hits = covered.size ? shown.filter((h) => !covered.has(h.rule.id)) : shown

  return { food, level, hits, interactions }
}

/**
 * 이 음식 옆에 바로 보여 줄 "어떻게 드시면 되는가" — 걸린 규칙이 적어 둔 한 줄들.
 *
 * 이유 글은 눌러야 펴진다. "씻어서 드세요", "데워서 드세요" 는 그 음식을 보는 자리에서 바로 보여야 한다.
 * 화면 세 군데(추천 식단·내 식단·음식 상세)가 이 함수 하나를 쓴다 — 한 군데만 빠지는 일이 없게.
 * '피하세요' 인 음식에는 피하라는 규칙의 안내만 남긴다("씻어서 드세요" 와 "피하세요" 가 나란히 붙지 않게).
 */
export function howToLines(verdict: FoodVerdict): string[] {
  const from = [
    ...verdict.hits.map((h) => ({ level: h.rule.level, text: h.rule.howTo })),
    ...verdict.interactions.map((h) => ({ level: h.interaction.level, text: h.interaction.howTo }))
  ].filter((x): x is { level: RuleLevel; text: string } => !!x.text)
  const kept = verdict.level === 'avoid' ? from.filter((x) => x.level === 'avoid') : from
  return [...new Set(kept.map((x) => x.text))]
}

export interface SupplementVerdict {
  supplement: Supplement
  level: RuleLevel | null
  hits: RuleHit[]
  interactions: InteractionHit[]
}

export function evaluateSupplement(
  s: Supplement,
  patient: PatientContext,
  cached?: { rules: RuleHit[]; interactions: InteractionHit[] }
): SupplementVerdict {
  const rules = cached?.rules ?? activeRules(patient)
  const inter = cached?.interactions ?? activeInteractions(patient)

  const hits = rules.filter((h) => matchesSupplement(h.rule.match, s))
  /* 알레르기 — 등록된 영양제도 이름으로 본다(2026-10-15 알레르기 2단계) */
  const allergy = allergenHits(s, patient.allergies)
  if (allergy.length) hits.push({ rule: allergyRule(allergy), source: '알레르기', sourceLabel: allergy.join('·') })
  const interactions = inter.filter((h) => matchesSupplement(h.interaction.match, s))

  const level = strongestLevel([
    ...hits.map((h) => h.rule.level),
    ...interactions.map((h) => h.interaction.level)
  ])

  return { supplement: s, level, hits, interactions }
}

/** 선택한 식품 전체에 대한 평가 — 중복 경고는 규칙 단위로 합친다 */
export function evaluateSelection(items: SelectedItem[], patient: PatientContext) {
  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  const verdicts = items
    .map((i) => {
      const food = FOOD_BY_ID[i.foodId]
      return food ? evaluateFood(food, patient, i.servings, cached) : null
    })
    .filter((v): v is FoodVerdict => v !== null)

  /** 규칙 id → 그 규칙에 걸린 식품들 */
  const byRule = new Map<string, { hit: RuleHit; foods: Food[] }>()
  for (const v of verdicts) {
    for (const h of v.hits) {
      const cur = byRule.get(h.rule.id)
      if (cur) cur.foods.push(v.food)
      else byRule.set(h.rule.id, { hit: h, foods: [v.food] })
    }
  }

  const byInteraction = new Map<string, { hit: InteractionHit; foods: Food[] }>()
  for (const v of verdicts) {
    for (const h of v.interactions) {
      const cur = byInteraction.get(h.interaction.id)
      if (cur) cur.foods.push(v.food)
      else byInteraction.set(h.interaction.id, { hit: h, foods: [v.food] })
    }
  }

  const grouped = [...byRule.values()].sort(
    (a, b) => LEVEL_RANK[b.hit.rule.level] - LEVEL_RANK[a.hit.rule.level]
  )

  return { verdicts, grouped, interactions: [...byInteraction.values()] }
}
