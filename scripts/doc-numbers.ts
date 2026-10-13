/**
 * 문서에 적는 숫자를 앱 자료에서 센다.
 *
 * 질의서·스토어 원고·발표 자료·홍보물에 "규칙 몇 건, 문헌 몇 종, 약 몇 가지" 가 적혀 있다.
 * 규칙을 하나 더하면 그 숫자가 열 군데에서 낡는다 — 2026-10-13 에 실제로 그랬다.
 * 손으로 세지 않도록 여기서 세고, scripts/checks/docs.ts 가 문서와 견준다.
 *
 *   node_modules/.bin/jiti scripts/doc-numbers.ts
 */
import { COMMON_RULES } from '../src/data/commonRules'
import { CONDITION_RULES } from '../src/data/conditionRules'
import { CANCERS } from '../src/data/cancers'
import { INTERACTIONS, MEDICATIONS } from '../src/data/interactions'
import { INGREDIENT_RULES } from '../src/data/ingredientRules'
import { ALL_REFERENCES } from '../src/data/references'

const rules = [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(), ...CANCERS.flatMap((c) => c.rules)]
const count = <T extends string>(list: { [k: string]: unknown }[], key: string, values: readonly T[]) =>
  Object.fromEntries(values.map((v) => [v, list.filter((r) => r[key] === v).length])) as Record<T, number>
const LEVELS = ['prefer', 'caution', 'avoid', 'info'] as const
const GRADES = ['A', 'B', 'C', 'G'] as const

export const DOC_NUMBERS = {
  rules: rules.length,
  interactions: INTERACTIONS.length,
  total: rules.length + INTERACTIONS.length,
  references: ALL_REFERENCES.length,
  ingredientRules: INGREDIENT_RULES.length,
  /** 화면에서 처음 보이는 약의 수(윗칸). 아랫칸은 윗칸을 고른 뒤에 나온다 */
  medications: MEDICATIONS.filter((m) => !m.parent).length,
  medicationDetails: MEDICATIONS.filter((m) => m.parent).length,
  cancers: CANCERS.length,
  conditions: Object.keys(CONDITION_RULES).length,
  ruleLevels: count(rules as never, 'level', LEVELS),
  ruleGrades: count(rules as never, 'evidence', GRADES),
  interactionLevels: count(INTERACTIONS as never, 'level', LEVELS)
}

if (process.argv[1]?.endsWith('doc-numbers.ts')) process.stdout.write(JSON.stringify(DOC_NUMBERS, null, 1) + '\n')
