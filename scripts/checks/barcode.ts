/**
 * 네 번째 검사 — 바코드.
 *
 * 스캐너가 돌려주는 표기는 기기마다 다르다. 표에 있는데도 못 찾는 일이
 * 없는지, 그리고 표 자체가 성한지를 본다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const bar: { b: string; n: string; p: string }[] =
  JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/barcodes.json'), 'utf8'))
const core = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/foods/generated-core.json'), 'utf8'))
const ext = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/foods-extended.json'), 'utf8'))

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

/** foodStore.ts 의 barcodeVariants 와 같은 규칙 */
function variants(raw: string): string[] {
  const code = String(raw).replace(/\D/g, '')
  if (!code) return []
  const out = [code]
  if (code.length === 13 && code.startsWith('0')) out.push(code.slice(1))
  if (code.length === 12) out.push('0' + code)
  if (code.length === 13 && code.startsWith('00000')) out.push(code.slice(5))
  if (code.length === 8) out.push(code.padStart(13, '0'))
  return [...new Set(out)]
}

/* ── 1. 표 자체의 무결성 ───────────────────────────── */
const index = new Map<string, { b: string; n: string; p: string }>()
for (const r of bar) {
  if (!r.b) { bad('바코드 없음', JSON.stringify(r).slice(0, 60)); continue }
  if (!/^\d{8,14}$/.test(r.b)) bad('바코드 표기 이상', `${r.b} (${r.p})`)
  if (index.has(r.b)) bad('중복 바코드', `${r.b}`)
  index.set(r.b, r)
  if (!r.p?.trim()) bad('제품명 없음', r.b)
  if (r.n === undefined || r.n === null) bad('보고번호 항목 없음', r.b)
}
console.log(`  바코드 ${bar.length.toLocaleString()}건 · 고유 ${index.size.toLocaleString()}건`)

/* ── 2. 스캐너 표기 흔들림을 견디는가 ───────────────── */
let seed = 31337
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const lookup = (raw: string) => {
  for (const v of variants(raw)) { const hit = index.get(v); if (hit) return hit }
  return undefined
}

const sample = Array.from({ length: 4000 }, () => bar[Math.floor(rnd() * bar.length)])
let tried = 0, missed = 0
for (const r of sample) {
  // 스캐너가 돌려줄 법한 표기들
  const forms = [r.b, ` ${r.b} `, r.b.replace(/(\d{4})/, '$1 ')]
  if (r.b.length === 12) forms.push('0' + r.b)
  if (r.b.length === 13 && r.b.startsWith('0')) forms.push(r.b.slice(1))
  for (const f of forms) {
    tried++
    const hit = lookup(f)
    if (!hit) { missed++; bad('표기가 흔들리면 못 찾음', `${r.p?.slice(0, 20)} — 표 ${r.b} vs 스캔 ${f}`) }
    else if (hit.b !== r.b && hit.p !== r.p) bad('다른 제품으로 잘못 찾음', `${f} → ${hit.p}`)
  }
}
console.log(`  표기 변형 ${tried.toLocaleString()}회 조회 — 실패 ${missed}`)

/* ── 3. 영양성분 연결이 올바른가 ───────────────────── */
const rep = new Map<string, string>()
for (const p of [core, ext]) for (const row of p.items) if (row[6]) if (!rep.has(String(row[6]))) rep.set(String(row[6]), row[0])
let linked = 0
for (const r of bar) if (rep.has(String(r.n))) linked++
console.log(`  영양성분 연결 ${linked.toLocaleString()}건 (${(linked / bar.length * 100).toFixed(1)}%)`)

// 연결된 것이 엉뚱한 제품에 붙지 않았는지 표본 확인
const norm = (s: string) => String(s).toLowerCase().replace(/[^0-9a-z가-힣]/g, '')
let checked = 0, odd = 0
for (const r of bar) {
  if (!rep.has(String(r.n))) continue
  if (rnd() > 0.02) continue
  checked++
  const foodName = rep.get(String(r.n))!
  const a = norm(r.p), b = norm(foodName)
  // 이름이 전혀 겹치지 않으면 의심스럽다 (같은 보고번호의 다른 용량 표기는 정상)
  if (a.length >= 3 && b.length >= 3 && !a.includes(b.slice(0, 3)) && !b.includes(a.slice(0, 3))) odd++
}
console.log(`  연결 표본 ${checked}건 중 이름이 전혀 안 겹치는 것 ${odd}건 (${checked ? (odd / checked * 100).toFixed(0) : 0}%)`)

/* ── 4. 없는 바코드는 조용히 없다고 해야 한다 ───────── */
for (let i = 0; i < 500; i++) {
  const fake = String(Math.floor(rnd() * 9e12) + 1e12)
  if (index.has(fake)) continue
  const hit = lookup(fake)
  if (hit) bad('없는 바코드가 찾아짐', `${fake} → ${hit.p}`)
}

console.log(`\n바코드 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 4).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
