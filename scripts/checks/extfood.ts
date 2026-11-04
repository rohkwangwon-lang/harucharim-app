/**
 * 내려받은 시판 식품(kx-번호)이 담은 뒤에도 보이는가(2026-11-04).
 *
 * 찾기·바코드로 담으면 '담았습니다' 라고 해 놓고 목록과 합계에서 사라졌다. 음식을 찾는 표(FOOD_BY_ID)에
 * 시판 27만 종이 없었기 때문이다. 나트륨 614 mg 짜리 국수를 담아도 화면에는 0 mg '적정' 이었다.
 *
 *   1. 담으면 합계·나트륨·판정·식단에 들어간다
 *   2. 앱을 다시 열어도(사본에서) 남고, 사본에 쓰레기가 있어도 던지지 않는다
 *   3. 저장소의 값이 고쳐지면 따라가되, 번호가 밀려 이름이 달라지면 따라가지 않는다
 *   4. 담는 길이 실제로 사본을 적는다 — 화면 코드를 읽어 본다
 *
 * 저장소(IndexedDB)를 실제로 읽는 길은 화면에서 확인했다. 여기서는 그 결과를 넣어 판단만 본다.
 */
import { readFileSync } from 'node:fs'
import { FOOD_BY_ID, MISSING_FOOD_NAME } from '../../src/data/foods'
import { rowToFood, type PackedFoods } from '../../src/data/foods/generated'
import type { Food, PatientContext, SelectedItem } from '../../src/data/types'
import { buildDayMenu, naUnknownNames } from '../../src/engine/menu'
import { foodContribution, sumIntake } from '../../src/engine/nutrition'
import { evaluateSelection } from '../../src/engine/rules'
import {
  applyFreshExtFoods, cleanExtFood, extIdsIn, loadSavedExtFoods, missingFoodNote, pruneExtFoods, rememberExtFood
} from '../../src/lib/extFoods'
import { DEFAULT_PATIENT } from '../../src/lib/store'

const bads: string[] = []
const no = (cond: boolean, msg: string) => { if (cond) bads.push(msg) }

/* localStorage 흉내 */
const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) }
}
const KEY = 'harucharim.extFoods.v1'
/** 앱을 끄고 다시 연 셈 — 메모리에 올라간 것을 지운다 */
const closeApp = () => { for (const id of Object.keys(FOOD_BY_ID)) if (id.startsWith('kx-')) delete FOOD_BY_ID[id] }

/* 자료 모양이 바뀌면 함께 걸리도록 실제 한 줄 푸는 함수로 만든다 */
const cols = ['kcal', 'carb', 'protein', 'fat', 'na']
const schema = { cols, groups: ['밥·면·죽 요리'], tags: [] as string[] }
type Row = PackedFoods['items'][number]
const row = (name: string, kcal: number, na: number | null, g = 100): Row => [name, 0, g, [], [kcal, 20, 7, 3, na], '시험식품', '123']
const noodle = rowToFood(row('시험초계국수', 115, 614), schema, 'kx-240025')
const noNa = rowToFood(row('시험액젓', 40, null), schema, 'kx-219313')

const patient: PatientContext = { ...DEFAULT_PATIENT, onboarded: true }
const items: SelectedItem[] = [{ foodId: noodle.id, servings: 1, meal: '점심' }]

/* ── 1. 담기 전은 재현, 담은 뒤는 합계 ───────────────── */
no(sumIntake(items, []).kcal !== undefined, '담기 전 표에 있으면 이 시험은 재현이 아니다')

rememberExtFood(noodle)
rememberExtFood(noNa)
{
  const t = sumIntake(items, [])
  no(t.kcal !== 115, `담은 뒤 열량 ${t.kcal} — 115 kcal 이어야`)
  no(t.na !== 614, `담은 뒤 나트륨 ${t.na} — 614 mg 이어야`)
  const v = evaluateSelection(items, patient).verdicts
  no(v.length !== 1 || v[0].food.id !== noodle.id, '판정 목록에 담은 제품이 없다')
  const m = buildDayMenu(items, patient, { supplements: [], day: '2026-11-04', recent: new Map() })
  no(!m.meals['점심'].some((e) => e.food.id === noodle.id && e.origin !== 'added'), '하루 식단의 점심에 담은 제품이 없다')
  no(!naUnknownNames([{ foodId: noNa.id, servings: 1, meal: '점심' }]).includes('시험액젓'), '나트륨 값 없는 시판 제품이 "빠진 값" 안내에 없다')
}

/* ── 2. 다시 열어도 남는다 ───────────────────────────── */
closeApp()
no(sumIntake(items, []).kcal !== undefined, '시험 준비 — 끈 뒤에도 메모리에 남아 있다')
loadSavedExtFoods()
no(sumIntake(items, []).na !== 614, '다시 연 뒤 나트륨이 사라졌다')
no(FOOD_BY_ID[noodle.id]?.name !== '시험초계국수', '다시 연 뒤 이름이 사라졌다')
{
  const before = foodContribution(noodle, 2).na
  no(foodContribution(FOOD_BY_ID[noodle.id], 2).na !== before, '다시 연 뒤 인분 계산이 달라졌다')
}

/* 망가진 사본 */
for (const [what, raw] of [
  ['문자열', 'x'], ['null', null], ['목록', []], ['이름 없음', { ...noodle, name: '' }],
  ['양이 0', { ...noodle, serving: { g: 0, label: 'x' } }], ['양이 글자', { ...noodle, serving: { g: '100', label: 'x' } }],
  ['성분 없음', { ...noodle, per100: null }], ['태그 없음', { ...noodle, tags: 'x' }]
] as [string, unknown][]) {
  no(cleanExtFood('kx-1', raw) !== null, `망가진 사본을 받았다 — ${what}`)
}
{
  const c = cleanExtFood('kx-1', { ...noodle, id: 'rice', per100: { kcal: 'NaN', na: Number.NaN, protein: -1, fat: 3 } })
  no(c?.id !== 'kx-1', '사본 안의 id 를 그대로 믿었다')
  no(c?.per100.na !== undefined || c?.per100.protein !== undefined, '이상한 성분값을 남겼다')
  no(c?.per100.kcal !== 0 || c?.per100.fat !== 3, '성한 값을 잃었거나 열량을 채우지 않았다')
}
const curatedId = Object.keys(FOOD_BY_ID).find((id) => !id.startsWith('kx-') && !id.startsWith('kf-'))!
const curatedName = FOOD_BY_ID[curatedId].name
no(cleanExtFood(curatedId, { ...noodle }) !== null, '앱에 든 음식 id 로 사본을 받았다')
rememberExtFood({ ...noodle, id: curatedId, name: '덮어쓰기' })
no(FOOD_BY_ID[curatedId].name !== curatedName, '앱에 든 음식을 덮어썼다')

for (const junk of ['{', 'null', '[]', '{"kx-5":3,"rice":{}}']) {
  closeApp()
  mem.set(KEY, junk)
  let threw = false
  try { loadSavedExtFoods() } catch { threw = true }
  no(threw, `사본이 ${junk} 일 때 던졌다`)
  no(Object.keys(FOOD_BY_ID).some((id) => id === 'kx-5'), `사본 ${junk} 에서 쓰레기를 올렸다`)
}
mem.delete(KEY)
closeApp()

/* 담았다 뺀 것은 덜어 낸다 */
rememberExtFood(noodle)
rememberExtFood(noNa)
pruneExtFoods({ '2026-11-04': items })
{
  const saved = JSON.parse(mem.get(KEY) ?? '{}') as Record<string, Food>
  no(!saved[noodle.id], '기록에 있는 사본을 지웠다')
  no(!!saved[noNa.id], '기록에 없는 사본이 남았다')
}
no(extIdsIn({ a: [...items, { foodId: 'rice', servings: 1 }, { foodId: noodle.id, servings: 2, meal: '저녁' }] }).join() !== noodle.id, 'kx- 만 한 번씩 모으지 못했다')

/* ── 3. 고쳐진 값은 따라가고, 다른 제품은 따라가지 않는다 ── */
closeApp()
mem.delete(KEY)
rememberExtFood(noNa)
{
  const fixed = rowToFood(row('시험액젓', 40, 7000), schema, noNa.id)
  no(applyFreshExtFoods(new Map([[noNa.id, fixed]])).join() !== noNa.id, '고쳐진 값을 알리지 않았다')
  no(FOOD_BY_ID[noNa.id].per100.na !== 7000, '고쳐진 나트륨을 따라가지 않았다')
  closeApp()
  loadSavedExtFoods()
  no(FOOD_BY_ID[noNa.id]?.per100.na !== 7000, '고쳐진 값이 사본에 적히지 않았다')
  no(applyFreshExtFoods(new Map([[noNa.id, fixed]])).length !== 0, '같은 값인데 달라졌다고 했다 — 열 때마다 다시 그린다')

  const other = rowToFood(row('전혀다른간장', 90, 6000), schema, noNa.id)
  no(applyFreshExtFoods(new Map([[noNa.id, other]])).length !== 0, '번호가 밀린 다른 제품을 올렸다')
  no(FOOD_BY_ID[noNa.id].name !== '시험액젓', '번호가 밀렸는데 기록이 다른 제품으로 바뀌었다')

  /* 사본 없는 예전 기록 — 이 수정 전에 담은 것도 되살린다 */
  closeApp()
  mem.delete(KEY)
  const legacy = rowToFood(row('예전에담은것', 200, 300), schema, 'kx-7')
  no(applyFreshExtFoods(new Map([[legacy.id, legacy]])).join() !== 'kx-7', '예전 기록을 되살리지 못했다')
  no(sumIntake([{ foodId: 'kx-7', servings: 1, meal: '아침' }], []).kcal !== 200, '되살린 예전 기록이 합계에 없다')
}

/* 끝내 못 찾는 음식 — 숨기지 않는다 */
closeApp()
{
  const lost: SelectedItem[] = [{ foodId: 'kx-999', servings: 1, meal: '점심' }]
  no(!naUnknownNames(lost).includes(MISSING_FOOD_NAME), '찾지 못한 음식이 나트륨 "빠진 값" 안내에 없다')
  no(!missingFoodNote('kx-999').includes('받고'), '시판 식품인데 되찾는 길을 말하지 않는다')
  no(missingFoodNote('old-food').includes('받고'), '앱에서 없어진 음식에 받으면 돌아온다고 한다')
  no(evaluateSelection(lost, patient).verdicts.length !== 0, '찾지 못한 음식에 판정을 냈다')
}

/* ── 4. 화면 코드 — 담는 길이 사본을 적고, 다시 여는 길이 읽는가 ── */
{
  const search = readFileSync('src/components/FoodSearch.tsx', 'utf-8')
  no(!/rememberExtFood\(detail\)\s*\n\s*onAdd\(detail\.id/.test(search), 'FoodSearch 가 담기 직전에 rememberExtFood 를 부르지 않는다')
  const store = readFileSync('src/lib/store.ts', 'utf-8')
  no(!/loadSavedExtFoods\(\)\s*\n\s*const restored = restoreState/.test(store), 'store.ts 가 기록을 읽기 전에 사본을 올리지 않는다')
  no(!store.includes('refreshExtFoods(state.diary)'), 'store.ts 가 저장소와 맞추지 않는다')
  /* 찾지 못한 음식을 말없이 건너뛰는 자리가 끼니 목록에 돌아오면 안 된다 */
  const today = readFileSync('src/components/TodayMeals.tsx', 'utf-8')
  no(/items\.map\(\(item\) => \{\s*const food = FOOD_BY_ID\[item\.foodId\]\s*if \(!food\) return null/.test(today), 'TodayMeals 끼니 목록이 찾지 못한 음식을 숨긴다')
  const diary = readFileSync('src/components/Diary.tsx', 'utf-8')
  no(/const f = FOOD_BY_ID\[i\.foodId\]\s*if \(!f\) return null/.test(diary), 'Diary 가 찾지 못한 음식을 숨긴다')
}

if (bads.length) {
  console.error(`실패 ${bads.length}건`)
  for (const b of bads) console.error(' -', b)
  process.exit(1)
}
console.log('통과 — 시판 식품: 담기·합계·다시 열기·값 갱신·번호 밀림·찾지 못한 음식')
