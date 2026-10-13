/**
 * 식약처 질의서의 붙임(규칙 전체 목록·참고 문헌)을 앱 자료에서 그대로 뽑는다.
 *
 * 손으로 옮겨 적으면 문서와 앱이 어긋난다. 실제로 질의서 초안은 "약물 사이의 상호작용은
 * 다루지 않는다" 고 적었는데 앱에는 카페시타빈–와파린 문구가 있었다. 기관에 내는 문서가
 * 실제 제품과 다르면 회신이 그 제품을 덮지 못한다. 그래서 붙임은 사람이 쓰지 않는다.
 *
 *   node_modules/.bin/jiti scripts/inquiry-data.ts > /tmp/inquiry-data.json
 */
import { COMMON_RULES } from '../src/data/commonRules'
import { CONDITION_RULES } from '../src/data/conditionRules'
import { CANCERS } from '../src/data/cancers'
import { INTERACTIONS, MEDICATIONS } from '../src/data/interactions'
import { ALL_REFERENCES } from '../src/data/references'

const refNo = new Map(ALL_REFERENCES.map((r, i) => [r.id, i + 1]))
const med = new Map(MEDICATIONS.map((m) => [m.id, m.name]))
const row = (scope: string, r: { level: string; evidence: string; title: string; refIds?: string[] }) => ({
  scope, level: r.level, evidence: r.evidence, title: r.title,
  refs: (r.refIds ?? []).map((id) => refNo.get(id) ?? 0)
})

const rules = [
  /* 항암제를 쓰는 동안에만 뜨는 규칙은 그렇게 적는다 — '공통' 이라고만 쓰면 누구에게나 뜨는 것으로 읽힌다 */
  ...COMMON_RULES.map((r) => row(r.onAnticancer ? '공통 · 항암제 사용 중' : '공통', r)),
  ...Object.entries(CONDITION_RULES).flatMap(([k, rs]) => rs.map((r) => row(`상태 · ${k}`, r))),
  ...CANCERS.flatMap((c) => c.rules.map((r) => row(`암종 · ${c.name}`, r)))
]
const interactions = INTERACTIONS.map((i) => {
  const also = (i.alsoTaking?.medications ?? []).map((id) => med.get(id) ?? id)
  return row(`약 · ${med.get(i.agent) ?? i.agent}${also.length ? ` + ${also.join('·')}` : ''}`, i)
})
const references = ALL_REFERENCES.map((r, i) => ({ no: i + 1, kind: r.kind, year: r.year, citation: r.citation }))

process.stdout.write(JSON.stringify({ rules, interactions, references }))
