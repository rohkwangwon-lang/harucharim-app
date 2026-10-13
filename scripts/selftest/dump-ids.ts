/**
 * 화면 자가시험이 쓸 재료를 뽑는다 — 실제로 있는 음식·영양제·약·증상·세부 유형의 id.
 * 화면 시험은 브라우저를 모는 .mjs 라 앱의 TS 자료를 직접 읽지 못한다.
 *
 *   node_modules/.bin/jiti scripts/selftest/dump-ids.ts > /tmp/harucharim-ids.json
 */
import { FOODS } from '../../src/data/foods'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { MEDICATIONS } from '../../src/data/interactions'
import { CONDITION_RULES } from '../../src/data/conditionRules'
import { CANCERS } from '../../src/data/cancers'
import { SUBTYPE_OPTIONS } from '../../src/data/types'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { NOTICES } from '../../src/data/notices'

const every = <T,>(a: T[], n: number) => a.filter((_x, i) => i % n === 0)
process.stdout.write(JSON.stringify({
  foods: every(FOODS, 7).map((f) => f.id),
  foodNames: every(FOODS, 40).map((f) => f.name.slice(0, 6)),
  supplements: SUPPLEMENTS.map((s) => s.id),
  medications: MEDICATIONS.map((m) => m.id),
  conditions: Object.keys(CONDITION_RULES),
  cancers: CANCERS.map((c) => c.id),
  subtypes: Object.fromEntries(Object.entries(SUBTYPE_OPTIONS as Record<string, { id: string }[]>).map(([k, v]) => [k, v.map((x) => x.id)])),
  defaultPatient: DEFAULT_PATIENT,
  notices: NOTICES.map((n) => n.id)
}))
