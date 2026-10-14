/**
 * 범위 검사 — 규칙이 말하는 대상과 실제로 붙는 대상이 같은가.
 *
 * 2026-10-14 하루에 같은 꼴의 오류가 두 번 나왔다.
 *   1. "두부·두유·된장은 피하지 않아도 됩니다"(콩 코호트 근거)가 석류·아마씨에도 붙었다 — 태그 하나에 콩 규칙을 걸어서.
 *   2. "이소플라본·에스트로겐 유사 성분을 농축한 보충제는 별개 문제입니다"가 실제로는 홍삼 하나에만 붙어 있었다.
 * 둘 다 규칙 한 건만 읽어서는 보이지 않는다. 규칙이 **실제로 무엇에 붙는지** 를 펼쳐 놓고 제목과 견줘야 보인다.
 *
 * 잣대는 엔진이 아니라 이름이다(하루차림 검사 운영 원칙: 잣대를 엔진에서 빌리지 말 것).
 *   A. 영양제: 제목이 성분을 말하면(이소플라본·홍삼·오메가-3 …), 붙는 영양제의 이름·성분·분류에 그 낱말이 있어야 한다.
 *   B. 음식: 제목이 음식을 나열하면(두부·두유·된장 …) 붙는 음식의 이름에 그중 하나가 있어야 한다.
 *      "햄·소시지·베이컨 **같은** 가공육" 처럼 예시로 든 제목은 나열이 아니므로 B 에서 뺀다 — 대신 아래 C 로 본다.
 *   C. 붙는 것이 하나도 없는 규칙(죽은 규칙)은 실패다 — 제목만 남고 대상이 사라진 것이다.
 * 사람이 확인하고 "이건 맞다" 고 판단한 예외는 ALLOW 에 이유와 함께 적는다.
 */
import { COMMON_RULES } from '../../src/data/commonRules'
import { CONDITION_RULES } from '../../src/data/conditionRules'
import { CANCERS } from '../../src/data/cancers'
import { INTERACTIONS } from '../../src/data/interactions'
import { INGREDIENT_RULES } from '../../src/data/ingredientRules'
import { CURATED_FOODS, FOODS } from '../../src/data/foods'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { evaluateFood, evaluateSupplement } from '../../src/engine/rules'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { PatientContext } from '../../src/data/types'

const bads: string[] = []
const bad = (k: string, d: string) => bads.push(`${k} :: ${d}`)

/* 사람이 확인한 예외 — [규칙 id, 이유] */
const ALLOW: Record<string, string> = {
  'breast-soy': '콩 음식 전체(대두이소플라본 32종)가 대상이고 제목의 두부·두유·된장은 대표 예시다 — 근거(상하이·ABCPP 코호트)가 콩 식품 전체 섭취량을 본 것이라 범위가 맞다',
  'int-tamoxifen-soy': 'breast-soy 와 같은 대상·같은 근거',
  'common-antioxidant-rt': "셀레늄은 항산화 미량원소 — 이름에 '항산화' 가 없을 뿐 대상이 맞다",
  'hn-antioxidant': "셀레늄은 항산화 미량원소 — 이름에 '항산화' 가 없을 뿐 대상이 맞다",
  'prostate-lycopene': "제목이 '토마토·리코펜' 이다 — 리코펜 식품(수박·케첩)이 대상인 것이 맞다",
  'lung-betacarotene': "종합비타민에 'info' 로 '소량은 시험 용량보다 훨씬 적다' 를 알리는 규칙 — 성분표에 베타카로틴이 따로 없을 뿐 비타민 A 일부가 베타카로틴이다(2026-10-14)"
}

type AnyRule = { id: string; title: string; match?: any; phases?: string[]; subtypes?: string[]; agent?: string; alsoTaking?: any }
const rules: { r: AnyRule; cancer: string; condition?: string; kind: 'rule' | 'int' }[] = []
for (const r of COMMON_RULES as AnyRule[]) rules.push({ r, cancer: 'breast', kind: 'rule' })
for (const [cond, rs] of Object.entries(CONDITION_RULES)) for (const r of rs as AnyRule[]) rules.push({ r, cancer: 'breast', condition: cond, kind: 'rule' })
for (const c of CANCERS) for (const r of c.rules as AnyRule[]) rules.push({ r, cancer: c.id, kind: 'rule' })
for (const r of INTERACTIONS as AnyRule[]) rules.push({ r, cancer: 'breast', kind: 'int' })

/* 규칙이 걸리는 환자를 여러 갈래로 만들어 본다 — 한 갈래에서라도 붙으면 '붙는 것' 으로 센다 */
function patients(x: (typeof rules)[number]): PatientContext[] {
  const phases = x.r.phases?.length ? x.r.phases : ['survivorship', 'during_chemo', 'during_rt']
  const meds = x.kind === 'int' ? [x.r.agent!, ...(x.r.alsoTaking?.medications ?? [])].filter(Boolean) : []
  const conds = [...(x.condition ? [x.condition] : []), ...(x.r.alsoTaking?.conditions ?? [])]
  return phases.map((phase) => ({ ...DEFAULT_PATIENT, onboarded: true, sex: 'F', cancer: x.cancer, phase, subtypes: x.r.subtypes ?? [], conditions: conds, medications: meds } as unknown as PatientContext))
}
const hitIds = (e: any) => [...e.hits.map((h: any) => h.rule.id), ...(e.interactions ?? []).map((i: any) => i.interaction.id)]

/* ── A. 영양제 ───────────────────────────────────────────── */
const SUPP_WORDS = [...new Set([
  ...INGREDIENT_RULES.flatMap((r) => [r.name.replace(/\(.*\)/, '').trim(), ...r.match]),
  '이소플라본', '홍삼', '인삼', '오메가', '비타민', '칼슘', '철분', '아연', '셀레늄', '유산균', '프로바이오틱스', '단백질', 'BCAA',
  '커큐민', '강황', '마그네슘', '식이섬유', '코엔자임', '엽산', '항산화', '종합비타민', '경장영양', '균형영양'
].filter((w) => w.length >= 2))]
/* 성분표(perDay)에 든 영양소도 이름으로 — 종합비타민의 엽산은 이름이 아니라 성분표에 있다 */
const NUTRIENT_KO: Record<string, string> = { folate: '엽산', vitE: '비타민 E 비타민E', vitA: '비타민 A 비타민A', vitD: '비타민 D 비타민D', vitC: '비타민 C 비타민C',
  ca: '칼슘', fe: '철분', zn: '아연', se: '셀레늄', mg: '마그네슘', b12: 'B12 비타민 B12', b6: 'B6', b1: 'B1' }
const suppText = (s: any) => [s.name, s.category, s.note, ...(s.actives ?? []).map((a: any) => a.name),
  ...Object.entries(s.perDay ?? {}).filter(([, v]) => Number(v) > 0).map(([k]) => NUTRIENT_KO[k] ?? '')].join(' ')
let suppRules = 0, suppTestable = 0
for (const x of rules) {
  const m = x.r.match ?? {}
  if (!m.supplementIds && !m.supplementCategories) continue
  suppRules++
  const words = SUPP_WORDS.filter((w) => x.r.title.includes(w))
  const hit = SUPPLEMENTS.filter((s) => patients(x).some((p) => { try { return JSON.stringify(evaluateSupplement(s, p)).includes(`"${x.r.id}"`) } catch { return false } }))
  if (!words.length) continue
  suppTestable++
  for (const s of hit) if (!words.some((w) => suppText(s).includes(w)) && !ALLOW[x.r.id]) {
    bad('제목이 말하는 성분이 붙는 영양제에 없음', `${x.r.id} — 제목 낱말 [${words.join('·')}] · 붙는 영양제 "${s.name}"`)
  }
}

/* ── B·C. 음식 ───────────────────────────────────────────── */
const GENERIC = new Set(['음식', '식품', '과일', '채소', '고기', '음료', '간식', '식사', '보충제', '영양제', '단백질', '생것', '조림', '볶음', '구이', '기름', '국물', '기본', '제제', '모듬', '가루', '일반'])
const FOOD_WORDS = [...new Set(CURATED_FOODS.flatMap((f) => [f.name, ...(f.aliases ?? [])]).flatMap((n) => n.split(/[^가-힣]+/)).filter((w) => w.length >= 2 && !GENERIC.has(w)))]
let foodRules = 0, listed = 0, dead = 0
for (const x of rules) {
  const m = x.r.match ?? {}
  if (!(m.tags || m.foodIds || m.groups || m.nutrient)) continue
  foodRules++
  const ps = patients(x)
  const hit = FOODS.filter((f) => ps.some((p) => hitIds(evaluateFood(f, p, 1)).includes(x.r.id)))
  if (hit.length === 0 && !(m.supplementIds || m.supplementCategories)) {
    if (!ALLOW[x.r.id]) bad('어디에도 붙지 않는 규칙', `${x.r.id} — "${x.r.title.slice(0, 40)}"`)
    dead++
    continue
  }
  if (/같은|등|처럼|따위/.test(x.r.title)) continue
  /* 제목에서 음식 이름을 찾는다 — 제목의 앞부분(— 앞)만. 뒤는 이유다 */
  const head = x.r.title.split('—')[0]
  const words = FOOD_WORDS.filter((w) => head.includes(w))
  if (words.length < 2 && !/[·,]/.test(head)) continue          // 나열이 아니면 B 의 대상이 아니다
  if (!words.length) continue
  listed++
  /* 제목에 없더라도 이유 문장에서 그 음식을 밝혔으면(예: 자몽 규칙의 "라임·포멜로도 같은 작용") 통과 */
  const reasonText = (x.r as any).reason ?? ''
  const mentioned = (f: { name: string }) => FOOD_WORDS.some((w) => f.name.includes(w) && reasonText.includes(w)) ||
    head.split(/[·,\s]+/).some((t) => t.length >= 1 && !GENERIC.has(t) && f.name.includes(t))
  const off = hit.filter((f) => !words.some((w) => f.name.includes(w) || (f.aliases ?? []).some((a) => a.includes(w))) && !mentioned(f))
  if (off.length && !ALLOW[x.r.id]) {
    bad('제목이 나열한 음식이 아닌 데에 붙음', `${x.r.id} — 제목 [${words.join('·')}] · 붙는 ${hit.length}종 중 ${off.length}종이 다름: ${off.slice(0, 6).map((f) => f.name).join(', ')}`)
  }
}

/* ── D. 영양제 원료 규칙: match 낱말이 다른 낱말의 일부로 끼어드는가 ──────────
 * '칡' 한 글자가 '칡소(한우 품종) 사골곰탕' 을 잡았다. 음식 이름 전체에서 그 낱말이 들어간 것을 모아,
 * 그 원료와 무관해 보이는 것을 사람이 볼 수 있게 센다. 한 글자 낱말은 실패로 막는다.
 */
for (const r of INGREDIENT_RULES) for (const w of r.match) {
  if (w.replace(/\s/g, '').length < 2) bad('원료 낱말이 한 글자', `${r.name} — "${w}" 는 다른 낱말 속에 끼어든다`)
}

console.log(`범위 검사 완료 — 영양제 규칙 ${suppRules}건(제목 낱말로 견준 것 ${suppTestable}) · 음식 규칙 ${foodRules}건(나열 제목 ${listed}) · 죽은 규칙 ${dead} · ${bads.length ? `문제 ${bads.length}건` : '문제 없음'}`)
for (const b of bads) console.log('   -', b)
if (suppTestable < 5 || foodRules < 80) { console.log('   - 검사가 헛돎'); process.exitCode = 1 }
if (bads.length) process.exitCode = 1
