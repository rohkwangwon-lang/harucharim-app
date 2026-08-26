/**
 * 저장소 옮기기 — 대규모 무작위 시험.
 *
 * 이름을 바꾸면서 저장소 열쇠도 함께 바뀌었다.
 * 이 앱의 건강 정보는 전부 기기 안에만 있고 서버에 사본이 없으므로,
 * 옮기다 하나라도 놓치면 그 분의 설정·식단·체중이 조용히 사라진다.
 * 화면에는 오류가 뜨지 않고 그냥 처음 설정부터 다시 나온다.
 *
 * 한 번 손으로 확인한 것으로는 모자란다.
 * 사람마다 저장된 것이 다르고(로그인만 한 분, 석 달 치 기록이 있는 분,
 * 통계를 거절한 분, 사파리 프라이빗으로 저장이 막힌 분),
 * 그 조합에서 어긋나는 자리는 손으로 몇 번 눌러서는 나오지 않는다.
 *
 * 그래서 수천 가지 상태를 지어내 옮겨 보고, 옮긴 뒤에도 값이 같은지 본다.
 */
import { migrateStorage } from '../../src/lib/migrate'

const RUNS = Number(process.env.RUNS ?? 3000)

/*
 * 난수.
 *
 * 처음에는 seed = (seed*1103515245 + 12345) & 0x7fffffff 를 썼는데,
 * 5% 로 잡은 갈래가 3,000번 중 6번밖에 안 나오고 10% 로 잡은 갈래는 17% 가 나왔다.
 * 이 LCG 는 값들이 서로 얽혀서, 여러 번 부르는 자리마다 치우친다.
 * 검사는 통과했지만 제가 말한 만큼 덮지 못한 것이라 통과에 뜻이 없다.
 * mulberry32 로 바꾼다 — 짧고 분포가 고르다.
 */
let seed = 20260826
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const chance = (p: number) => rnd() < p

const bads: string[] = []
const hits = new Map<string, number>()
const seen = new Set<string>()
function bad(kind: string, detail: string) {
  hits.set(kind, (hits.get(kind) ?? 0) + 1)
  const s = `${kind} :: ${detail}`
  if (!seen.has(s)) { seen.add(s); bads.push(s) }
}

/* ── 기기 저장소 흉내 ────────────────────────────────────
 *
 * 실제 브라우저에서는 저장이 막히는 경우가 있다(사파리 프라이빗, 용량 초과).
 * 그때 옮기기가 예외를 던지면 앱이 통째로 안 뜬다 — 그것도 함께 본다.
 */
class FakeStorage {
  map = new Map<string, string>()
  /** 이 번째 쓰기부터 실패한다. -1 이면 안 실패한다. */
  failAt = -1
  /**
   * 조용히 실패하는가.
   *
   * 터지는 저장소만 흉내냈더니, 옮기기의 안전장치를 떼어 내도 검사가 통과했다.
   * 터지면 그 자리에서 catch 로 빠져나가 지우는 데까지 가지 않기 때문이다.
   * 실제 브라우저에는 예외를 안 던지고 그냥 저장이 안 되는 경우가 있고,
   * 그때가 진짜 위험하다 — 옮긴 줄 알고 예전 것을 지우면 기록이 영영 사라진다.
   */
  silent = false
  writes = 0
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string) {
    this.writes++
    if (this.failAt >= 0 && this.writes >= this.failAt) {
      if (this.silent) return
      throw new Error('QuotaExceededError')
    }
    this.map.set(k, v)
  }
  removeItem(k: string) { this.map.delete(k) }
  get length() { return this.map.size }
  key(i: number) { return [...this.map.keys()][i] ?? null }
}

/* Object.keys(localStorage) 가 열쇠를 내주도록 프록시로 감싼다 */
function asStorage(s: FakeStorage): Storage {
  return new Proxy(s, {
    ownKeys: () => [...s.map.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    get: (t, p) => {
      if (typeof p === 'string' && t.map.has(p) && !(p in t)) return t.map.get(p)
      const v = (t as unknown as Record<string | symbol, unknown>)[p]
      return typeof v === 'function' ? v.bind(t) : v
    }
  }) as unknown as Storage
}

const g = globalThis as Record<string, unknown>
if (!g.indexedDB) g.indexedDB = { deleteDatabase: () => {} }

/* ── 지어내는 상태 ───────────────────────────────────── */

const CANCERS = ['breast', 'gastric', 'colorectal', 'lung', 'liver', 'prostate']
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']

function makeState(): string {
  const diary: Record<string, unknown[]> = {}
  const weights: Record<string, number> = {}
  const days = Math.floor(rnd() * 90)
  for (let i = 0; i < days; i++) {
    const d = `2026-${String(1 + Math.floor(rnd() * 8)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`
    diary[d] = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => ({
      foodId: `food-${Math.floor(rnd() * 400)}`,
      servings: 1,
      meal: pick(['아침', '점심', '저녁', '간식'])
    }))
    if (chance(0.6)) weights[d] = 45 + rnd() * 40
  }
  return JSON.stringify({
    patient: {
      cancer: pick(CANCERS), phase: pick(PHASES),
      weightKg: 40 + rnd() * 45, heightCm: 145 + rnd() * 45,
      age: 20 + Math.floor(rnd() * 65), sex: chance(0.5) ? 'F' : 'M',
      onboarded: true, conditions: [], medications: [],
      cuisines: ['한식'], history: []
    },
    diary, weights,
    supplements: Array.from({ length: Math.floor(rnd() * 4) }, () => `supp-${Math.floor(rnd() * 30)}`),
    textSize: pick(['normal', 'large', 'xlarge'])
  })
}

/** 예전 이름으로 저장된 기기 하나를 지어낸다 */
function makeDevice(): Record<string, string> {
  const d: Record<string, string> = {}
  /* 열에 하나는 아주 새 기기 — 예전 열쇠가 하나도 없다 */
  if (chance(0.1)) { if (chance(0.5)) d['theme'] = 'dark'; return d }
  if (chance(0.92)) d['oncofood.state.v1'] = makeState()
  if (chance(0.55)) d['oncofood.stats.consent'] = chance(0.6) ? 'yes' : 'no'
  if (chance(0.35)) d['oncofood.stats.pid'] = `pid-${Math.floor(rnd() * 1e9)}`
  if (chance(0.25)) d['oncofood.stats.queue'] = JSON.stringify({ open: 3, menu_build: 1 })
  if (chance(0.20)) d['oncofood.stats.sentOn'] = '2026-08-20'
  if (chance(0.30)) d['oncofood.stats.source'] = pick(['cafe', 'search', 'sns'])
  if (chance(0.40)) d['oncofood.lastProvider'] = chance(0.5) ? 'kakao' : 'google'
  if (chance(0.15)) d['oncofood.stats.asked'] = 'yes'
  /* 이 앱과 무관한 열쇠도 기기에는 함께 있다 — 건드리면 안 된다 */
  if (chance(0.5)) d['radonc.something'] = 'x'
  if (chance(0.3)) d['theme'] = 'dark'
  return d
}

/* ── 돌린다 ──────────────────────────────────────────── */

let moved = 0, empty = 0, blocked = 0, already = 0

for (let i = 0; i < RUNS; i++) {
  const store = new FakeStorage()
  const before = makeDevice()
  for (const [k, v] of Object.entries(before)) store.map.set(k, v)

  /* 열에 하나쯤은 이미 새 이름으로 쓰고 있다 (두 번째 실행, 새 기기 등) */
  const preexisting = chance(0.1) && before['oncofood.state.v1']
  if (preexisting) { store.map.set('harucharim.state.v1', makeState()); already++ }

  /* 열에 하나는 저장이 막힌다. 그중 절반은 터지지 않고 조용히 실패한다. */
  if (chance(0.1)) {
    store.failAt = 1 + Math.floor(rnd() * 6)
    store.silent = chance(0.5)
    blocked++
  }

  g.localStorage = asStorage(store)

  try {
    migrateStorage()
  } catch (e) {
    bad('옮기다 터짐', `${(e as Error).message} — 앱이 통째로 안 뜬다`)
    continue
  }

  const after = Object.fromEntries(store.map)
  const oldLeft = Object.keys(after).filter((k) => k.startsWith('oncofood.'))
  const oldCount = Object.keys(before).filter((k) => k.startsWith('oncofood.')).length

  if (store.failAt >= 0) {
    /*
     * 저장이 막힌 기기.
     *
     * 옮기지 못하는 것은 어쩔 수 없다. 절대 안 되는 것은 '잃는' 것이다 —
     * 새 자리에 못 옮겼는데 예전 자리도 지워 버리면 그 값은 영영 사라진다.
     * 기기 안에만 있던 것이라 되찾을 데가 없다.
     */
    for (const [k, v] of Object.entries(before)) {
      if (!k.startsWith('oncofood.')) continue
      const to = 'harucharim.' + k.slice('oncofood.'.length)
      /*
       * 이미 새 이름으로 최신 기록이 있던 자리는 뺀다.
       * 그때 예전 값을 버리는 것은 잃는 것이 아니라 옳은 일이다.
       * 이걸 빼지 않았더니 3,000대 중 19대를 잘못 잡았다 — 전부 이 경우였다.
       */
      if (preexisting && to === 'harucharim.state.v1') continue
      const survived = after[to] === v || after[k] === v
      if (!survived) {
        bad('막힌 기기에서 기록을 잃음',
            `${k} 이 새 자리에도 없고 예전 자리에서도 지워졌다 — 되찾을 데가 없다`)
      }
    }
    continue
  }

  if (oldCount === 0) { empty++ }
  else {
    moved++
    /* 1. 예전 열쇠가 남아 있으면 안 된다 */
    if (oldLeft.length) bad('예전 열쇠가 남음', oldLeft.join(', '))

    /* 2. 값이 그대로 넘어왔는가 */
    for (const [k, v] of Object.entries(before)) {
      if (!k.startsWith('oncofood.')) continue
      const to = 'harucharim.' + k.slice('oncofood.'.length)
      if (preexisting && to === 'harucharim.state.v1') continue   // 새 쪽이 최신이므로 지킨다
      if (after[to] !== v) {
        bad('값이 바뀌거나 사라짐', `${k} → ${to} (${after[to] === undefined ? '없음' : '다름'})`)
      }
    }
  }

  /* 3. 이미 새 이름으로 쓰던 값을 덮어쓰면 안 된다 */
  if (preexisting) {
    const keep = store.map.get('harucharim.state.v1')
    if (keep === before['oncofood.state.v1']) {
      bad('최신 값을 덮어씀', '이미 새 이름으로 쓰던 기록을 예전 것으로 덮었다')
    }
  }

  /* 4. 이 앱과 무관한 열쇠는 건드리지 않는다 */
  for (const k of ['radonc.something', 'theme']) {
    if (k in before && after[k] !== before[k]) bad('남의 열쇠를 건드림', k)
  }

  /* 5. 두 번 돌려도 같아야 한다 */
  const snapshot = JSON.stringify([...store.map.entries()].sort())
  migrateStorage()
  if (JSON.stringify([...store.map.entries()].sort()) !== snapshot) {
    bad('두 번 돌리면 달라짐', '한 번 더 열었을 때 결과가 바뀐다')
  }
}

const total = [...hits.values()].reduce((a, b) => a + b, 0)
console.log(
  bads.length
    ? `옮기기 검사 — ${RUNS.toLocaleString()}대 중 문제 ${bads.length}종 / ${total}건\n` +
      [...hits.entries()].sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `■ ${k} — ${n}건\n   ` +
          bads.filter((b) => b.startsWith(k + ' ::')).slice(0, 3).map((b) => b.split(' :: ')[1]).join('\n   '))
        .join('\n')
    : `옮기기 검사 완료 — ${RUNS.toLocaleString()}대 (옮김 ${moved.toLocaleString()} · ` +
      `새 기기 ${empty.toLocaleString()} · 저장막힘 ${blocked.toLocaleString()} · ` +
      `이미 새 이름 ${already.toLocaleString()}), 문제 없음`
)
