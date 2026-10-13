#!/usr/bin/env node
/**
 * 화면 무작위 입력 시험.
 *
 * ui-monkey.mjs 는 저장 자료를 심어 놓고 탭을 돌아본다 — "이런 상태에서 열리는가" 를 본다.
 * 이것은 반대로 **사람 손이 하는 일** 을 한다. 화면에 보이는 칸과 단추를 아무렇게나 고르고,
 * 숫자 칸에는 엉뚱한 값(빈칸·음수·글자·아주 큰 수·전각 숫자)을 넣고, 칩을 켜고 끄고, 음식을 담고 빼고,
 * 중간중간 새로 고쳐 저장된 것이 그대로 돌아오는지 본다.
 *
 * 찾는 것
 *   · 멈춤 — "화면을 여는 중에 멈췄습니다"
 *   · 깨진 글자 — NaN · undefined · Infinity · [object Object]
 *   · 가로 넘침, 콘솔 오류·예외, 빈 화면
 *   · 어긋남 — 윗칸 없이 남은 약, 호중구가 낮은데 날과일 옆에 "씻어서" 가 없는 식단
 *
 * 걸리면 씨앗과 그때까지 한 일(마지막 12가지)을 적는다 — 같은 씨앗으로 다시 돌리면 같은 길을 간다.
 *
 *   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite build --outDir /tmp/hc-nologin --emptyOutDir
 *   node_modules/.bin/jiti scripts/selftest/dump-ids.ts > /tmp/harucharim-ids.json
 *   node scripts/selftest/ui-fuzz.mjs /tmp/hc-nologin /tmp/harucharim-ids.json /tmp/hc-fuzz [몇 판=40] [한 판에 몇 번=240] [씨앗]
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const [SITE, IDS_FILE, OUT, RUNS_RAW, STEPS_RAW, SEED_RAW] = process.argv.slice(2)
if (!SITE || !IDS_FILE || !OUT) { console.error('쓰는 법: ui-fuzz.mjs <빌드 폴더> <ids.json> <결과 폴더> [몇 판=40] [한 판에 몇 번=240] [씨앗]'); process.exit(2) }
const RUNS = Number(RUNS_RAW ?? 40), STEPS = Number(STEPS_RAW ?? 240)
const SEED0 = Number(SEED_RAW ?? Date.now() % 2147483647)
if (![RUNS, STEPS, SEED0].every(Number.isInteger)) { console.error('판 수·횟수·씨앗은 정수여야 합니다'); process.exit(2) }

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 8825, CDP = 9350, WORKERS = 4, CHUNK = 60
const ids = JSON.parse(readFileSync(IDS_FILE, 'utf8'))
mkdirSync(OUT, { recursive: true })
for (const f of ['sw.js', 'registerSW.js']) if (existsSync(`${SITE}/${f}`)) unlinkSync(`${SITE}/${f}`)

/* ── 페이지 안에서 도는 것 — 한 묶음(CHUNK 번) ─────────────────── */
const IN_PAGE = (seed, steps, widthPx) => `(async () => {
  let s = ${seed} | 0
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const pick = (a) => a[Math.floor(rnd() * a.length) % a.length]
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const out = [], trail = []
  let slowest = 0
  const text = () => (document.body ? document.body.innerText : '')
  /* 숫자 칸에 넣어 볼 것 — 멀쩡한 값과 사람이 실제로 치는 엉뚱한 값을 섞는다 */
  const NUMS = ['60', '54.5', '170', '45', '', '0', '-5', '999', '1000000', '0.1', '3', '250', 'abc', '６０', '60kg', ' 72 ', '1e3', '.', '--', '007', '12.345678']
  const WORDS = ['김', '밥', '사과', '자몽', '훈제', '회', '샐러드', '두부', '', ' ', 'ㄱ', 'zzzz', '😀', '<b>', '%', "'", '김치찌개와 된장찌개 그리고 아주 긴 검색어를 넣어 보면 어떻게 되는지', '0', '12345']
  const setValue = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true }))
  }
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
  /* 누르면 안 되는 것 — 바깥으로 나가는 고리, 파일 고르기, 계정·자료를 지우는 단추(지우면 시험할 것이 없어진다) */
  const SKIP = /계정\\s*삭제|탈퇴|모두\\s*지우|전부\\s*지우|초기화|내보내기|가져오기|로그아웃|카카오|구글|이메일로|문의\\s*보내|바코드\\s*스캔|스캔\\s*시작|사진/
  const candidates = () => {
    const els = [...document.querySelectorAll('button, input, textarea, select, [role="button"]')].filter(visible)
    return els.filter((el) => {
      if (el.disabled) return false
      if (el.tagName === 'INPUT' && ['file', 'hidden'].includes(el.type)) return false
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return !SKIP.test(el.textContent || '')
      return true
    })
  }
  const label = (el) => (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? '[' + (el.placeholder || el.type || '칸') + ']' : (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 18))
  const look = (after) => {
    const t = text()
    if (t.includes('화면을 여는 중에 멈췄습니다')) {
      const m = document.querySelector('.font-mono')
      out.push({ kind: '멈춤', detail: (m ? m.innerText : '').slice(0, 160), after }); return false
    }
    const bad = t.match(/[^\\n]{0,24}(NaN|undefined|Infinity|\\[object Object\\])[^\\n]{0,24}/)
    if (bad) out.push({ kind: '깨진 글자', detail: bad[0].trim(), after })
    const neg = t.match(/[^\\n]{0,20}(-\\d[\\d,.]*\\s?(kcal|g|mg))(?![a-zA-Z])[^\\n]{0,10}/)
    if (neg && !/-\\d[\\d,.]*\\s?kg/.test(neg[0])) out.push({ kind: '음수 표시', detail: neg[0].trim(), after })
    const de = document.documentElement
    if (de.scrollWidth > de.clientWidth + 2) {
      let worst = null, over = 0
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('nav')) continue
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.right - de.clientWidth >= over && r.right - de.clientWidth > 0 && getComputedStyle(el).position !== 'fixed') { over = r.right - de.clientWidth; worst = el }
      }
      out.push({ kind: '가로 넘침', detail: de.scrollWidth + ' > ' + de.clientWidth + ' · ' + (worst ? worst.tagName + '.' + String(worst.className).slice(0, 50) + ' "' + worst.textContent.trim().slice(0, 28) + '"' : ''), after })
    }
    if (t.trim().length < 40) out.push({ kind: '빈 화면', detail: t.trim().slice(0, 40), after })
    return true
  }
  /* 저장된 것을 직접 본다 — 화면이 멀쩡해 보여도 저장이 어긋나면 다음에 열 때 탈이 난다 */
  const stateCheck = (after) => {
    let st
    try { st = JSON.parse(localStorage.getItem('harucharim.state.v1') || 'null') } catch (e) { out.push({ kind: '저장 자료가 깨짐', detail: String(e).slice(0, 80), after }); return }
    if (!st || !st.patient) return
    const p = st.patient, PARENT = ${JSON.stringify(Object.fromEntries((ids.medParents ?? [])))}
    for (const m of p.medications || []) if (PARENT[m] && !(p.medications || []).includes(PARENT[m])) out.push({ kind: '윗칸 없이 남은 약', detail: m + ' · ' + (p.medications || []).join(','), after })
    for (const k of ['weightKg', 'heightCm', 'age']) if (typeof p[k] !== 'number' || !isFinite(p[k]) || p[k] <= 0) out.push({ kind: '몸 수치가 저장에서 깨짐', detail: k + '=' + JSON.stringify(p[k]), after })
    if (p.weightKg > 300 || p.weightKg < 20 || p.heightCm > 230 || p.heightCm < 100 || p.age > 120) out.push({ kind: '말이 안 되는 몸 수치가 저장됨', detail: p.weightKg + 'kg ' + p.heightCm + 'cm ' + p.age + '세', after })
    for (const [d, list] of Object.entries(st.diary || {})) for (const it of list || []) if (!(it && typeof it.servings === 'number' && it.servings > 0 && it.servings <= 50)) out.push({ kind: '분량이 저장에서 깨짐', detail: d + ' ' + JSON.stringify(it).slice(0, 60), after })
    for (const [d, kg] of Object.entries(st.weights || {})) if (!(typeof kg === 'number' && kg >= 20 && kg <= 300)) out.push({ kind: '체중 기록이 저장에서 깨짐', detail: d + '=' + JSON.stringify(kg), after })
  }
  /* 호중구가 낮은 분의 식단에 날과일이 보이면 "씻어서" 가 그 화면에 있어야 한다 */
  const washCheck = (after) => {
    let st; try { st = JSON.parse(localStorage.getItem('harucharim.state.v1') || 'null') } catch (e) { return }
    if (!st || !st.patient) return
    const neut = st.patient.phase === 'neutropenia' || (st.patient.conditions || []).includes('호중구감소증')
    const onMenu = [...document.querySelectorAll('h2, h3')].some((h) => /끼니별 구성/.test(h.textContent || ''))
    if (!onMenu) return
    for (const li of document.querySelectorAll('li')) {
      const name = (li.querySelector('span.truncate') || {}).textContent || ''
      if (!/^(사과|배|귤|딸기|포도|바나나|키위|복숭아|참외|수박|오렌지|상추|오이|토마토|방울토마토|깻잎)$/.test(name.trim())) continue
      /* '피하세요' 인 음식에는 피하라는 안내만 남긴다 — 씻는 방법이 없는 것이 맞다 */
      if (/피하세요/.test(li.textContent || '')) continue
      const has = !!li.querySelector('[data-howto]') && /씻/.test(li.textContent || '')
      if (neut && !has) out.push({ kind: '호중구가 낮은데 날과일·채소 옆에 씻는 방법이 없음', detail: name.trim() + ' · ' + (li.textContent || '').replace(/\s+/g, ' ').slice(0, 90), after })
      if (!neut && has) out.push({ kind: '호중구가 낮지 않은데 씻는 방법이 붙음', detail: name.trim(), after })
    }
  }
  await wait(250)
  if (!look('처음')) return { out, trail }
  for (let i = 0; i < ${steps}; i++) {
    const c = candidates()
    if (!c.length) { out.push({ kind: '누를 것이 하나도 없음', detail: text().slice(0, 60), after: trail.slice(-1)[0] || '' }); break }
    /* 아래 탭줄만 누르다 끝나지 않게 — 탭 이동은 다섯 번에 한 번쯤 */
    const nav = c.filter((el) => el.closest('nav')), body = c.filter((el) => !el.closest('nav'))
    const pool = (rnd() < 0.2 || !body.length) ? (nav.length ? nav : c) : body
    const el = pick(pool)
    let what, t0 = 0
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const v = (el.type === 'number' || el.inputMode === 'decimal' || el.inputMode === 'numeric') ? pick(NUMS) : pick(WORDS)
      what = label(el) + '←' + JSON.stringify(v)
      try { sessionStorage.setItem('fz-doing', what) } catch (e) {}
      t0 = performance.now()
      try { el.focus(); setValue(el, v) } catch (e) { out.push({ kind: '입력 중 예외', detail: String(e).slice(0, 100), after: what }) }
    } else if (el.tagName === 'SELECT') {
      const o = pick([...el.options]); what = '고름:' + (o ? o.textContent.trim().slice(0, 14) : '')
      if (o) { el.value = o.value; el.dispatchEvent(new Event('change', { bubbles: true })) }
    } else {
      what = '누름:' + label(el)
      try { sessionStorage.setItem('fz-doing', what) } catch (e) {}
      t0 = performance.now()
      try { el.click() } catch (e) { out.push({ kind: '누르는 중 예외', detail: String(e).slice(0, 100), after: what }) }
    }
    /*
     * 누르고 나서 화면이 다시 그려질 때까지 걸린 시간. 누름은 그 자리에서 그려지므로 click() 이 돌아올 때까지가 곧 굳은 시간이다.
     * 1.5초를 넘으면 쓰시는 분은 "눌렀는데 안 먹는다" 고 느낀다.
     */
    const took = t0 ? performance.now() - t0 : 0
    slowest = Math.max(slowest, took)
    if (took > 1500) out.push({ kind: '느림 — 누르고 1.5초 넘게 굳음', detail: Math.round(took) + ' ms · ' + what, after: what })
    trail.push(what)
    /* 화면이 굳으면 이 함수가 끝나지 못한다 — 무엇을 하다 굳었는지 밖에서 읽을 수 있게 그때그때 적어 둔다 */
    try { sessionStorage.setItem('fz-trail', JSON.stringify(trail.slice(-12))) } catch (e) {}
    await wait(70 + Math.floor(rnd() * 60))
    if (!look(what)) break
    if (i % 6 === 5) { await wait(120); stateCheck(what); washCheck(what) }
  }
  await wait(400)
  stateCheck('묶음 끝'); washCheck('묶음 끝')
  return { out, trail, slowest }
})()`

/* ── 시작 상태 — 멀쩡한 환자 하나. 여기서부터 손으로 망가뜨려 본다 ─── */
let seed = SEED0
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length]
const PHASES = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']
function startState() {
  const cancer = pick(ids.cancers)
  const sex = cancer === 'prostate' ? 'M' : cancer === 'gyn' ? 'F' : pick(['M', 'F'])
  return {
    patient: { ...ids.defaultPatient, cancer, sex, phase: pick(PHASES), weightKg: 45 + Math.floor(rnd() * 50), heightCm: 150 + Math.floor(rnd() * 35), age: 30 + Math.floor(rnd() * 55),
      conditions: rnd() < 0.3 ? ['호중구감소증'] : [], medications: [], subtypes: [], history: [], cuisines: ['한식'], onboarded: true },
    diary: {}, shown: {}, weights: {}, supplements: [], textSize: pick(['normal', 'normal', 'large', 'xlarge'])
  }
}
const ALL_RUNS = Array.from({ length: RUNS }, (_x, i) => ({ i, seed: (SEED0 + i * 7919) | 0, state: startState() }))
/* ONLY=3,7 — 걸린 판만 다시 본다 (판 수·횟수·씨앗은 그때와 같게 줄 것) */
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null
const runs = ONLY ? ALL_RUNS.filter((r) => ONLY.has(r.i)) : ALL_RUNS

/* ── 브라우저 ─────────────────────────────────────────── */
const servers = Array.from({ length: WORKERS }, (_x, w) => spawn('python3', ['-m', 'http.server', String(PORT + w), '--directory', SITE], { stdio: 'ignore' }))
rmSync('/tmp/harucharim-fuzz-profile', { recursive: true, force: true })
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  /*
   * 뒤에 있는 탭의 타이머를 늦추지 않게 한다. 크롬은 앞에 보이지 않는 탭의 setTimeout 을 1초에 한 번으로 묶는데,
   * 일꾼 넷 가운데 셋이 늘 뒤에 있다 — 0.1초 쉬려던 것이 1초가 되어 한 상태에 20초씩 걸렸고,
   * "응답 없음" 의 대부분이 그것이었다(앱이 느린 것이 아니었다).
   */
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/harucharim-fuzz-profile', '--window-size=900,1000', 'about:blank'], { stdio: 'ignore' })
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
        if (!/Failed to load resource|favicon|sw\.js|service worker|ERR_|net::/i.test(s)) this.errors.push(`콘솔: ${s}`)
      } else if (m.method === 'Page.javascriptDialogOpening') {
        /* confirm·alert 는 무작위로 받거나 물린다 — 붙들려 멈추지 않게 */
        this.send('Page.handleJavaScriptDialog', { accept: Math.random() < 0.5 })
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
  for (let k = w; k < runs.length; k += WORKERS) {
    const run = runs[k]
    const width = k % 2 ? 430 : 360
    await tab.send('Emulation.setDeviceMetricsOverride', { width, height: width === 430 ? 932 : 740, deviceScaleFactor: 1, mobile: true })
    /* 첫 묶음에서만 상태를 심는다. 그 뒤로는 새로 고쳐도 손으로 바꾼 것이 남아 있어야 한다 */
    const boot = `try { if (!sessionStorage.getItem('fz')) { localStorage.clear(); localStorage.setItem('harucharim.state.v1', ${JSON.stringify(JSON.stringify(run.state))});
      localStorage.setItem('harucharim.migrated', '1'); localStorage.setItem('harucharim.stats.consent', 'no');
      localStorage.setItem('harucharim.notices.read', ${JSON.stringify(JSON.stringify(ids.notices))}); sessionStorage.setItem('fz', '1') } } catch (e) {}`
    await tab.send('Runtime.evaluate', { expression: `try { sessionStorage.removeItem('fz') } catch (e) {}` })
    const sc = await tab.send('Page.addScriptToEvaluateOnNewDocument', { source: boot })
    const found = [], trail = []
    tab.errors = []
    const chunks = Math.ceil(STEPS / CHUNK)
    for (let c = 0; c < chunks; c++) {
      await tab.send('Page.navigate', { url: `http://localhost:${PORT + w}/?r=${run.i}&c=${c}` })
      for (let t = 0; t < 50; t++) {
        await sleep(120)
        const r = await tab.send('Runtime.evaluate', { expression: `location.search === '?r=${run.i}&c=${c}' && document.readyState === 'complete' && !!document.getElementById('root') && document.getElementById('root').children.length > 0`, returnByValue: true })
        if (r.result?.result?.value === true) break
      }
      let r
      try {
        r = await Promise.race([
          tab.send('Runtime.evaluate', { expression: IN_PAGE((run.seed + c * 104729) | 0, Math.min(CHUNK, STEPS - c * CHUNK), width), awaitPromise: true, returnByValue: true }),
          sleep(60000).then(() => ({ timeout: true }))
        ])
      } catch (e) { r = { crashed: String(e) } }
      if (r.timeout) {
        /* 굳은 화면에서는 아무것도 읽지 못한다. 새 탭 문맥을 열 수 없으니, 다음 판을 위해 새로 고치고 적어 둔 것을 읽는다 */
        await tab.send('Page.navigate', { url: `http://localhost:${PORT + w}/blank-${run.i}.txt` })
        await sleep(600)
        const t = await Promise.race([tab.send('Runtime.evaluate', { expression: `JSON.stringify({ doing: sessionStorage.getItem('fz-doing'), trail: JSON.parse(sessionStorage.getItem('fz-trail') || '[]'), state: (localStorage.getItem('harucharim.state.v1') || '').slice(0, 400) })`, returnByValue: true }), sleep(8000).then(() => null)])
        let info = {}; try { info = JSON.parse(t?.result?.result?.value ?? '{}') } catch {}
        found.push({ kind: '응답 없음', detail: `묶음 ${c} — 60초 안에 끝나지 않음 · 하던 일: ${info.doing ?? '?'} · 저장된 환자: ${(info.state ?? '').replace(/^.*?"patient":/, '').slice(0, 200)}`, after: info.doing ?? '', trail: info.trail ?? [] })
        break
      }
      const v = r.result?.result?.value
      if (!v) { found.push({ kind: '시험이 끊김', detail: (r.result?.exceptionDetails?.exception?.description ?? r.crashed ?? '화면이 바뀌어 끊김').slice(0, 140), after: trail.slice(-1)[0] ?? '' }); continue }
      run.slowest = Math.max(run.slowest ?? 0, v.slowest ?? 0)
      for (const f of v.out) found.push({ ...f, chunk: c, trail: [...trail, ...v.trail].slice(-12) })
      trail.push(...v.trail)
      if (v.out.some((f) => f.kind === '멈춤')) break
    }
    for (const e of [...new Set(tab.errors)].slice(0, 4)) found.push({ kind: '오류', detail: e, after: '', trail: trail.slice(-12) })
    if (found.length && results.filter((x) => x.found.some((f) => f.kind === found[0].kind)).length < 3) {
      const shot = await tab.send('Page.captureScreenshot', { format: 'png' })
      if (shot.result?.data) writeFileSync(`${OUT}/${String(run.i).padStart(3, '0')}-${found[0].kind.replace(/[\s·]/g, '').slice(0, 20)}.png`, Buffer.from(shot.result.data, 'base64'))
    }
    results.push({ i: run.i, seed: run.seed, width, steps: trail.length, slowest: Math.round(run.slowest ?? 0), found, cancer: run.state.patient.cancer, phase: run.state.patient.phase })
    await tab.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: sc.result.identifier })
    if (++done % 10 === 0) process.stdout.write(`  ${done}/${runs.length}\n`)
  }
}
await Promise.all(Array.from({ length: WORKERS }, (_x, w) => worker(w)))
stop()

/* ── 보고 ─────────────────────────────────────────────── */
results.sort((a, b) => a.i - b.i)
writeFileSync(`${OUT}/results.json`, JSON.stringify({ seed: SEED0, runs: RUNS, steps: STEPS, results }, null, 1))
const total = results.reduce((n, r) => n + r.steps, 0)
const clean = results.filter((r) => !r.found.length).length
console.log(`\n화면 무작위 입력 시험 — ${RUNS}판 · 손댄 횟수 ${total.toLocaleString()}번 · 씨앗 ${SEED0}`)
console.log(`  가장 오래 굳은 누름 ${Math.max(0, ...results.map((r) => r.slowest ?? 0))} ms`)
console.log(`  아무 문제 없이 끝난 판 ${clean}판 (${Math.round(clean / Math.max(1, results.length) * 100)}%)`)
const byKind = new Map()
for (const r of results) for (const f of r.found) {
  const g = byKind.get(f.kind) ?? { n: 0, runs: new Set(), ex: [] }
  g.n++; g.runs.add(r.i)
  const line = `[판 ${r.i} · 씨앗 ${r.seed} · ${r.cancer}/${r.phase} · ${r.width}px] ${f.detail}  ← ${f.after ?? ''}`
  if (g.ex.length < 6 && !g.ex.some((e) => e.split('] ')[1]?.split('  ←')[0] === f.detail)) g.ex.push(line + (f.trail ? `\n       직전: ${f.trail.join(' → ')}` : ''))
  byKind.set(f.kind, g)
}
for (const [k, g] of [...byKind].sort((a, b) => b[1].runs.size - a[1].runs.size)) {
  console.log(`\n■ ${k} — ${g.runs.size}판에서 ${g.n}번`)
  for (const e of g.ex) console.log('   -', e)
}
process.exitCode = byKind.size ? 1 : 0
