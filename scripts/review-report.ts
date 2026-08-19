/**
 * 검수용 판정 리포트 생성기.
 *
 * 암종 × 치료시기별로 모든 식품·영양제를 평가해, 어떤 규칙이 어떤 항목에 걸리는지
 * 표로 뽑는다. 임상적으로 어색한 판정을 눈으로 찾아내는 것이 목적이다.
 *
 *   npx tsx scripts/review-report.ts > review.json
 */
import { FOODS } from '../src/data/foods'
import { SUPPLEMENTS } from '../src/data/supplements'
import { CANCERS } from '../src/data/cancers'
import { evaluateFood, evaluateSupplement, activeRules, activeInteractions } from '../src/engine/rules'
import type { PatientContext, Phase, RuleLevel } from '../src/data/types'

const PHASES: Phase[] = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']

const base: Omit<PatientContext, 'cancer' | 'phase'> = {
  weightKg: 60, heightCm: 165, age: 60, sex: 'F',
  weightLossPct: 0, conditions: [], medications: []
}

interface Row {
  cancer: string
  phase: Phase
  kind: '식품' | '영양제'
  name: string
  group: string
  level: RuleLevel
  ruleId: string
  ruleTitle: string
  source: string
  evidence: string
}

const rows: Row[] = []
/** 규칙별로 몇 개 항목에 걸리는지 — 너무 넓게 걸리는 규칙을 찾기 위함 */
const ruleReach = new Map<string, { title: string; level: RuleLevel; count: number; cancers: Set<string> }>()

for (const c of CANCERS) {
  for (const phase of PHASES) {
    const patient: PatientContext = { ...base, cancer: c.id, phase }
    const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }

    for (const f of FOODS) {
      const v = evaluateFood(f, patient, 1, cached)
      for (const h of v.hits) {
        rows.push({
          cancer: c.name, phase, kind: '식품', name: f.name, group: f.group,
          level: h.rule.level, ruleId: h.rule.id, ruleTitle: h.rule.title,
          source: h.source === '증상' ? (h.sourceLabel ?? '증상') : h.source,
          evidence: h.rule.evidence
        })
        const cur = ruleReach.get(h.rule.id) ?? { title: h.rule.title, level: h.rule.level, count: 0, cancers: new Set<string>() }
        cur.count++
        cur.cancers.add(c.name)
        ruleReach.set(h.rule.id, cur)
      }
    }

    for (const s of SUPPLEMENTS) {
      const v = evaluateSupplement(s, patient, cached)
      for (const h of v.hits) {
        rows.push({
          cancer: c.name, phase, kind: '영양제', name: s.name, group: s.category,
          level: h.rule.level, ruleId: h.rule.id, ruleTitle: h.rule.title,
          source: h.source === '증상' ? (h.sourceLabel ?? '증상') : h.source,
          evidence: h.rule.evidence
        })
      }
    }
  }
}

/** 어떤 암종·시기에서도 규칙이 하나도 안 걸리는 식품 — 태그가 빠졌을 가능성 */
const everMatched = new Set(rows.filter((r) => r.kind === '식품').map((r) => r.name))
const orphanFoods = FOODS.filter((f) => !everMatched.has(f.name)).map((f) => ({
  name: f.name, group: f.group, tags: f.tags
}))

console.log(JSON.stringify({
  meta: {
    foods: FOODS.length,
    supplements: SUPPLEMENTS.length,
    cancers: CANCERS.length,
    phases: PHASES.length,
    totalHits: rows.length
  },
  rows,
  ruleReach: [...ruleReach.entries()]
    .map(([id, v]) => ({ id, title: v.title, level: v.level, hits: v.count, cancers: [...v.cancers].length }))
    .sort((a, b) => b.hits - a.hits),
  orphanFoods
}, null, 0))
