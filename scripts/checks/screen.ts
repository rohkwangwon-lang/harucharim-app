/**
 * 화면이 하기로 한 일을 하는가.
 *
 * 검사 열일곱 가지가 모두 엔진만 보고 있었다. 엔진은 옳은 식단을 내놓는데
 * 화면이 그것을 버리면 쓰시는 분께는 고장이다 — 실제로 그렇게 됐다.
 *
 * '보여 드린 상을 적어 둔다' 를 넣자, 상을 하나 보여 드릴 때마다 저장이 바뀌고,
 * 그 바뀜이 '조건이 달라졌다' 로 읽혀 방금 만든 안이 곧바로 버려졌다.
 * '다시 구성' 을 눌러도 아무 일이 없었다. 엔진 검사는 모두 통과했다 —
 * buildDayMenu 는 잘 돌고 있었고, 그 결과를 화면이 내다 버렸을 뿐이다.
 *
 * 화면의 판단을 순수 함수(menuConditionKey)로 꺼내 두고 여기서 따진다.
 */
import { buildDayMenu, recentFoods } from '../../src/engine/menu'
import { menuConditionKey } from '../../src/lib/menuIdentity'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { MEAL_SLOTS } from '../../src/data/types'
import type { PatientContext, SelectedItem } from '../../src/data/types'

const bugs: string[] = []
const bad = (k: string, d: string) => bugs.push(`${k} :: ${d}`)

const patient: PatientContext = {
  ...DEFAULT_PATIENT, onboarded: true, cancer: 'breast', phase: 'post_op',
  sex: 'F', age: 58, weightKg: 62, heightCm: 158,
  conditions: [], medications: [], cuisines: ['한식']
}
const DAY = '2026-08-27'
const YESTERDAY = '2026-08-26'

const key = (
  p: PatientContext, sel: SelectedItem[], supps: string[], day: string,
  diary: Record<string, SelectedItem[]>, shown: Record<string, string[]>
) => menuConditionKey(p, sel, supps, day, recentFoods(diary, day, undefined, shown))

/* ── 1. 오늘 보여 드린 상을 적어 두어도 '조건이 달라졌다' 가 되면 안 된다 ── */
{
  const menu = buildDayMenu([], patient, { day: DAY })
  const ids = MEAL_SLOTS.flatMap((s) => menu.meals[s].map((e) => e.food.id))

  const before = key(patient, [], [], DAY, {}, {})
  const after = key(patient, [], [], DAY, {}, { [DAY]: ids })
  if (before !== after)
    bad('오늘 보여 드린 것을 적었더니 조건이 달라진 것으로 읽힘',
      '이러면 다시 구성을 눌러도 새 안이 곧바로 버려진다')

  /* 두 번째 안으로 바꿔 적어도 마찬가지 */
  const second = buildDayMenu([], patient, { day: DAY, nonce: 1 })
  const ids2 = MEAL_SLOTS.flatMap((s) => second.meals[s].map((e) => e.food.id))
  if (key(patient, [], [], DAY, {}, { [DAY]: ids2 }) !== before)
    bad('다시 구성한 안을 적었더니 조건이 달라진 것으로 읽힘', '앞뒤로 오갈 수 없게 된다')
}

/* ── 2. 빈 목록을 새로 만들어 넘겨도 달라진 것이 아니다 ── */
{
  const a = key(patient, [], [], DAY, {}, {})
  const b = key(patient, [], [], DAY, {}, {})
  if (a !== b) bad('같은 조건인데 잣대가 다름', '껍데기로 견주고 있다는 뜻이다')
  /* 담으신 것의 차례만 다른 경우 */
  const s1: SelectedItem[] = [{ foodId: 'x', servings: 1, meal: '아침' }, { foodId: 'y', servings: 1, meal: '점심' }]
  const s2: SelectedItem[] = [s1[1], s1[0]]
  if (key(patient, s1, [], DAY, {}, {}) !== key(patient, s2, [], DAY, {}, {}))
    bad('담은 차례만 바뀌었는데 달라진 것으로 읽힘', '같은 식단이다')
}

/* ── 3. 진짜로 달라졌을 때는 달라진 것으로 읽혀야 한다 ── */
{
  const base = key(patient, [], [], DAY, {}, {})
  const cases: [string, string][] = [
    ['날짜가 바뀜', key(patient, [], [], '2026-08-28', {}, {})],
    ['암종이 바뀜', key({ ...patient, cancer: 'stomach' }, [], [], DAY, {}, {})],
    ['시기가 바뀜', key({ ...patient, phase: 'during_chemo' }, [], [], DAY, {}, {})],
    ['증상이 생김', key({ ...patient, conditions: ['오심·구토'] }, [], [], DAY, {}, {})],
    ['체중이 바뀜', key({ ...patient, weightKg: 70 }, [], [], DAY, {}, {})],
    ['약이 바뀜', key({ ...patient, medications: ['warfarin'] }, [], [], DAY, {}, {})],
    ['식성이 바뀜', key({ ...patient, cuisines: ['한식', '일식'] }, [], [], DAY, {}, {})],
    ['식단에 담으심', key(patient, [{ foodId: 'rice', servings: 1, meal: '아침' }], [], DAY, {}, {})],
    ['영양제가 바뀜', key(patient, [], ['vitd'], DAY, {}, {})],
    ['어제 드신 기록이 생김', key(patient, [], [], DAY, { [YESTERDAY]: [{ foodId: 'gg', servings: 1 }] }, {})],
    ['어제 보여 드린 것이 생김', key(patient, [], [], DAY, {}, { [YESTERDAY]: ['gg'] })]
  ]
  for (const [what, k] of cases)
    if (k === base) bad('달라졌는데 같은 것으로 읽힘', what)
}

/* ── 4. '다시 구성' 이 실제로 다른 상을 내놓는가 ── */
{
  const first = buildDayMenu([], patient, { day: DAY, nonce: 0 })
  const ids = (m: typeof first) => MEAL_SLOTS.flatMap((s) => m.meals[s].map((e) => e.food.id))
  const a = ids(first)
  /* 화면은 앞 안의 열량 큰 두 가지를 피하도록 넘긴다 — 그 방식 그대로 흉내 낸다 */
  const avoid = new Map(recentFoods({}, DAY))
  for (const id of a.slice(0, 2)) avoid.set(id, 0)
  const second = buildDayMenu([], patient, { day: DAY, nonce: 1, recent: avoid })
  const b = ids(second)
  const same = a.filter((x) => b.includes(x)).length
  const ratio = same / Math.max(1, a.length)
  console.log(`  다시 구성 — ${a.length}가지 중 ${same}가지가 그대로 (${Math.round(ratio * 100)}%)`)
  if (ratio > 0.7) bad('다시 구성해도 거의 그대로', `${Math.round(ratio * 100)}% 가 같다`)
}

console.log(`\n화면 검사 완료 — 문제 ${bugs.length}종`)
for (const b of bugs) console.log('■', b.split(' :: ')[0], '\n   -', b.split(' :: ')[1])
if (!bugs.length) console.log('문제 없음')
