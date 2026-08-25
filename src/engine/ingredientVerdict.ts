import type { EvidenceLevel, PatientContext, RuleLevel } from '../data/types'
import { findIngredients, findPrimaryIngredients, INGREDIENT_RULES, type IngredientRule } from '../data/ingredientRules'

/**
 * 시판 건강기능식품 판정.
 *
 * 제품은 4만 5천 종이지만 그 안에 든 기능성 원료는 수십 가지다.
 * 제품명과 표시된 기능성에서 원료를 찾아, 원료별로 정리해 둔 근거로 판단한다.
 * 이 환자의 암종·증상·복용약에 따라 같은 원료도 판단이 달라진다.
 */

export interface IngredientVerdict {
  ingredient: string
  /**
   * 이 제품이 '무엇을 위한' 것인지 — 제품 이름에 드러난 주성분인가.
   *
   * 함량이 공개 자료에 없으니 이름으로 가른다. '칼슘 마그네슘 비타민D' 는
   * 칼슘을 사는 것이고, '100억 유산균 아연&비타민D' 는 유산균을 사는 것이다.
   * 둘 다 비타민 D 를 기능성 원료로 신고했지만, 비타민 D 를 채우러
   * 유산균을 사시라고 할 수는 없다.
   */
  primary: boolean
  level: RuleLevel
  reason: string
  evidence: EvidenceLevel
  refIds: string[]
  /** 왜 이 판단이 나왔는지 (예: '전립선암', '와파린 복용 중') */
  because?: string
}

const RANK: Record<RuleLevel, number> = { avoid: 3, caution: 2, prefer: 1, info: 0 }

function judge(rule: IngredientRule, patient: PatientContext): IngredientVerdict {
  let level = rule.base
  let reason = rule.reason
  let because: string | undefined

  const apply = (next: { level: RuleLevel; reason: string }, why: string) => {
    if (RANK[next.level] >= RANK[level]) {
      level = next.level
      reason = next.reason
      because = why
    }
  }

  // 치료 중인지
  if (rule.duringTreatment && (patient.phase === 'during_rt' || patient.phase === 'during_chemo')) {
    apply(rule.duringTreatment, patient.phase === 'during_rt' ? '방사선치료 중' : '항암치료 중')
  }
  // 암종
  const byCancer = rule.byCancer?.[patient.cancer]
  if (byCancer) apply(byCancer, '이 암종')
  // 증상
  for (const c of patient.conditions) {
    const r = rule.byCondition?.[c]
    if (r) apply(r, c)
  }
  // 복용 약
  for (const m of patient.medications) {
    const r = rule.byMedication?.[m]
    if (r) apply(r, `${m} 복용 중`)
  }

  return { ingredient: rule.name, level, reason, evidence: rule.evidence, refIds: rule.refIds, because, primary: false }
}

export interface ProductVerdict {
  /** 가장 강한 판정 */
  level: RuleLevel | null
  /**
   * 주성분만 놓고 본 판정.
   *
   * "나에게 권장되는 것만" 을 고를 때 쓴다. 곁들여 든 것까지 세면
   * 유산균 한 통이 칼슘 권장 목록에 오른다.
   */
  primaryLevel: RuleLevel | null
  /** 원료별 판정 */
  items: IngredientVerdict[]
  /** 원료를 하나도 알아보지 못한 경우 */
  unknown: boolean
}

/** 제품명과 기능성 문구로 판정한다 */
export function judgeProduct(
  name: string,
  functionText: string,
  patient: PatientContext
): ProductVerdict {
  const rules = findIngredients(`${name} ${functionText}`)
  if (rules.length === 0) return { level: null, primaryLevel: null, items: [], unknown: true }

  /* 제품 이름에 드러난 것이 주성분이다 */
  const primary = new Set(findPrimaryIngredients(name, functionText).map((r) => r.name))
  const items = rules.map((r) => ({ ...judge(r, patient), primary: primary.has(r.name) }))
  const level = items.reduce<RuleLevel>(
    (acc, v) => (RANK[v.level] > RANK[acc] ? v.level : acc),
    'info'
  )
  // 같은 원료가 두 번 잡히면 강한 쪽만 남긴다
  const byName = new Map<string, IngredientVerdict>()
  for (const v of items) {
    const cur = byName.get(v.ingredient)
    if (!cur || RANK[v.level] > RANK[cur.level]) byName.set(v.ingredient, v)
  }
  const uniq = [...byName.values()].sort((a, b) => RANK[b.level] - RANK[a.level])

  const prim = uniq.filter((v) => v.primary)
  const primaryLevel = prim.length === 0
    ? null
    : prim.reduce<RuleLevel>((acc, v) => (RANK[v.level] > RANK[acc] ? v.level : acc), 'info')

  return { level, primaryLevel, items: uniq, unknown: false }
}

/* ────────────────── 원료를 먼저 보고 제품을 찾는다 ────────────────── */

/**
 * 어떤 판정에 해당하는 원료들의 검색어를 모은다.
 *
 * 제품이 4만 5천 종이라 하나씩 판정해 걸러 내려면 매번 전부를 훑어야 한다.
 * 그런데 판정을 가르는 것은 제품이 아니라 그 안에 든 원료이고, 원료는 서른 몇 가지뿐이다.
 * 그러니 원료를 먼저 판정하고, 그 원료가 든 제품을 찾는 편이 빠르기도 하고
 * 무엇보다 사용자에게 이유를 보여 줄 수 있다 —
 * "왜 이 제품이 나왔나" 가 아니라 "이 원료가 권장이라서" 라고 말할 수 있다.
 *
 * 제품명과 기능성 문구에서 이 낱말이 보이면 그 원료가 든 것으로 본다 —
 * findIngredients 가 쓰는 것과 같은 방식이라 결과가 어긋나지 않는다.
 */
export function ingredientKeywords(
  patient: PatientContext,
  levels: RuleLevel[]
): { keywords: string[]; names: string[] } {
  const want = new Set(levels)
  const hit = INGREDIENT_RULES.filter((r) => want.has(judge(r, patient).level))
  return {
    keywords: hit.flatMap((r) => r.match.map((m) => m.replace(/\s+/g, ''))),
    names: hit.map((r) => r.name)
  }
}
