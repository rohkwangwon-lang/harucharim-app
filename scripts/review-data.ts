/**
 * 검수 문서용 압축 데이터 생성기.
 * (암종, 시기, 규칙) 별로 어떤 식품·영양제가 걸리는지 묶어서 내보낸다.
 * 식품 이름은 사전에 한 번만 두고 본문에서는 인덱스로 참조해 용량을 줄인다.
 *
 *   npx tsx scripts/review-data.ts > review-data.json
 */
import { FOODS } from '../src/data/foods'
import { SUPPLEMENTS } from '../src/data/supplements'
import { CANCERS } from '../src/data/cancers'
import { activeInteractions, activeRules, evaluateFood, evaluateSupplement } from '../src/engine/rules'
import type { PatientContext, Phase } from '../src/data/types'

const PHASES: { id: Phase; label: string }[] = [
  { id: 'during_rt', label: '방사선치료 중' },
  { id: 'during_chemo', label: '항암치료 중' },
  { id: 'neutropenia', label: '호중구감소증' },
  { id: 'post_op', label: '수술 후 회복기' },
  { id: 'survivorship', label: '치료 종료 후' }
]

const base = { weightKg: 60, heightCm: 165, age: 60, sex: 'F' as const, weightLossPct: 0, conditions: [], medications: [] }

const foodNames = FOODS.map((f) => f.name)
const foodIdx = new Map(FOODS.map((f, i) => [f.id, i]))
const suppNames = SUPPLEMENTS.map((s) => s.name)
const suppIdx = new Map(SUPPLEMENTS.map((s, i) => [s.id, i]))

interface Entry {
  c: string; p: string; id: string; t: string; lv: string
  src: string; ev: string; why: string
  f: number[]; s: number[]
}

const entries: Entry[] = []

for (const c of CANCERS) {
  for (const ph of PHASES) {
    const patient: PatientContext = { ...base, cancer: c.id, phase: ph.id }
    const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
    const byRule = new Map<string, Entry>()

    for (const f of FOODS) {
      for (const h of evaluateFood(f, patient, 1, cached).hits) {
        let e = byRule.get(h.rule.id)
        if (!e) {
          e = {
            c: c.id, p: ph.id, id: h.rule.id, t: h.rule.title, lv: h.rule.level,
            src: h.source === '증상' ? (h.sourceLabel ?? '증상') : h.source,
            ev: h.rule.evidence, why: h.rule.reason, f: [], s: []
          }
          byRule.set(h.rule.id, e)
        }
        e.f.push(foodIdx.get(f.id)!)
      }
    }
    for (const s of SUPPLEMENTS) {
      for (const h of evaluateSupplement(s, patient, cached).hits) {
        let e = byRule.get(h.rule.id)
        if (!e) {
          e = {
            c: c.id, p: ph.id, id: h.rule.id, t: h.rule.title, lv: h.rule.level,
            src: h.source === '증상' ? (h.sourceLabel ?? '증상') : h.source,
            ev: h.rule.evidence, why: h.rule.reason, f: [], s: []
          }
          byRule.set(h.rule.id, e)
        }
        e.s.push(suppIdx.get(s.id)!)
      }
    }
    entries.push(...byRule.values())
  }
}

console.log(JSON.stringify({
  cancers: CANCERS.map((c) => ({ id: c.id, name: c.name })),
  phases: PHASES,
  foodNames, suppNames,
  foodTotal: FOODS.length,
  suppTotal: SUPPLEMENTS.length,
  entries
}))
