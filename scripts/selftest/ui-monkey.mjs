#!/usr/bin/env node
/**
 * 화면 자가시험.
 *
 * 엔진 검사는 판정이 맞는지를 본다. 화면이 실제로 그려지는지는 보지 않는다.
 * 여기서는 무작위 환자 상태 수백 가지를 진짜 브라우저에 넣고 탭 일곱 개를 돌면서 네 가지를 찾는다.
 *
 *   · 멈춤     — "화면을 여는 중에 멈췄습니다" (오류 경계가 잡은 것)
 *   · 깨진 글자 — NaN · undefined · Infinity · [object Object]
 *   · 가로 넘침 — 본문이 화면 폭을 넘어 옆으로 밀림 (360 px 와 430 px 에서)
 *   · 오류     — 콘솔 오류, 잡히지 않은 예외
 *
 * 상태는 세 갈래로 만든다.
 *   보통 — 실제로 고를 수 있는 값을 아무렇게나
 *   극단 — 고를 수는 있지만 끝에 있는 값 (증상 17가지·약 18가지 전부, 25 kg, 100세, 300일치 기록)
 *   낡음 — 예전 판이 남겼을 법하거나 망가진 저장 자료 (없어진 약·음식 id, 모양이 다른 체중, 빠진 칸)
 *
 * 낡은 자료를 넣는 까닭 — 이 앱의 건강 기록은 서버에 사본이 없다. 저장된 값 하나가 어긋나
 * 화면이 멈추면, 환자분은 기록이 다 날아간 줄 안다. 실제로 체중을 다른 모양으로 넣었더니
 * 기록 탭이 통째로 멈춘 적이 있다(2026-09).
 *
 *   # 로그인 없이 열리도록 Supabase 값을 비운 빌드를 따로 만든다
 *   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite build --outDir /tmp/hc-nologin --emptyOutDir
 *   node_modules/.bin/jiti scripts/selftest/dump-ids.ts > /tmp/harucharim-ids.json
 *   node scripts/selftest/ui-monkey.mjs /tmp/hc-nologin /tmp/harucharim-ids.json /tmp/hc-monkey 200 12345
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const [SITE, IDS_FILE, OUT, N_RAW, SEED_RAW] = process.argv.slice(2)
if (!SITE || !IDS_FILE || !OUT) { console.error('쓰는 법: ui-monkey.mjs <빌드 폴더> <ids.json> <결과 폴더> [몇 가지=160] [씨앗]'); process.exit(2) }
const N = Number(N_RAW ?? 160)
const SEED0 = Number(SEED_RAW ?? Date.now() % 2147483647)
if (!Number.isInteger(N) || !Number.isInteger(SEED0)) { console.error('개수와 씨앗은 정수여야 합니다'); process.exit(2) }

/* ONLY=58,60 — 걸린 상태만 다시 본다 (씨앗과 개수는 그때와 같게 줄 것) */
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 8795, CDP = 9340, WORKERS = 4
const ids = JSON.parse(readFileSync(IDS_FILE, 'utf8'))
mkdirSync(OUT, { recursive: true })

/* 서비스 워커가 있으면 지난 화면을 붙든다 — 사본에서 뺀다 */
for (const f of ['sw.js', 'registerSW.js']) if (existsSync(`${SITE}/${f}`)) unlinkSync(`${SITE}/${f}`)

let seed = SEED0
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length]
const some = (a, n) => { const p = [...a], o = []; while (o.length < n && p.length) o.push(p.splice(Math.floor(rnd() * p.length), 1)[0]); return o }
const day = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toISOString().slice(0, 10) }
const MEALS = ['아침', '오전간식', '점심', '오후간식', '저녁']
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']

function patient() {
  const cancer = pick(ids.cancers)
  const subs = ids.subtypes[cancer] ?? []
  return {
    ...ids.defaultPatient, cancer, phase: pick(PHASES),
    subtypes: rnd() < 0.4 ? some(subs, 1) : [],
    sex: cancer === 'prostate' ? 'M' : cancer === 'gyn' ? 'F' : pick(['M', 'F']),
    weightKg: Math.round((35 + rnd() * 80) * 10) / 10, heightCm: Math.round(145 + rnd() * 45), age: Math.round(20 + rnd() * 70),
    weightLossPct: rnd() < 0.3 ? Math.round(rnd() * 15) : 0,
    conditions: some(ids.conditions, Math.floor(rnd() * 4)), medications: some(ids.medications, Math.floor(rnd() * 4)),
    history: [], cuisines: ['한식'], onboarded: true
  }
}
function diary(days, perDay) {
  const d = {}
  for (let i = 0; i < days; i++) {
    if (rnd() < 0.25) continue
    d[day(i)] = Array.from({ length: 1 + Math.floor(rnd() * perDay) }, () => ({ foodId: pick(ids.foods), servings: pick([0.5, 1, 1, 1, 1.5, 2]), meal: pick(MEALS) }))
  }
  return d
}
function weights(n, base) {
  const w = {}
  for (let i = 0; i < n; i++) if (rnd() < 0.6) w[day(i * 3)] = Math.round((base + (rnd() - 0.5) * 6) * 10) / 10
  return w
}

function normal() {
  const p = patient()
  return { kind: '보통', what: '', state: { patient: p, diary: diary(pick([0, 3, 14, 40]), 9), shown: {}, weights: weights(pick([0, 4, 20]), p.weightKg), supplements: some(ids.supplements, Math.floor(rnd() * 4)), textSize: pick(['normal', 'normal', 'large', 'xlarge']) } }
}
function edge() {
  const p = patient()
  const kinds = [
    ['증상·약 전부', () => { p.conditions = [...ids.conditions]; p.medications = [...ids.medications] }],
    ['25 kg · 130 cm · 14세', () => { p.weightKg = 25; p.heightCm = 130; p.age = 14 }],
    ['200 kg · 210 cm · 100세', () => { p.weightKg = 200; p.heightCm = 210; p.age = 100 }],
    ['체중 40 % 감소', () => { p.weightLossPct = 40 }],
    ['기록 없음 · 약 없음 · 증상 없음', () => { p.conditions = []; p.medications = [] }]
  ]
  const [what, apply] = pick(kinds); apply()
  const heavy = rnd() < 0.5
  return { kind: '극단', what: what + (heavy ? ' · 300일치 기록·영양제 전부·가장 큰 글씨' : ''),
    state: { patient: p, diary: heavy ? diary(300, 30) : diary(5, 6), shown: {}, weights: heavy ? weights(120, p.weightKg) : {}, supplements: heavy ? [...ids.supplements] : [], textSize: heavy ? 'xlarge' : 'normal' } }
}
/* 낡거나 망가진 저장 자료 — 하나씩만 넣어, 멈추면 무엇 때문인지 알 수 있게 한다 */
const STALE = [
  ['없어진 약 id', (s) => { s.patient.medications = ['herceptin', pick(ids.medications)] }],
  ['없어진 증상', (s) => { s.patient.conditions = ['빈혈', pick(ids.conditions)] }],
  ['없어진 암종', (s) => { s.patient.cancer = 'thyroid' }],
  ['예전 치료 시기 값(survivor)', (s) => { s.patient.phase = 'survivor' }],
  ['예전 치료 시기 값(pre_op)', (s) => { s.patient.phase = 'pre_op' }],
  ['없어진 세부 유형', (s) => { s.patient.subtypes = ['없는유형'] }],
  ['기록에 없어진 음식 id', (s) => { s.diary[day(0)] = [{ foodId: 'removed-food-1', servings: 1, meal: '점심' }, { foodId: pick(ids.foods), servings: 1, meal: '점심' }] }],
  ['기록의 끼니 이름이 다름', (s) => { s.diary[day(0)] = [{ foodId: pick(ids.foods), servings: 1, meal: '야식' }] }],
  ['분량이 글자', (s) => { s.diary[day(0)] = [{ foodId: pick(ids.foods), servings: '2', meal: '점심' }] }],
  ['분량이 0', (s) => { s.diary[day(0)] = [{ foodId: pick(ids.foods), servings: 0, meal: '점심' }] }],
  ['분량이 음수', (s) => { s.diary[day(0)] = [{ foodId: pick(ids.foods), servings: -1, meal: '점심' }] }],
  ['분량이 아주 큼', (s) => { s.diary[day(0)] = [{ foodId: pick(ids.foods), servings: 500, meal: '점심' }] }],
  ['분량 칸이 없음', (s) => { s.diary[day(0)] = [{ foodId: pick(ids.foods), meal: '점심' }] }],
  ['하루 기록이 목록이 아님', (s) => { s.diary[day(0)] = { foodId: pick(ids.foods), servings: 1, meal: '점심' } }],
  ['하루 기록에 null', (s) => { s.diary[day(0)] = [null, { foodId: pick(ids.foods), servings: 1, meal: '점심' }] }],
  ['기록이 통째로 null', (s) => { s.diary = null }],
  ['체중이 목록 모양', (s) => { s.weights = [{ date: day(0), kg: 54 }, { date: day(7), kg: 55 }] }],
  ['체중 값이 글자', (s) => { s.weights = { [day(0)]: '54.2', [day(7)]: '55' } }],
  ['체중 값이 0', (s) => { s.weights = { [day(0)]: 0, [day(7)]: 55 } }],
  ['체중 값이 null', (s) => { s.weights = { [day(0)]: null, [day(7)]: 55 } }],
  ['체중이 null', (s) => { s.weights = null }],
  ['없어진 영양제 id', (s) => { s.supplements = ['removed-supp', pick(ids.supplements)] }],
  ['영양제가 목록이 아님', (s) => { s.supplements = 'vitamin-d' }],
  ['키가 0', (s) => { s.patient.heightCm = 0 }],
  ['체중이 0', (s) => { s.patient.weightKg = 0 }],
  ['나이가 null', (s) => { s.patient.age = null }],
  ['체중 칸이 없음', (s) => { delete s.patient.weightKg }],
  ['증상이 목록이 아님', (s) => { s.patient.conditions = '설사' }],
  ['약이 null', (s) => { s.patient.medications = null }],
  ['성별이 다른 글자', (s) => { s.patient.sex = '여' }],
  ['보여 드린 것이 목록 모양', (s) => { s.shown = ['a', 'b'] }],
  ['글자 크기가 모르는 값', (s) => { s.textSize = 'huge' }],
  ['환자 칸이 없음', (s) => { delete s.patient }],
  ['저장 자료가 JSON 이 아님', (s) => { s.__raw = '{"patient": {"cancer": "breast"' }]
]
function stale(i) {
  const base = normal().state
  const [what, apply] = STALE[i % STALE.length]
  apply(base)
  if (base.patient) base.patient.onboarded = true
  return { kind: '낡음', what, state: base }
}

const cases = []
let st = 0
for (let i = 0; i < N; i++) {
  const r = i % 5
  cases.push(r === 3 ? edge() : r === 4 ? stale(st++) : normal())
}
/* 낡은 자료는 종류마다 적어도 한 번씩 */
while (st < STALE.length) cases.push(stale(st++))

/* ── 페이지 안에서 도는 것 ─────────────────────────────── */
const IN_PAGE = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const out = []
  const text = () => document.body ? document.body.innerText : ''
  const tabs = ['추천', '내 식단', '찾기', '기록', '영양제', '가이드', '내 정보']
  const press = (label) => {
    const b = [...document.querySelectorAll('button, a')].filter((x) => x.textContent.trim() === label)
    if (!b.length) return false
    b[b.length - 1].click(); return true
  }
  const look = (where) => {
    const t = text()
    if (t.includes('화면을 여는 중에 멈췄습니다')) {
      const m = document.querySelector('.font-mono')
      out.push({ kind: '멈춤', where, detail: (m ? m.innerText : '').slice(0, 160) }); return false
    }
    const bad = t.match(/[^\\n]{0,24}(NaN|undefined|Infinity|\\[object Object\\])[^\\n]{0,24}/)
    if (bad) out.push({ kind: '깨진 글자', where, detail: bad[0].trim() })
    /* 체중이 줄었을 때의 "-4 kg (-6.3 %)" 는 정상 표시다 — 처음에는 그것을 68번 잡았다. 열량·영양소의 음수만 본다 */
    const neg = t.match(/[^\\n]{0,20}(-\\d[\\d,.]*\\s?(kcal|g|mg))(?![a-zA-Z])[^\\n]{0,10}/)
    if (neg && !/-\\d[\\d,.]*\\s?kg/.test(neg[0])) out.push({ kind: '음수 표시', where, detail: neg[0].trim() })
    const de = document.documentElement
    if (de.scrollWidth > de.clientWidth + 2) {
      let worst = null, over = 0
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        /* 아래 탭줄은 화면 폭을 따라 늘어날 뿐이라 범인이 아니다. 같은 만큼 넘친 것 가운데서는 가장 안쪽 것을 든다 */
        if (el.closest('nav')) continue
        if (r.width > 0 && r.right - de.clientWidth >= over && r.right - de.clientWidth > 0 && getComputedStyle(el).position !== 'fixed') { over = r.right - de.clientWidth; worst = el }
      }
      out.push({ kind: '가로 넘침', where, detail: de.scrollWidth + ' > ' + de.clientWidth + ' · ' + (worst ? worst.tagName + '.' + String(worst.className).slice(0, 60) + ' "' + worst.textContent.trim().slice(0, 30) + '" ← ' + (worst.parentElement ? String(worst.parentElement.className).slice(0, 70) : '') : '') })
    }
    if (t.trim().length < 40) out.push({ kind: '빈 화면', where, detail: t.trim().slice(0, 40) })
    return true
  }
  await wait(300)
  if (!look('처음')) return out
  /*
   * 글자 크기가 실제로 적용됐는가. 저장은 되는데 읽지를 않아, 키워 두셔도
   * 다시 열 때마다 원래 크기로 돌아간 적이 있다. 뿌리 글자 크기로 직접 본다.
   */
  const want = window.__TEXT
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize)
  if (!text().includes('하루차림 시작하기')) {
    if ((want === 'large' || want === 'xlarge') && !(px > 16.5)) out.push({ kind: '글자 크기가 적용되지 않음', where: '처음', detail: want + ' 인데 뿌리 글자 ' + px + 'px' })
    if (want === 'normal' && px > 16.5) out.push({ kind: '글자 크기가 적용되지 않음', where: '처음', detail: 'normal 인데 뿌리 글자 ' + px + 'px' })
  }
  /* 온보딩이 뜨면(환자 칸이 없는 낡은 자료) 그것도 화면이다 — 멈추지만 않으면 된다 */
  const onboarding = text().includes('하루차림 시작하기')
  if (onboarding) { out.push({ kind: '참고', where: '처음', detail: '온보딩으로 돌아감' }); return out }
  for (const tab of tabs) {
    if (!press(tab)) { out.push({ kind: '탭 없음', where: tab, detail: '' }); continue }
    await wait(260)
    if (!look(tab)) return out
    if (tab === '추천') {
      const again = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('다시 구성'))
      if (again) { again.click(); await wait(260); if (!look('추천 · 다시 구성')) return out }
      const why = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '이유').slice(0, 2)
      for (const b of why) b.click()
      if (why.length) { await wait(120); if (!look('추천 · 이유')) return out }
    }
    if (tab === '찾기') {
      const box = document.querySelector('input[placeholder*="음식 이름"]')
      if (box) {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        set.call(box, window.__Q || '김'); box.dispatchEvent(new Event('input', { bubbles: true }))
        await wait(420)
        if (!look('찾기 · 검색')) return out
        const row = document.querySelector('li > button')
        if (row) { row.click(); await wait(220); if (!look('찾기 · 상세')) return out; press('닫기'); await wait(80) }
      }
    }
    if (tab === '기록') {
      for (const seg of ['한 주', '한 달', '하루']) { if (press(seg)) { await wait(220); if (!look('기록 · ' + seg)) return out } }
    }
    if (tab === '가이드') {
      for (const seg of ['운동', '암종 가이드', '근거 등급', '사용법']) { if (press(seg)) { await wait(200); if (!look('가이드 · ' + seg)) return out } }
    }
  }
  return out
})()`

/* ── 브라우저 ─────────────────────────────────────────── */
/*
 * 일꾼마다 주소(포트)를 따로 준다. 저장소(localStorage)는 주소별이라, 한 주소를 넷이 같이 쓰면
 * 옆 일꾼의 앱이 제 상태를 저장하면서 내 상태를 덮어쓴다 — 넣은 것과 다른 상태를 시험하게 되고,
 * 낡은 자료를 넣었는데 멀쩡한 자료로 바뀌어 "문제 없음" 이 나올 수 있다.
 * "보통 크기를 넣었는데 가장 큰 글씨로 뜸" 을 쫓다가 알았다.
 */
const servers = Array.from({ length: WORKERS }, (_x, w) =>
  spawn('python3', ['-m', 'http.server', String(PORT + w), '--directory', SITE], { stdio: 'ignore' }))
rmSync('/tmp/harucharim-monkey-profile', { recursive: true, force: true })
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  /*
   * 뒤에 있는 탭의 타이머를 늦추지 않게 한다. 크롬은 앞에 보이지 않는 탭의 setTimeout 을 1초에 한 번으로 묶는데,
   * 일꾼 넷 가운데 셋이 늘 뒤에 있다 — 0.1초 쉬려던 것이 1초가 되어 한 상태에 20초씩 걸렸고,
   * "응답 없음" 의 대부분이 그것이었다(앱이 느린 것이 아니었다).
   */
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/harucharim-monkey-profile', '--window-size=900,1000', 'about:blank'], { stdio: 'ignore' })
const stop = () => { try { chrome.kill() } catch {} for (const sv of servers) { try { sv.kill() } catch {} } }
process.on('exit', stop)
for (let i = 0; i < 80; i++) { try { await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json(); break } catch { await sleep(300) } }

class Tab {
  static async open() {
    const t = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json()
    const ws = new WebSocket(t.webSocketDebuggerUrl)
    await new Promise((r) => { ws.onopen = r })
    return new Tab(ws)
  }
  constructor(ws) {
    this.ws = ws; this.id = 0; this.wait = new Map(); this.errors = []
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id) { const r = this.wait.get(m.id); if (r) { this.wait.delete(m.id); r(m) } return }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails
        this.errors.push(`예외: ${(d.exception?.description ?? d.text ?? '').split('\n')[0].slice(0, 200)}`)
      } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        const s = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 220)
        if (!/Failed to load resource|favicon|sw\.js|service worker/i.test(s)) this.errors.push(`콘솔: ${s}`)
      }
    }
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res) => { this.wait.set(id, res); this.ws.send(JSON.stringify({ id, method, params })) }) }
}

const results = []
let done = 0
async function worker(w) {
  const tab = await Tab.open()
  await tab.send('Page.enable'); await tab.send('Runtime.enable')
  for (let i = w; i < cases.length; i += WORKERS) {
    if (ONLY && !ONLY.has(i)) continue
    const c = cases[i]
    const wide = i % 2 === 1
    await tab.send('Emulation.setDeviceMetricsOverride', { width: wide ? 430 : 360, height: wide ? 932 : 740, deviceScaleFactor: 1, mobile: true })
    const raw = c.state.__raw ?? JSON.stringify(c.state)
    const boot = `try { localStorage.clear(); localStorage.setItem('harucharim.state.v1', ${JSON.stringify(raw)});
      localStorage.setItem('harucharim.migrated', '1'); localStorage.setItem('harucharim.stats.consent', 'no');
      localStorage.setItem('harucharim.notices.read', ${JSON.stringify(JSON.stringify(ids.notices))});
      window.__Q = ${JSON.stringify(pick(ids.foodNames))};
      window.__TEXT = ${JSON.stringify(['normal', 'large', 'xlarge'].includes(c.state.textSize) ? c.state.textSize : 'normal')} } catch (e) {}`
    const s = await tab.send('Page.addScriptToEvaluateOnNewDocument', { source: boot })
    tab.errors = []
    await tab.send('Page.navigate', { url: `http://localhost:${PORT + w}/?i=${i}` })
    for (let k = 0; k < 40; k++) {
      await sleep(150)
      /*
       * 주소까지 본다. 주소를 안 보면 '앞 상태의 화면' 이 이미 다 그려져 있어 곧바로 통과하고,
       * 시험이 앞 화면에서 돌다가 넘어가는 순간 끊긴다 — 컴퓨터가 바쁠 때 '응답 없음' 15건과
       * '글자 크기 미적용' 6건이 그렇게 나왔다(앱이 아니라 이 시험의 잘못).
       */
      const r = await tab.send('Runtime.evaluate', { expression: `location.search === '?i=${i}' && document.readyState === 'complete' && !!document.getElementById('root') && document.getElementById('root').children.length > 0`, returnByValue: true })
      if (r.result?.result?.value === true) break
    }
    let found = []
    try {
      const r = await Promise.race([
        tab.send('Runtime.evaluate', { expression: IN_PAGE, awaitPromise: true, returnByValue: true }),
        sleep(25000).then(() => ({ timeout: true }))
      ])
      if (r.timeout) found = [{ kind: '응답 없음', where: '', detail: '25초 안에 끝나지 않음' }]
      else if (r.result?.exceptionDetails) found = [{ kind: '시험 자체가 무너짐', where: '', detail: (r.result.exceptionDetails.exception?.description ?? '').slice(0, 160) }]
      else found = r.result?.result?.value ?? []
    } catch (e) { found = [{ kind: '시험 자체가 무너짐', where: '', detail: String(e).slice(0, 120) }] }
    for (const e of [...new Set(tab.errors)].slice(0, 3)) found.push({ kind: '오류', where: '', detail: e })
    const serious = found.filter((f) => f.kind !== '참고')
    if (serious.length && results.filter((x) => x.found.some((f) => f.kind === serious[0].kind)).length < 4) {
      const shot = await tab.send('Page.captureScreenshot', { format: 'png' })
      if (shot.result?.data) writeFileSync(`${OUT}/${String(i).padStart(3, '0')}-${serious[0].kind.replace(/\s/g, '')}.png`, Buffer.from(shot.result.data, 'base64'))
    }
    /* SHOT=<글귀> — 걸리지 않았어도 그 글귀가 있는 자리를 찍어 둔다 (고친 뒤 눈으로 볼 때) */
    if (process.env.SHOT) {
      await tab.send('Runtime.evaluate', { expression: `(() => { const e = [...document.querySelectorAll('div')].reverse().find((x) => x.textContent.includes(${JSON.stringify(process.env.SHOT)})); if (e) e.scrollIntoView({ block: 'center' }) })()` })
      await sleep(250)
      const shot = await tab.send('Page.captureScreenshot', { format: 'png' })
      if (shot.result?.data) writeFileSync(`${OUT}/${String(i).padStart(3, '0')}-shot.png`, Buffer.from(shot.result.data, 'base64'))
    }
    results.push({ i, kind: c.kind, what: c.what, width: wide ? 430 : 360, found, cancer: c.state.patient?.cancer, phase: c.state.patient?.phase })
    await tab.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: s.result.identifier })
    if (++done % 40 === 0) process.stdout.write(`  ${done}/${cases.length}\n`)
  }
}
await Promise.all(Array.from({ length: WORKERS }, (_x, w) => worker(w)))
stop()

/* ── 보고 ─────────────────────────────────────────────── */
results.sort((a, b) => a.i - b.i)
writeFileSync(`${OUT}/results.json`, JSON.stringify({ seed: SEED0, n: cases.length, results }, null, 1))
const byKind = new Map()
for (const r of results) for (const f of r.found) {
  if (f.kind === '참고') continue
  const k = f.kind
  const g = byKind.get(k) ?? { n: 0, states: new Set(), ex: [] }
  g.n++; g.states.add(r.i)
  const line = `[${r.kind}${r.what ? ' · ' + r.what : ''} · ${r.cancer}/${r.phase} · ${r.width}px] ${f.where} — ${f.detail}`
  if (g.ex.length < 8 && !g.ex.some((e) => e.split('] ')[1] === line.split('] ')[1])) g.ex.push(line)
  byKind.set(k, g)
}
const clean = results.filter((r) => r.found.every((f) => f.kind === '참고')).length
console.log(`\n화면 자가시험 — 상태 ${cases.length}가지 (보통 ${cases.filter((c) => c.kind === '보통').length} · 극단 ${cases.filter((c) => c.kind === '극단').length} · 낡음 ${cases.filter((c) => c.kind === '낡음').length}) · 씨앗 ${SEED0}`)
console.log(`  ${ONLY ? `그중 ${results.length}가지만 다시 봄 · ` : ''}아무 문제 없이 지나간 것 ${clean}가지 (${Math.round(clean / Math.max(1, results.length) * 100)}%)`)
/*
 * '응답 없음' 은 컴퓨터가 바쁠 때도 나온다 (다른 검사와 같이 돌렸더니 31건 — 따로 돌리니 0건).
 * 나오면 ONLY 로 그 상태만 한가할 때 다시 볼 것.
 */
for (const [k, g] of [...byKind].sort((a, b) => b[1].states.size - a[1].states.size)) {
  console.log(`\n■ ${k} — 상태 ${g.states.size}가지에서 ${g.n}번`)
  for (const e of g.ex) console.log('   -', e)
}
/* 낡은 자료는 종류별로 따로 — 무엇이 멈추게 하는지 */
const staleBad = results.filter((r) => r.kind === '낡음' && r.found.some((f) => f.kind === '멈춤' || f.kind === '빈 화면' || f.kind === '응답 없음'))
if (staleBad.length) {
  console.log(`\n□ 화면을 멈추게 한 낡은 자료 ${new Set(staleBad.map((r) => r.what)).size}종`)
  for (const w of [...new Set(staleBad.map((r) => r.what))]) console.log('   -', w)
}
process.exit(byKind.has('멈춤') || byKind.has('응답 없음') ? 1 : 0)
