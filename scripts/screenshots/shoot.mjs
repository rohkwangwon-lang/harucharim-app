/*
 * 스토어 스크린샷을 찍는다.
 * headless 크롬의 --window-size 는 폭 500 px 아래로 내려가지 않는다(그래서 430 으로 주면
 * 화면은 500 으로 짜이고 사진만 잘려 오른쪽이 날아갔다). CDP 의 기기 메트릭 재정의로 잡는다.
 */
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333
const OUT = new URL('./raw/', import.meta.url).pathname
const W = 430, H = 932, DSF = 3

const SHOTS = [
  ['1-suggest', 'shot=추천'],
  ['2-why', 'shot=추천&why=1'],
  ['3-search', 'shot=찾기&q=' + encodeURIComponent('자몽') + '&pick=' + encodeURIComponent('자몽')],
  ['4-supp', 'shot=영양제&to=' + encodeURIComponent('피하시는 편이 좋습니다')],
  ['5-diary', 'shot=기록'],
  ['6-guide', 'shot=가이드&sub=암종 가이드']
]

mkdirSync(OUT, { recursive: true })
/* 서비스 워커가 지난번 index.html 을 붙들고 있으면 고쳐도 그대로 나온다. 프로필째 지운다 */
rmSync('/tmp/harucharim-shot-profile', { recursive: true, force: true })

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/harucharim-shot-profile`,
  '--window-size=900,1000', 'about:blank'
], { stdio: 'ignore' })

async function waitChrome() {
  for (let i = 0; i < 80; i++) {
    try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); return } catch { await sleep(300) }
  }
  throw new Error('크롬이 뜨지 않음')
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map()
    ws.onmessage = (e) => { const m = JSON.parse(e.data); const r = this.waiting.get(m.id); if (r) { this.waiting.delete(m.id); r(m) } } }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res) => { this.waiting.set(id, res); this.ws.send(JSON.stringify({ id, method, params })) })
  }
}

async function open(url) {
  /* 최신 크롬은 /json/new 를 PUT 으로만 받는다 */
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => { ws.onopen = r })
  return { cdp: new Cdp(ws), id: t.id }
}

await waitChrome()
const ok = []
for (const [name, query] of SHOTS) {
  const { cdp, id } = await open('about:blank')
  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: DSF, mobile: true
  })
  await cdp.send('Page.navigate', { url: `http://localhost:8791/?${query}` })

  let ready = false
  for (let i = 0; i < 60; i++) {
    await sleep(300)
    const r = await cdp.send('Runtime.evaluate', {
      expression: `document.documentElement.getAttribute('data-shot-ready')`, returnByValue: true
    })
    if (r.result?.result?.value === '1') { ready = true; break }
  }
  await sleep(600)

  const size = await cdp.send('Runtime.evaluate', { expression: 'innerWidth', returnByValue: true })
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`${OUT}${name}.png`, Buffer.from(shot.result.data, 'base64'))
  ok.push(`${name}  innerWidth=${size.result?.result?.value}  ready=${ready}`)
  await fetch(`http://127.0.0.1:${PORT}/json/close/${id}`, { method: 'PUT' })
}

console.log(ok.join('\n'))
chrome.kill()
