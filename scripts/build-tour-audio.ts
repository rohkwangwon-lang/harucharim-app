/**
 * 움직이는 사용법의 음성 파일 만들기(2026-10-23).
 *
 * 기기 음성(Web Speech)은 기계 티가 난다는 사용자 지적이 있어, 자연스러운 신경망 음성으로 자막을 미리 녹음해 둔다.
 * 앱은 public/tour/audio.json 에 적힌 파일이 있으면 그것을 틀고, 없으면 기기 음성으로 읽는다(그래서 이 파일이 없어도 앱은 된다).
 *
 * 쓰는 법
 *   GOOGLE_TTS_KEY=<키> node_modules/.bin/jiti scripts/build-tour-audio.ts          # Google Cloud Text-to-Speech(기본 ko-KR-Neural2-A)
 *   GOOGLE_TTS_KEY=<키> TTS_VOICE=ko-KR-Neural2-C node_modules/.bin/jiti scripts/build-tour-audio.ts
 *   ENGINE=say node_modules/.bin/jiti scripts/build-tour-audio.ts                  # 맥의 '유나' 로 (품질은 기기 음성과 같음 — 통로 시험용)
 *
 *  - 자막은 components/Tour.tsx 에서 읽어 온다(say: '…' 와 tabTap('…')). 자막이 바뀌면 그 자막만 새로 만든다.
 *  - 키는 환경변수로만 받고 어디에도 적지 않는다. Google 무료 범위(한 달 백만 자)에 한참 못 미친다(자막 전체 약 4천 자).
 *  - 없어진 자막의 파일은 지운다.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { toSpeech, hashText } from '../src/lib/tourSpeech'

const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'public', 'tour')
const MANIFEST = join(OUT, 'audio.json')
const ENGINE = process.env.ENGINE ?? (process.env.GOOGLE_TTS_KEY ? 'google' : '')
const VOICE = process.env.TTS_VOICE ?? 'ko-KR-Neural2-A'

const src = readFileSync(join(ROOT, 'src/components/Tour.tsx'), 'utf-8')
const lines = new Set<string>()
for (const m of src.matchAll(/say: '((?:[^'\\]|\\.)*)'/g)) lines.add(m[1].replace(/\\'/g, "'"))
for (const m of src.matchAll(/tabTap\('((?:[^'\\]|\\.)*)'/g)) lines.add(m[1].replace(/\\'/g, "'"))
if (lines.size < 20) { console.error(`자막을 ${lines.size}개밖에 못 읽음 — Tour.tsx 의 적는 법이 바뀌었나?`); process.exit(1) }

if (!ENGINE) {
  console.log(`자막 ${lines.size}개(${[...lines].join('').length}자). 만들려면 GOOGLE_TTS_KEY 를 주거나 ENGINE=say 로 돌리세요.`)
  process.exit(0)
}
mkdirSync(OUT, { recursive: true })
/* 지난 목록은 clips 칸 안에 있다 — 뿌리에서 찾으면 매번 전부 다시 만든다(첫 실행에서 그랬다) */
const old: Record<string, string> = existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf-8')).clips ?? {}) : {}
const next: Record<string, string> = {}
const secs: Record<string, number> = {}
let made = 0
function seconds(file: string): number {
  try { const m = execFileSync('afinfo', [file]).toString().match(/estimated duration: ([\d.]+)/); if (m) return Math.round(Number(m[1]) * 10) / 10 } catch { /* afinfo 없음 */ }
  return Math.round(readFileSync(file).length / 15500 * 10) / 10
}

async function google(text: string): Promise<Buffer> {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_KEY!)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'ko-KR', name: VOICE }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.96, pitch: 0 } })
  })
  if (!r.ok) throw new Error(`Google TTS ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const j = await r.json() as { audioContent: string }
  return Buffer.from(j.audioContent, 'base64')
}
function say(text: string, file: string) {
  const aiff = file.replace(/\.m4a$/, '.aiff')
  execFileSync('say', ['-v', 'Yuna', '-r', '175', '-o', aiff, text])
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', aiff, file])
  unlinkSync(aiff)
}

async function main() {
for (const line of lines) {
  const h = hashText(line)
  const ext = ENGINE === 'say' ? 'm4a' : 'mp3'
  const name = `${h}.${ext}`
  next[h] = name
  if (old[h] === name && existsSync(join(OUT, name))) { secs[h] = seconds(join(OUT, name)); continue }
  const spoken = toSpeech(line)
  if (ENGINE === 'say') say(spoken, join(OUT, name))
  else writeFileSync(join(OUT, name), await google(spoken))
  secs[h] = seconds(join(OUT, name))
  made++
  process.stdout.write(`\r만든 것 ${made}`)
}
for (const f of readdirSync(OUT)) if (f !== 'audio.json' && !Object.values(next).includes(f)) unlinkSync(join(OUT, f))
writeFileSync(MANIFEST, JSON.stringify({ engine: ENGINE, voice: ENGINE === 'say' ? 'Yuna' : VOICE, made: new Date().toISOString().slice(0, 10), clips: next, secs }, null, 0))
console.log(`\n끝 — 자막 ${lines.size}개, 새로 만든 것 ${made}개, ${ENGINE === 'say' ? '유나(맥)' : VOICE}. public/tour/audio.json`)
}
main().catch((e) => { console.error(String(e)); process.exit(1) })
