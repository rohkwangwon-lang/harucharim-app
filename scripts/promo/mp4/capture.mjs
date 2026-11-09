// 모집 영상 페이지(public/tester/video.html)를 프레임마다 찍는다.
// 페이지 시계를 직접 옮기고, CSS 전환(서서히 나타남)도 멈춘 채 그 시각으로 맞춰 매 프레임이 정확하다.
// 사용: node capture.mjs <tester 폴더> <프레임 출력 폴더> [fps]
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import path from 'node:path'

const [SRC, OUT, FPS_ARG, MAP] = process.argv.slice(2)
const TL = MAP ? JSON.parse(readFileSync(MAP, 'utf8')) : null
const FPS = Number(FPS_ARG || 30)
const WORK = path.join(path.dirname(OUT), 'site')
rmSync(WORK, { recursive: true, force: true }); cpSync(SRC, WORK, { recursive: true })
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true })

let html = readFileSync(path.join(WORK, 'video.html'), 'utf8')
const hook = 'draw();requestAnimationFrame(tick);'
if (!html.includes(hook)) throw new Error('video.html 시계 자리를 못 찾음')
html = html.replace(hook, 'window.__END=END;window.__seek=function(v){t=v;done=v>=END;paused=true;draw()};' + hook)
// 영상 파일에서는 누를 수 없는 단추·멈춤 표시를 감춘다
html = html.replace('</head>', '<style>#more,#again,#hint{display:none!important}#stage{cursor:default}</style></head>')
writeFileSync(path.join(WORK, 'cap.html'), html)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 8873, CDP = 9363
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', WORK], { stdio: 'ignore' })
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/harucharim-vidcap-profile', 'about:blank'], { stdio: 'ignore' })
const stop = () => { try { chrome.kill() } catch {} try { srv.kill() } catch {} }
process.on('exit', stop)
for (let i = 0; i < 60; i++) { try { await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json(); break } catch { await sleep(300) } }

const t = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => { ws.onopen = r })
let id = 0; const wait = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; wait.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value

await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/cap.html#t=0` })
for (let i = 0; i < 120; i++) {
  await sleep(500)
  if (await ev(`document.readyState==='complete'&&document.fonts.status==='loaded'&&typeof __seek==='function'`)) break
}
await ev(`document.fonts.ready.then(()=>true)`)
await sleep(800)
// 전환 시계: 새로 생긴 전환은 생긴 시각을 적어 두고, 멈춘 채 (지금 - 생긴 시각)으로 맞춘다
await ev(`window.__born=new Map();window.__frame=function(p,v){__seek(p);for(const a of document.getAnimations()){if(!__born.has(a))__born.set(a,v===0?-10:v);a.pause();a.currentTime=Math.max(0,(v-__born.get(a))*1000)}return true}`)
const END = await ev('__END')
const TOTAL = TL ? TL.total : END
const N = Math.round(TOTAL * FPS)
const pageAt = (v) => { if (!TL) return Math.min(v, END); let s = TL.segs[0]; for (const x of TL.segs) if (v >= x[0]) s = x; return Math.min(END, s[2] + (v - s[0]) * s[3] / s[1]) }
console.log(`길이 ${TOTAL}초 · ${FPS}fps · ${N}장`)
const t0 = Date.now()
for (let f = 0; f < N; f++) {
  await ev(`__frame(${pageAt(f / FPS).toFixed(5)},${(f / FPS).toFixed(5)})`)
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 } })
  writeFileSync(path.join(OUT, String(f).padStart(5, '0') + '.jpg'), Buffer.from(r.result.data, 'base64'))
  if (f % 300 === 0) console.log(`  ${f}/${N} (${Math.round((Date.now() - t0) / 1000)}초)`)
}
console.log(`끝 ${Math.round((Date.now() - t0) / 1000)}초`)
ws.close(); stop(); process.exit(0)
