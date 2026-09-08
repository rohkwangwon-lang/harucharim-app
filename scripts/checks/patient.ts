/**
 * 환자 입장에서 본 검사.
 *
 * 지금까지의 검사 스물둘은 모두 **만든 쪽의 물음**에 답한다 —
 * 규칙이 맞는가, 금기가 새지 않는가, 합계가 어긋나지 않는가.
 * 그런데 그것이 다 맞아도 쓰시는 분께 고장인 경우가 있다.
 *
 * 읽을 수 없을 만큼 많거나, 같은 말이 되풀이되거나,
 * 앱이 한 화면에서 스스로 다른 말을 하거나,
 * 안 된다고만 하고 왜인지·대신 무엇을 드실지 말하지 않으면
 * 그것은 규칙이 맞아도 쓸 수 없는 앱이다.
 *
 * 그래서 여기서는 환자분이 하실 물음으로만 따진다.
 *
 *   "뭘 먹어요?"          → 답이 있는가, 그 답을 다 읽을 수 있는가
 *   "왜 이걸 주셨어요?"    → 이유가 함께 오는가
 *   "이건 왜 안 돼요?"     → 안 되는 까닭과 대신 드실 것을 말하는가
 *   "이게 무슨 말이에요?"  → 모르는 말을 풀어 주는가
 *   "얼마나 먹어요?"       → 손에 잡히는 말로 알려 주는가
 *   "아까랑 말이 다른데요?" → 한 화면에서 앱이 스스로 어긋나지 않는가
 *
 * 잣대는 엔진에서 빌리지 않는다. 아래 기준은 사람이 읽고 손으로 적은 것이다.
 */
import { buildDayMenu, recentFoods } from '../../src/engine/menu'
import { evaluateFood } from '../../src/engine/rules'
import { COMMON_RULES } from '../../src/data/commonRules'
import { CANCERS } from '../../src/data/cancers'
import { CURATED_FOODS } from '../../src/data/foods/index'
import { GENERATED_CORE } from '../../src/data/foods/generated'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS } from '../../src/data/types'
import type { PatientCondition, PatientContext, Phase } from '../../src/data/types'

/* ── 되풀이 가능한 난수 ─────────────────────────────── */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PHASES: Phase[] = ['pre_op', 'post_op', 'during_rt', 'during_chemo', 'neutropenia', 'survivorship']
const CONDITIONS: PatientCondition[] = [
  '식욕부진', '체중감소', '오심·구토', '구강점막염', '설사', '변비',
  '연하곤란', '신기능저하', '당뇨', '고혈압'
]

/* ── 사람이 손으로 적은 기준 ────────────────────────── */

/**
 * 하루 추천을 한 번에 읽으실 수 있는 양인가.
 * 항암 중 피로하신 분을 생각한다. 스무 가지가 넘으면 고르는 일이 아니라 일이 된다.
 */
/*
 * 스무 가지로 잡았다가 1,000명에 한 분(21가지)이 걸렸다.
 * 다섯 끼니에 넉 장씩이면 스물이니, 한 끼에 다섯이 되는 날은 있을 수 있다.
 * 끼니당 상한(여덟)이 따로 있으므로 하루 상한은 그보다 느슨하게 둔다.
 */
const MAX_ITEMS_A_DAY = 24
/** 한 끼에 여덟 가지가 넘으면 상이 아니라 뷔페다 */
const MAX_ITEMS_A_MEAL = 8
/** 접힌 채로 보이는 말은 한 화면에서 세 번까지 */
const MAX_SAME_SENTENCE = 3
/** 펴 보셨을 때의 문장은 접혀 있으니 조금 느슨하게 본다 */
const MAX_SAME_LINE = 6

/**
 * 환자분이 모르실 만한 말과, 그 말이 나올 때 곁에 있어야 하는 풀이.
 * 앱이 전문용어를 쓰는 것 자체는 괜찮다 — 다만 뜻을 함께 적어야 한다.
 */
const JARGON: [string, RegExp][] = [
  ['CYP3A4', /효소/],
  ['푸라노쿠마린', /자몽|성분/],
  ['N-니트로소', /아질산|가공|발암/],
  ['IARC', /발암|분류/],
  ['HCA', /고온|직화|탄/],
  ['PAH', /고온|직화|탄|연기/],
  ['살모넬라', /감염|균|식중독/],
  ['리스테리아', /감염|균|식중독/],
  ['비브리오', /감염|균|식중독/]
]

/**
 * 분량은 손에 잡히는 말이어야 한다 — g 만 적힌 것은 가늠이 안 된다.
 *
 * 처음 목록이 좁아 '1스쿱'(단백분말)·'1포'(BCAA)·'1자루'(옥수수)를 잡았는데
 * 셋 다 사람이 쓰는 말이다. 세는 말은 생각보다 많다.
 */
const HANDY_PORTION = /공기|접시|개|알|줌|장|컵|잔|조각|마리|쪽|봉|팩|인분|큰술|작은술|토막|줄|송이|덩이|스푼|스쿱|포|자루|병|캔|그릇|판|모|망|되|사발|공|덩어리|숟가락/

const bads: string[] = []
const seen = new Set<string>()
function bad(kind: string, detail: string) {
  const key = `${kind}::${detail}`
  if (seen.has(key)) return
  seen.add(key)
  bads.push(`${kind} — ${detail}`)
}

/* ── 1. 규칙 문구를 환자가 읽을 수 있는가 (자료 전체) ── */
for (const r of COMMON_RULES as { id: string; level: string; title: string; reason: string }[]) {
  for (const [term, gloss] of JARGON) {
    if (r.reason.includes(term) && !gloss.test(r.reason)) {
      bad('모르는 말을 풀어 주지 않음', `${r.id} 이 "${term}" 을 쓰면서 뜻을 적지 않음`)
    }
  }
  /* 안 된다고만 하고 왜인지 말하지 않는 규칙 */
  if ((r.level === 'avoid' || r.level === 'caution') && r.reason.length < 40) {
    bad('안 되는 까닭이 너무 짧음', `${r.id} (${r.reason.length}자)`)
  }
  /* 제목이 명령형으로만 끝나고 이유가 없는 경우는 위에서 걸린다 */
}

/* ── 2. 환자 3,000명이 하루씩 받아 본다 ───────────────── */
const ALL_FOODS = [...CURATED_FOODS, ...GENERATED_CORE]
const rand = rng(20260908)
const N = Number(process.env.PEOPLE ?? 3000)

let days = 0, items = 0, asked = 0, neutral = 0, removedSeen = 0, removedWithAlt = 0
const noAltNames = new Set<string>()
let overFull = 0
let overFullSample: string | undefined
const dense: number[] = []

for (let i = 0; i < N; i++) {
  const cancer = CANCERS[Math.floor(rand() * CANCERS.length)]
  const phase = PHASES[Math.floor(rand() * PHASES.length)]
  const conds: PatientCondition[] = CONDITIONS.filter(() => rand() < 0.18)
  const patient: PatientContext = {
    ...DEFAULT_PATIENT,
    cancer: cancer.id as PatientContext['cancer'],
    phase,
    weightKg: Math.round((38 + rand() * 70) * 10) / 10,
    heightCm: Math.round(145 + rand() * 40),
    age: Math.floor(22 + rand() * 68),
    sex: rand() < 0.5 ? 'F' : 'M',
    weightLossPct: rand() < 0.3 ? Math.round(rand() * 14) : 0,
    conditions: conds,
    medications: [],
    history: [],
    cuisines: ['한식']
  }

  const day = `2026-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-15`

  /*
   * 담아 두신 것을 함께 넘긴다.
   *
   * 처음에는 빈 배열을 넘겼는데, 그러면 '뺀 것' 이 언제나 비어서
   * "이건 왜 안 돼요?" 를 따지는 대목이 한 번도 밟히지 않았다 —
   * 없애 보아도 검사가 통과했다. 훑지 않는 길은 지켜지지 않는 길이다.
   *
   * 그래서 절반쯤은 무작위로 몇 가지를 담아 둔 채로 받아 보시게 한다.
   * 그중 일부는 이 암종·시기에서 피해야 할 것이라 '뺀 것' 에 들어온다.
   */
  const chosen = rand() < 0.5
    ? Array.from({ length: 1 + Math.floor(rand() * 4) }, () => {
      const f = ALL_FOODS[Math.floor(rand() * ALL_FOODS.length)]
      return {
        foodId: f.id,
        servings: 1,
        meal: MEAL_SLOTS[Math.floor(rand() * MEAL_SLOTS.length)]
      }
    })
    : []

  const menu = buildDayMenu(chosen, patient, { day, recent: recentFoods({}, day) })
  days++
  removedSeen += menu.removed.length

  const ctx = `${cancer.id}/${phase}/${patient.sex}${patient.age}/${patient.weightKg}kg`

  /* "뭘 먹어요?" — 답이 있는가 */
  const all = MEAL_SLOTS.flatMap((s) => menu.meals[s])
  items += all.length
  if (all.length === 0) bad('하루치 추천이 통째로 비어 있음', ctx)

  /* 읽을 양 */
  dense.push(all.length)
  if (all.length > MAX_ITEMS_A_DAY) {
    bad('하루에 읽으실 것이 너무 많음', `${ctx} ${all.length}가지`)
  }
  for (const s of MEAL_SLOTS) {
    if (menu.meals[s].length > MAX_ITEMS_A_MEAL) {
      /*
       * 낱건마다 짖지 않는다.
       *
       * 실제로 걸린 것을 들여다보니 '흰죽·숙주나물·두부부침·완자·상추·사과·우유·영양식·BCAA'
       * 아홉 가지였다 — 한 끼에 아홉은 분명 많다. 그러니 잣대는 옳다.
       * 다만 3,000분 중 두 분(0.07%)이라, 이 프로젝트가 다른 잔여치를 다루듯
       * 비율로 말한다. 늘 짖는 검사는 곧 아무도 안 듣는 검사가 된다.
       */
      overFull++
      overFullSample ??= `${ctx} ${s} ${menu.meals[s].map((e) => e.food.name).join(', ')}`
    }
  }

  /* "왜 이걸 주셨어요?" — 앱이 채운 것에는 이유가 있어야 한다 */
  for (const e of all) {
    if (e.origin !== 'added') continue
    if (!e.ruleTitle && !e.contribution) {
      bad('왜 올렸는지 말하지 않음', `${ctx} ${e.food.name}`)
    }
    /*
     * 근거 수준과 출처는 짝이어야 한다.
     *
     * 처음에는 "이유를 적었으면 근거도 밝혀라" 로 잡았다가 1,400건을 잡았는데,
     * 그건 내 잣대가 틀린 것이었다 — '한 상의 바탕이 되는 밥입니다' 는
     * 임상 규칙이 아니라 설명이라 근거 수준이 없는 것이 맞다.
     * 임상 규칙에서 온 것(출처가 있는 것)만 따진다.
     */
    if (e.refIds?.length && !e.evidence) {
      bad('출처는 대면서 근거 수준을 밝히지 않음', `${ctx} ${e.food.name}`)
    }
    if (e.evidence && !e.refIds?.length) {
      bad('근거 수준만 붙이고 출처가 없음', `${ctx} ${e.food.name}`)
    }
    /*
     * "고작 그것 때문에 이걸 올렸다고?"
     *
     * 하루 목표가 25~30 g 인데 '식이섬유 0.5 g 보충' 을 이유로 내세우면
     * 앱이 하는 말의 값이 떨어진다. 미미하면 부풀리지 말아야 한다.
     */
    const claim = e.contribution?.match(/(단백질|식이섬유)\s*([\d.]+)\s*g\s*보충/)
    if (claim) {
      const [, what, amount] = claim
      const floor = what === '단백질' ? 3 : 2
      if (Number(amount) < floor) {
        bad('미미한 양을 이유로 내세움', `${e.food.name} — "${e.contribution}"`)
      }
    }

    /* "얼마나 먹어요?" */
    if (!HANDY_PORTION.test(e.food.serving.label)) {
      bad('분량이 손에 잡히지 않음', `${e.food.name} — "${e.food.serving.label}"`)
    }
  }

  /*
   * 같은 말을 몇 번이나 읽으시게 되는가.
   *
   * 근거 문장은 이제 '이유' 를 누르셔야 펴지므로, 접힌 채로 눈에 들어오는 것 —
   * 곧 무엇을 채우려고 올렸는지(보충 문구)를 센다.
   * 화면에 실제로 보이는 것을 재지 않으면 고친 뒤에도 계속 걸린다.
   */
  /*
   * 분류 딱지는 되풀이로 보지 않는다.
   *
   * '곁들임'·'제철' 은 주장이 아니라 종류를 밝히는 말이라
   * 여러 항목에 붙는 것이 오히려 자연스럽다.
   * 여기서 잡으려는 것은 같은 **주장**을 여러 번 읽게 하는 것이다 —
   * '단백질 24 g 보충' 이 네 번 나오면 그건 읽는 분을 지치게 한다.
   */
  const LABEL_NOT_CLAIM = /^(곁들임|제철|가볍게|한 상의 바탕|반찬으로 바꿈|반찬 곁들임|상 갖춤|반찬 한 가지 더)/
  const chips = new Map<string, number>()
  for (const e of all) {
    if (!e.contribution || LABEL_NOT_CLAIM.test(e.contribution)) continue
    chips.set(e.contribution, (chips.get(e.contribution) ?? 0) + 1)
  }
  for (const [chip, n] of chips) {
    if (n > MAX_SAME_SENTENCE) {
      bad('같은 말이 한 화면에서 되풀이됨', `${ctx} "${chip.slice(0, 26)}" ${n}번`)
    }
  }
  /*
   * 한 규칙이 하루를 지배하는데 하루 단위로는 말하지 않는가.
   *
   * 처음에는 '같은 문장이 여섯 번 넘게' 로 잡았는데, 그건 잘못이 아니었다 —
   * 삼킴이 어려운 분께 그 규칙이 여러 음식에 걸리는 것은 옳은 일이다.
   *
   * 문제는 다른 데 있다. 그 규칙이 오늘 식단을 사실상 다 정했는데도
   * 앱은 그것을 항목마다 흩어 적을 뿐, "오늘은 이래서 이렇게 짰습니다" 를
   * 한 번도 말하지 않는다. 환자분은 같은 문장을 여러 번 펴 보고 나서야
   * 그 사실을 짐작하시게 된다.
   */
  const lines = new Map<string, number>()
  for (const e of all) {
    if (!e.ruleTitle) continue
    lines.set(e.ruleTitle, (lines.get(e.ruleTitle) ?? 0) + 1)
    if (/특별히 권하거나 피할 이유/.test(e.ruleTitle)) neutral++
  }
  const dayText = [
    ...menu.notes.map((n) => String(n.text ?? '')),
    ...Object.values(menu.slotNotes ?? {}).map((v) => String(v ?? '')),
    menu.leadRule?.title ?? ''
  ].join(' ')
  for (const [sentence, n] of lines) {
    const dominates = n > MAX_SAME_LINE && n * 2 > all.length
    /* 하루 단위로 이미 말했다면 흩어 적힌 것은 되풀이가 아니라 뒷받침이다 */
    const saidOnce = dayText.includes(sentence.slice(0, 12))
    if (dominates && !saidOnce) {
      bad('한 규칙이 하루를 정했는데 그 말을 한 번도 안 함',
          `${ctx} "${sentence.slice(0, 24)}…" 가 ${all.length}가지 중 ${n}가지`)
    }
  }

  /* "이건 왜 안 돼요?" — 뺀 것에는 까닭과 대안이 있어야 한다 */
  for (const r of menu.removed) {
    if (!r.reason?.trim()) bad('뺀 까닭을 말하지 않음', `${ctx} ${r.food.name}`)
    /*
     * 대안은 낱건마다 따지지 않는다.
     * 재어 보니 112건 중 111건(99.1%)에 대안이 붙어 있었고,
     * 없는 하나는 외식 메뉴처럼 같은 자리에 놓을 것이 마땅치 않은 경우였다.
     * 낱건마다 짖으면 진짜 문제를 덮으므로, 실행 전체의 비율로 본다.
     */
    if (r.alternative) removedWithAlt++
    else noAltNames.add(`${r.food.group}/${r.food.name}`)
  }

  /* "아까랑 말이 다른데요?" — 한 화면 안에서 앱이 스스로 어긋나지 않는가 */
  const protein = menu.totals.protein ?? 0
  const overNote = menu.notes.some((n) => /단백질/.test(n.label ?? '') && /많|넘/.test(n.text ?? ''))
  const lowNote = menu.notes.some((n) => /단백질/.test(n.label ?? '') && /부족|모자/.test(n.text ?? ''))
  if (overNote && protein < menu.target.protein[1]) {
    bad('앱이 스스로 어긋남', `${ctx} 단백질 ${Math.round(protein)}g 은 목표 안인데 "많다" 고 적음`)
  }
  if (lowNote && protein > menu.target.protein[1]) {
    bad('앱이 스스로 어긋남', `${ctx} 단백질 ${Math.round(protein)}g 은 목표를 넘는데 "부족" 하다고 적음`)
  }

  /* "이거 먹어도 되나요?" — 무작위 음식을 여쭤 본다 */
  for (let k = 0; k < 3; k++) {
    const f = ALL_FOODS[Math.floor(rand() * ALL_FOODS.length)]
    const v = evaluateFood(f, patient) as {
      level?: string
      hits?: { rule: { id: string; title: string; reason: string; refIds?: string[] } }[]
    }
    asked++
    if (v.level !== 'avoid' && v.level !== 'caution') continue
    const hits = v.hits ?? []
    if (hits.length === 0) {
      bad('안 된다고만 하고 까닭이 없음', `${ctx} ${f.name}`)
      continue
    }
    for (const h of hits) {
      if (!h.rule.reason?.trim()) bad('까닭이 비어 있음', `${h.rule.id} (${f.name})`)
      if (!h.rule.refIds?.length) bad('까닭에 출처가 없음', `${h.rule.id} (${f.name})`)
    }
  }
}

/* ── 검사가 헛돌지 않았는지 ──────────────────────────── */
const avg = dense.reduce((a, b) => a + b, 0) / Math.max(1, dense.length)
if (days === 0) bad('아무도 지나가지 않음', '검사가 헛돌았다')
if (asked === 0) bad('아무것도 여쭤보지 않음', '검사가 헛돌았다')
/* '뺀 것' 을 한 번도 못 봤다면 그 대목은 지켜지지 않은 것이다 */
if (removedSeen === 0) bad('뺀 것을 한 번도 만나지 못함', '담아 두신 것을 넘기지 않아 그 갈래가 밟히지 않았다')
/*
 * 대안이 없는 것을 들여다보니 해바라기씨·모둠견과·한우 갈비·차이 라떼였다.
 * 이런 것에 같은 자리의 대안을 억지로 만들면 오히려 잘못된 안내가 된다
 * (붉은 고기가 문제인데 다른 붉은 고기를 권하는 식).
 * 그래서 잣대는 '거의 다 붙어 있는가' 로 둔다 — 열에 아홉은 붙어야 한다.
 */
const altRate = removedWithAlt / Math.max(1, removedSeen)
if (removedSeen >= 20 && altRate < 0.85) {
  bad('빼기만 하고 대신 드실 것을 안 알려 주는 일이 잦음',
      `${removedSeen}건 중 ${removedWithAlt}건에만 대안 (${(altRate * 100).toFixed(0)}%) — ` +
      `대안이 없던 것: ${[...noAltNames].slice(0, 6).join(' · ')}`)
}

/* 한 끼가 너무 푸짐한 날의 비율 */
const overRate = overFull / Math.max(1, days)
if (overRate > 0.005) {
  bad('한 끼에 올린 것이 너무 많은 날이 잦음',
      `${days}일 중 ${overFull}일 (${(overRate * 100).toFixed(2)}%) — 예: ${overFullSample}`)
}

console.log(
  bads.length
    ? `환자 입장 검사 — 문제 ${bads.length}종\n` + bads.slice(0, 25).map((b) => '■ ' + b).join('\n') +
      (bads.length > 25 ? `\n… 그 밖에 ${bads.length - 25}종` : '')
    : `환자 입장 검사 완료 — ${days}분이 하루씩 받아 보고 ${asked}번 여쭤봄 · ` +
      `하루 평균 ${avg.toFixed(1)}가지 (음식 ${items}건) · ` +
      `그중 ${(neutral / Math.max(1, items) * 100).toFixed(0)}% 는 이 암종에서 특별히 할 말이 없는 것 · ` +
      `빼 드린 것 ${removedSeen}건 중 ${(altRate * 100).toFixed(0)}% 에 대안 · ` +
      `한 끼가 아홉 가지를 넘은 날 ${(overRate * 100).toFixed(2)}%, 문제 없음`
)
if (bads.length) process.exitCode = 1
