/**
 * 원자료의 쉼표 숫자가 살아 있는가(2026-11-04).
 *
 * 원자료는 1,000 이 넘는 수에 쉼표를 넣는다. 빌드가 이것을 읽지 못해 33 칸 23,982 곳이 '값 없음' 이 되었고,
 * 제공량 칸은 쉼표 앞만 읽어 5 kg 포장이 '1회 5 g' 이 되어 있었다. 검사들은 값이 있는 행만 보았으므로 몰랐다.
 * sodium.ts 는 나트륨을 지킨다. 여기서는 모든 칸을 원자료와 다시 견준다.
 *
 * 쉼표 읽기를 빌드에서 빌려 오지 않는다. 여기서는 쉼표로 나눠 이어 붙인다.
 * 아래 표의 값은 원자료에서 눈으로 고른 것이다. 원자료를 새로 받으면 다시 보고 고친다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { AMT_MAP } from '../nutrient-map.mjs'

const ROOT = path.resolve(process.cwd())
type Packed = { cols: string[]; items: [string, number, number, number[], (number | null)[], string | 0, string | 0][] }
const read = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8')) as Packed
// 고치기 전 자료로 이 검사가 실패하는지 볼 수 있게 경로를 바꿀 수 있다
const ext = read(process.env.RAWNUM_EXT || path.join(ROOT, 'public/data/foods-extended.json'))
const core = read(process.env.RAWNUM_CORE || path.join(ROOT, 'src/data/foods/generated-core.json'))
const rows = [...ext.items, ...core.items]
const col = (c: string) => ext.cols.indexOf(c)
const val = (r: Packed['items'][number], c: string) => r[4][col(c)] ?? undefined

const bugs: string[] = []
const bad = (m: string) => bugs.push(m)

/* ── 1. 칸마다 1,000 을 넘는 값이 있는가. 쉼표 오류가 돌아오면 전부 999 에서 멈춘다 ── */
for (const c of ['na', 'k', 'ca', 'p', 'chol', 'vitK', 'mg', 'vitA', 'vitC', 'folate']) {
  const max = rows.reduce((m, r) => Math.max(m, val(r, c) ?? 0), 0)
  if (max < 1000) bad(`${c} 최댓값이 ${max} — 쉼표 숫자가 다시 빠지고 있다`)
}

/* ── 2. 눈으로 고른 진짜 큰 값은 그대로, 믿을 수 없는 값은 칸만 비었는가 ── */
const find = (name: string, maker = '') => rows.find((r) => r[0] === name && String(r[5]).includes(maker))
const KEEP: [string, string, string, number][] = [
  ['고춧잎_잎_말린것', '', 'vitK', 8702],
  ['다시마류,다시마,줄기,말린것', '', 'k', 7500],
  ['베이킹파우더', '', 'p', 9918],
  ['달걀, 난황, 가루', '', 'chol', 2295],
  ['대구류,대구,머리,말린것,수입', '', 'ca', 8800],
  ['브라질너트_말린것', '', 'se', 1917],
  ['리포좀 비타민C 비타민D 3000IU', '비타민마을', 'vitD', 7500],
  ['뉴칼', '풍림', 'ca', 30000]
]
for (const [name, maker, c, want] of KEEP) {
  const r = find(name, maker)
  if (!r) bad(`표의 제품이 없다: ${name}`)
  else if (val(r, c) !== want) bad(`${name} ${c} 가 ${val(r, c)} — ${want} 여야 한다`)
}
const BLANK: [string, string][] = [
  ['아이배냇 베베 라이스퍼프 오리지널', 'b1'],
  ['마이크로바이옴 M 다이어트', 'vitA'],
  ['서해 비타민C3000 커큐민 퀘르세틴', 'vitC'],
  ['정어리통조림', 'omega3'],
  ['락토소이 두유', 'omega3'],
  ['슬림 버니 쉐이크 제주 녹차 라떼', 'b2'],
  ['하니효소', 'b3']
]
for (const [name, c] of BLANK) {
  const r = find(name)
  if (!r) bad(`표의 제품이 없다: ${name} — 행이 빠지면 뒤 번호가 모두 밀린다`)
  else if (val(r, c) !== undefined) bad(`${name} ${c} 가 ${val(r, c)} — 믿을 수 없는 값이라 비어야 한다`)
}

/* ── 3. 100 g 안에 100 g 을 넘게 들 수 없다 ── */
const MG = ['na', 'k', 'ca', 'p', 'mg', 'fe', 'zn', 'chol', 'vitC', 'b1', 'b2', 'b3', 'b6', 'vitE']
for (const r of rows) {
  for (const c of MG) if ((val(r, c) ?? 0) > 100000) bad(`${r[0]} ${c} ${val(r, c)} mg — 100 g 을 넘는다`)
  if ((val(r, 'omega3') ?? 0) > 100) bad(`${r[0]} 오메가3 ${val(r, 'omega3')} g`)
}

/* ── 4. 원자료와 한 칸씩 견준다 ── */
const RAW = path.join(ROOT, 'data/raw')
if (fs.existsSync(RAW)) {
  const shipped = new Map<string, Packed['items'][number]>()
  const keyOf = (name: unknown, maker: unknown, no: unknown) => `${String(name).trim()}|${maker && maker !== 'null' ? maker : ''}|${no || ''}`
  for (const r of rows) { const k = keyOf(r[0], r[5] || '', r[6] || ''); if (!shipped.has(k)) shipped.set(k, r) }
  const usedKey = new Set<string>()
  const joined = (s: string) => Number(s.split(',').join(''))
  const tally: Record<string, { seen: number; same: number; blank: number; other: number }> = {}
  let servingSeen = 0, servingWrong = 0
  const wrong: string[] = []
  for (const f of fs.readdirSync(RAW).filter((x) => x.endsWith('.json'))) {
    for (const it of JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')) as Record<string, string>[]) {
      const k = keyOf(it.FOOD_NM_KR, it.MAKER_NM, it.ITEM_REPORT_NO)
      // 같은 이름·회사·번호가 여럿이면 어느 행이 실렸는지 알 수 없으니 처음 것만 본다
      if (usedKey.has(k)) continue
      usedKey.add(k)
      const r = shipped.get(k)
      if (!r) continue
      for (const [src, c] of Object.entries(AMT_MAP as Record<string, string>)) {
        const v = it[src]
        if (typeof v !== 'string' || !v.includes(',')) continue
        const t = (tally[c] ??= { seen: 0, same: 0, blank: 0, other: 0 })
        t.seen++
        const got = val(r, c)
        if (got === undefined) t.blank++
        else if (Math.abs(got - joined(v)) <= 1) t.same++
        else { t.other++; if (wrong.length < 6) wrong.push(`${r[0]} ${c} 원자료 ${v} / 앱 ${got}`) }
      }
      const z = it.Z10500
      if (typeof z === 'string' && z.includes(',')) {
        servingSeen++
        /* 쉼표 앞만 읽은 값이 아니어야 한다 — 1 kg 이 넘는 포장은 1회 섭취참고량을 쓰고, 그것이 없으면 100 g 이다 */
        const refs = (String(it.NUTRI_AMOUNT_SERVING ?? '').match(/[\d.]+/g) ?? []).map(Number)
        if (r[2] !== 100 && !refs.includes(r[2])) { servingWrong++; if (wrong.length < 6) wrong.push(`${r[0]} 제공량 원자료 ${z} / 앱 ${r[2]} g`) }
      }
    }
  }
  const list = Object.entries(tally)
  const sum = (key: 'seen' | 'same' | 'blank' | 'other', pick: (c: string) => boolean) => list.filter(([c]) => pick(c)).reduce((s, [, t]) => s + t[key], 0)
  const na = (c: string) => c === 'na'
  const not = (c: string) => c !== 'na'
  console.log(`  쉼표 칸 — 나트륨 ${sum('seen', na).toLocaleString()} (그대로 ${sum('same', na).toLocaleString()} · 비움 ${sum('blank', na)} · 다름 ${sum('other', na)})`)
  console.log(`  쉼표 칸 — 그 밖 ${sum('seen', not).toLocaleString()} (그대로 ${sum('same', not).toLocaleString()} · 비움 ${sum('blank', not)} · 다름 ${sum('other', not)})`)
  console.log(`  쉼표 제공량 ${servingSeen.toLocaleString()}행 중 100 g 이 아닌 것 ${servingWrong}`)
  if (sum('other', () => true) > 0) bad(`원자료와 다른 값: ${wrong.join(' ; ')}`)
  if (sum('blank', na) > 300) bad(`나트륨 쉼표 칸을 ${sum('blank', na)} 곳 비웠다 — 많아야 300 곳이어야 한다`)
  if (sum('blank', not) > 15) bad(`나트륨 외 쉼표 칸을 ${sum('blank', not)} 곳 비웠다 — 많아야 15 곳이어야 한다`)
  if (servingWrong > 0) bad(`쉼표 제공량을 잘못 읽었다: ${wrong.filter((w) => w.includes('제공량')).join(' ; ')}`)
  if (sum('seen', () => true) < 15000) bad(`견준 칸이 ${sum('seen', () => true)} 곳뿐 — 견주는 길이 고장 났을 수 있다`)
} else {
  console.log('  (원자료가 없어 한 칸씩 견주기는 건너뜀)')
}

console.log(`\n쉼표 숫자 검사 완료 — 문제 ${bugs.length}건`)
bugs.slice(0, 30).forEach((b) => console.log(' ■', b))
if (bugs.length) process.exit(1)
console.log('문제 없음')
