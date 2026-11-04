/**
 * 네 번째 검사 — 바코드.
 *
 * 스캐너가 돌려주는 표기는 기기마다 다르다. 표에 있는데도 못 찾는 일이
 * 없는지, 그리고 표 자체가 성한지를 본다.
 */
import fs from 'node:fs'
import { envSeed } from './_seed'
import path from 'node:path'
import { productSearchTerm, scanOutcome, squeezedName } from '../../src/lib/barcodeOutcome'
import { foodTokens } from '../../src/lib/foodStore'

const ROOT = path.resolve(process.cwd())
const bar: { b: string; n: string; p: string; old?: number; lk?: string; o?: string; c?: string }[] =
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
let seed = envSeed(31337)
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

/* ── 4. 끝난 등록은 반드시 표시되어야 한다 ─────────── */
{
  const stale = bar.filter((r) => r.old === 1)
  const live = bar.filter((r) => r.old !== 1)
  console.log(`  끝난 등록 ${stale.length.toLocaleString()}건 · 살아 있는 등록 ${live.length.toLocaleString()}건`)
  if (stale.length === 0) bad('끝난 등록이 하나도 표시되지 않음', '유효기간 정보를 못 받아 온 것일 수 있다')
  // 절반을 넘으면 표시가 잘못 붙은 것이다
  if (stale.length > bar.length * 0.6) bad('끝난 등록 비율이 지나치게 높음', `${(stale.length / bar.length * 100).toFixed(0)}%`)
  // 같은 바코드에 살아 있는 등록이 있는데도 끝난 쪽이 뽑혔는지
  const liveCodes = new Set(live.map((r) => r.b))
  for (const r of stale) if (liveCodes.has(r.b)) bad('살아 있는 등록을 두고 끝난 쪽을 골랐다', r.b)
}

/* ── 5. 없는 바코드는 조용히 없다고 해야 한다 ───────── */
for (let i = 0; i < 500; i++) {
  const fake = String(Math.floor(rnd() * 9e12) + 1e12)
  if (index.has(fake)) continue
  const hit = lookup(fake)
  if (hit) bad('없는 바코드가 찾아짐', `${fake} → ${hit.p}`)
}

/* ── 6. 영양까지 이어지는 비율이 낮으면 '베타' 로 적어야 한다 ─────
 *
 * 23만 건이라는 숫자만 보면 무엇이든 찍으면 나올 것 같다. 2026-09-11 에 한 건씩 세어 보니
 * 영양성분까지 이어지는 것은 28 %(살아 있는 등록 기준 31 %)였고, 나머지는 제품명만 나왔다.
 * 그 상태로 "바코드 검색" 이라고만 적으면 과장이다. 비율은 자료에서 세고, 표시는 화면에서 본다.
 */
{
  const rn = new Set(ext.items.map((r: unknown[]) => String(r[6] ?? '')))
  const live = bar.filter((r) => r.old !== 1)
  // 먼저 물어보는 'similar' 는 세지 않는다 — 제 제품의 값이라고 말할 수 있는 것만 비율에 넣는다
  const linked = live.filter((r) => rn.has(String(r.n)) && r.lk !== 'similar').length
  const rate = live.length ? linked / live.length : 0
  console.log(`  살아 있는 등록 중 값을 바로 보여 주는 것 ${(rate * 100).toFixed(1)}% (${linked.toLocaleString()} / ${live.length.toLocaleString()})`)
  /* 화면에 적은 비율이 자료와 어긋나지 않게 — 2026-11-04 에 31 → 19 % 로 바뀌었다 */
  for (const f of ['src/components/BarcodeScanner.tsx', 'src/components/DataManager.tsx', 'src/components/HowTo.tsx', 'src/components/ui.tsx']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
    const said = [...src.matchAll(/나오는[^\n]{0,20}약 (\d+) %/g)].map((m) => Number(m[1]))
    if (!said.length) bad('비율 문구를 찾지 못함', f)
    for (const v of said) if (Math.abs(v - rate * 100) > 5) bad('화면의 비율이 자료와 다름', `${f} 약 ${v} % / 실제 ${(rate * 100).toFixed(1)} %`)
  }
  if (rate < 0.15) bad('값을 보여 주는 비율이 지나치게 낮음', `${(rate * 100).toFixed(1)}% — 잇기가 고장 났을 수 있다`)
  const BETA_BELOW = 0.8
  if (rate < BETA_BELOW) {
    for (const [f, what] of [
      ['src/components/FoodSearch.tsx', '찾기 화면의 바코드 단추'],
      ['src/components/Supplements.tsx', '영양제 화면의 바코드 단추'],
      ['src/components/BarcodeScanner.tsx', '스캐너 화면']
    ] as const) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
      if (!/<BetaChip\b/.test(src)) bad('베타 표시 없음', `${what} — 영양까지 이어지는 것이 ${(rate * 100).toFixed(0)}% 인데 다 되는 것처럼 보인다`)
    }
    for (const f of ['src/components/PatientPanel.tsx', 'src/components/HowTo.tsx', 'docs/출시/스토어-등록-자료.md']) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
      if (!/바코드[^\n]{0,12}베타/.test(src)) bad('베타 표시 없음', f)
    }
    const dm = fs.readFileSync(path.join(ROOT, 'src/components/DataManager.tsx'), 'utf8')
    if (/모두 찾을 수 있습니다/.test(dm)) bad('과장', 'DataManager — 바코드로 "모두 찾을 수 있습니다"')
  } else {
    console.log(`  영양까지 이어지는 비율이 ${BETA_BELOW * 100}% 를 넘었다 — 베타 표시를 떼도 된다`)
  }
}

/* ── 7. 이름으로 잇되 다른 회사 값을 보여 주지 않는다 (2026-11-04) ─────
 *
 * 이름만 같으면 잇던 시절 82 % 가 다른 회사 값이었다. 위 3번은 이름만 견주므로 이름으로 이은 것은
 * 무조건 통과한다 — 이 문제를 못 잡은 까닭이다. 회사 비교는 빌드와 일부러 다른 방식으로 적는다
 * (빌드는 표기를 고쳐 포함 여부를 본다. 여기서는 공통으로 든 글자 조각을 찾는다).
 */
{
  const firstRow = new Map<string, unknown[]>()
  for (const row of ext.items as unknown[][]) { const k = String(row[6] ?? ''); if (k && !firstRow.has(k)) firstRow.set(k, row) }
  const LEGAL = /주식회사|유한회사|농업회사법인|어업회사법인|영농조합법인|영어조합법인|협동조합|\([^)]*\)|㈜|공장|지점/g
  const bare = (s: unknown) => String(s ?? '').normalize('NFKC').toLowerCase().replace(LEGAL, '').replace(/[^0-9a-z가-힣]/g, '')
  const shareThree = (a: string, b: string) => { for (let i = 0; i + 3 <= a.length; i++) if (b.includes(a.slice(i, i + 3))) return true; return false }
  const sameFirm = (r: (typeof bar)[number], row: unknown[]) => {
    const nos = String(row[6]).split('/').map((x) => x.trim().slice(0, 11))
    if (r.o && r.o.length >= 12 && nos.includes(r.o.slice(0, 11))) return true
    const a = bare(r.c), b = bare(row[5])
    return a === b || shareThree(a, b)
  }
  const named = bar.filter((r) => r.lk === 'maker' || r.lk === 'similar')
  const strangers = named.filter((r) => { const row = firstRow.get(r.n); return !row || !sameFirm(r, row) })
  const share = named.length ? strangers.length / named.length : 0
  console.log(`  이름으로 이은 ${named.length.toLocaleString()}건 중 회사가 안 겹치는 것 ${strangers.length}건 (${(share * 100).toFixed(2)}%)`)
  if (share > 0.02) strangers.slice(0, 8).forEach((r) => bad('이름으로 이었는데 다른 회사', `${r.p} [${r.c}] → ${String(firstRow.get(r.n)?.[5])}`))
  if (named.some((r) => !r.c && !(r.o && r.o.length >= 12))) bad('이름으로 이었는데 회사도 번호도 없음', '근거 없이 이었다')

  /* 표시 없이 값이 이어진 것은 원본 등록의 번호 그대로여야 한다 — 몰래 번호를 바꾸는 길이 되살아나면 여기서 걸린다 */
  const dirs = ['data/raw-barcode', 'data/raw-barcode-i2570'].map((d) => path.join(ROOT, d)).filter((d) => fs.existsSync(d))
  if (dirs.length) {
    const pairs = new Set<string>()
    for (const d of dirs) for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.json'))) {
      for (const r of JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) as { b: string; n: string }[]) {
        for (const code of String(r.b).split(/[\n\r,;]+/)) pairs.add(`${code.replace(/\D/g, '')}|${r.n}`)
      }
    }
    const sneaked = bar.filter((r) => !r.lk && firstRow.has(r.n) && !pairs.has(`${r.b}|${r.n}`))
    console.log(`  표시 없이 번호가 바뀐 것 ${sneaked.length}건`)
    sneaked.slice(0, 5).forEach((r) => bad('표시 없이 번호가 바뀜', `${r.b} ${r.p} → ${r.n}`))
  } else console.log('  (원본 바코드 자료가 없어 번호 대조는 건너뜀)')

  /* 실제로 틀렸던 것 — 고쳐진 채로 있는가. 값이 나와야 할 것이 사라지는 쪽도 함께 본다 */
  const byCode = new Map(bar.map((r) => [r.b, r]))
  const makerOf = (b: string) => { const r = byCode.get(b); return r ? firstRow.get(r.n)?.[5] : undefined }
  for (const [b, firm, was] of [
    ['8806371301195', '푸르밀', '명품디저트 403 kcal'],
    ['8801045082592', '오뚜기', '뜨레봄 438 kcal'],
    ['8809288521083', '스위트코리아', '영동식품 466 kcal'],
    ['8801062629497', '롯데', '빼빼로 — 같은 회사라 값이 나와야 한다']
  ] as const) {
    if (!String(makerOf(b) ?? '').includes(firm)) bad('다른 회사 값이 되살아남', `${b} → ${String(makerOf(b))} (예전: ${was})`)
  }
  if (makerOf('8809051050147') !== undefined) bad('다른 회사 값이 되살아남', '까나리액젓(곰소항식품) → 나트륨 0 인 기림 값')

  /* 무엇을 보여 줄지의 판단 — 양쪽 방향 */
  const cases: [Parameters<typeof scanOutcome>[0], ReturnType<typeof scanOutcome>][] = [
    [{ hasFood: true }, 'detail'],
    [{ hasFood: true, similar: true }, 'similar'],
    [{ hasFood: true, stale: true }, 'stale'],
    [{ hasFood: true, similar: true, stale: true }, 'stale'],
    [{ hasFood: false }, 'no-nutrition'],
    [{ hasFood: true, linkedByUser: true }, 'detail'],
    [{ hasFood: false, stale: true }, 'stale']
  ]
  for (const [hit, want] of cases) if (scanOutcome(hit) !== want) bad('스캔 판단', `${JSON.stringify(hit)} → ${scanOutcome(hit)} (기대 ${want})`)
  const fs2 = fs.readFileSync(path.join(ROOT, 'src/components/FoodSearch.tsx'), 'utf8')
  if (!/scanOutcome\(/.test(fs2)) bad('화면이 스캔 판단을 쓰지 않음', 'FoodSearch')
  if (/have\.has\(f\.name\)/.test(fs2)) bad('같은 이름 다른 회사가 한 줄로 합쳐짐', '회사를 보고 고를 수 없다')

  /* 값을 끊은 제품은 이름으로 찾아져야 한다. 찾기 칸에 넣는 말로 실제 색인을 훑어 본다 */
  const oldNorm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\d+\s*(g|kg|ml|mL|L|개입|입|매|팩|봉|캔|병)\b/gi, ' ').replace(/[^0-9a-z가-힣]/g, '')
  const names = new Set((ext.items as unknown[][]).map((row) => oldNorm(String(row[0]))).filter((k) => k.length >= 3))
  const toks = [...new Set((ext.items as unknown[][]).flatMap((row) => foodTokens(String(row[0]))))].sort()
  const hasPrefix = (q: string) => { let lo = 0, hi = toks.length; while (lo < hi) { const m = (lo + hi) >> 1; if (toks[m] < q) lo = m + 1; else hi = m } return lo < toks.length && toks[lo].startsWith(q) }
  const cut = bar.filter((r) => !r.lk && !firstRow.has(r.n) && !r.old && names.has(oldNorm(r.p)))
  const lost = cut.filter((r) => { const q = productSearchTerm(r.p).toLowerCase(); return !hasPrefix(q) && !hasPrefix(squeezedName(q)) })
  console.log(`  값을 끊은 현행 ${cut.length.toLocaleString()}건 중 이름으로 못 찾는 것 ${lost.length}건`)
  if (lost.length > cut.length * 0.01) lost.slice(0, 6).forEach((r) => bad('값을 끊었는데 이름으로도 못 찾음', `${r.p} → ‘${productSearchTerm(r.p)}’`))
}

console.log(`\n바코드 검사 완료 — 문제 ${bugs.length}종`)
const g = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!g.has(k)) g.set(k, []); g.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, l] of [...g].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`■ ${k} (${l.length}종)`); l.slice(0, 4).forEach((d) => console.log('   -', d))
}
if (!bugs.length) console.log('문제 없음')
