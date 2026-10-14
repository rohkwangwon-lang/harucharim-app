/**
 * 숫자 검사 — 화면에 쓴 숫자는 인용한 출처의 대조 기록에 있어야 한다.
 *
 * 원칙은 "숫자엔 출처"(2026-10 자가시험). 그런데 숫자가 출처에 정말 있는지는 사람이 읽어야만 알 수 있었고,
 * 읽은 결과가 어디에도 남지 않았다 — 그래서 같은 숫자를 매번 다시 의심하거나, 아무도 확인하지 않은 채 남았다.
 *
 * 2026-10-14 전수 대조부터는 원문에서 확인한 숫자를 출처의 citation 괄호 주석에 적는다(예: "HR 0.75, 95 % CI 0.61~0.92").
 * 이 검사는 규칙의 제목·이유(조건별 이유 포함)에 나오는 숫자가 **그 규칙이 인용한 출처의 주석** 에 있는지 본다.
 * 없으면 둘 중 하나다 — 원문을 다시 읽고 주석에 적거나, 문장에서 숫자를 고친다.
 *
 * 걸러 내는 것
 *   · 10 이하의 정수 — "하루 2번", "3주" 처럼 셀 수 없이 많고 뜻이 약하다(대신 사람이 본다)
 *   · 위험비에서 계산한 백분율 — HR 0.72 → "28 % 낮았다" 는 계산으로 맞는지 확인한다
 *   · 사람이 확인한 예외 — DERIVED 에 이유와 함께
 */
import { COMMON_RULES } from '../../src/data/commonRules'
import { CONDITION_RULES } from '../../src/data/conditionRules'
import { CANCERS } from '../../src/data/cancers'
import { INTERACTIONS } from '../../src/data/interactions'
import { INGREDIENT_RULES } from '../../src/data/ingredientRules'
import { REF_BY_ID } from '../../src/data/references'

/* [규칙 id] → { 숫자: 왜 출처 주석에 없어도 되는가 } */
const DERIVED: Record<string, Record<string, string>> = {}

const norm = (s: string) => s.replace(/\s+/g, '').replace(/(\d),(?=\d{3})/g, '$1')
const NUM = /\d+(?:,\d{3})*(?:\.\d+)?/g

type Item = { id: string; text: string; refs: string[] }
const items: Item[] = []
for (const r of [...COMMON_RULES, ...Object.values(CONDITION_RULES).flat(), ...CANCERS.flatMap((c) => c.rules), ...INTERACTIONS] as any[]) {
  items.push({ id: r.id, text: `${r.title} ${r.reason} ${r.howTo ?? ''}`, refs: r.refIds ?? [] })
}
for (const r of INGREDIENT_RULES as any[]) {
  const subs = [r.byCancer, r.byMedication, r.byCondition].flatMap((o) => Object.values(o ?? {})).map((x: any) => x.reason)
  items.push({ id: 'ingr:' + r.name, text: [r.reason, ...subs, r.duringTreatment?.reason ?? ''].join(' '), refs: r.refIds ?? [] })
}

const bads: string[] = []
let numbers = 0
for (const it of items) {
  const nums = [...new Set((it.text.match(NUM) ?? []).map((n) => n.replace(/,/g, '')))]
    .filter((n) => !(Number.isInteger(Number(n)) && Number(n) <= 10))
  if (!nums.length) continue
  const refText = norm(it.refs.map((id) => `${REF_BY_ID[id]?.citation ?? ''} ${REF_BY_ID[id]?.verified ?? ''}`).join(' '))
  /* 이 규칙 문장 속 위험비·비율(0.xx)에서 나오는 백분율 */
  const ratios = (it.text.match(/0\.\d{2}/g) ?? []).map(Number)
  const derivedPct = new Set(ratios.flatMap((h) => [Math.round((1 - h) * 100), Math.round((h - 1) * -100)]).map(String))
  for (const n of nums) {
    numbers++
    if (refText.includes(n)) continue
    if (derivedPct.has(n)) continue
    if (DERIVED[it.id]?.[n]) continue
    bads.push(`${it.id} — "${n}" 이(가) 인용한 출처(${it.refs.join(', ') || '없음'})의 대조 기록에 없다`)
  }
}

console.log(`숫자 검사 완료 — 숫자 ${numbers}개 · 출처 대조 기록에 없는 것 ${bads.length}개`)
for (const b of bads) console.log('   -', b)
if (numbers < 200) { console.log('   - 검사가 헛돎'); process.exitCode = 1 }
if (bads.length) process.exitCode = 1
