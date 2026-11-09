import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const [S, VOICE = 'ko-KR-Chirp3-HD-Achird', OUTD = 'voice', ONLY] = process.argv.slice(2)
const key = readFileSync(process.env.HOME + '/.config/harucharim/google-tts.key', 'utf8').trim()
let lines = JSON.parse(readFileSync(S + '/narration.json', 'utf8'))
if (ONLY) lines = ONLY.split(',').map(Number).map((i) => lines[i])
mkdirSync(`${S}/${OUTD}`, { recursive: true })
const secs = []
for (const [i, text] of lines.entries()) {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'ko-KR', name: VOICE }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, ...(VOICE.includes('Chirp3') ? {} : { speakingRate: 0.96, pitch: 0 }) } })
  })
  if (!r.ok) { console.error('TTS 실패', i, r.status, (await r.text()).slice(0, 200)); process.exit(1) }
  const buf = Buffer.from((await r.json()).audioContent, 'base64')
  writeFileSync(`${S}/${OUTD}/${String(i).padStart(2, '0')}.wav`, buf)
  const sec = (buf.length - 44) / (24000 * 2)
  secs.push(+sec.toFixed(2)); console.log(i, sec.toFixed(2) + '초')
}
writeFileSync(`${S}/${OUTD}/secs.json`, JSON.stringify(secs))
