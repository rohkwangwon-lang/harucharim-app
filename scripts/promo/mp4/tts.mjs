import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const [S] = process.argv.slice(2)
const key = readFileSync(process.env.HOME + '/.config/harucharim/google-tts.key', 'utf8').trim()
const lines = JSON.parse(readFileSync(S + '/narration.json', 'utf8'))
mkdirSync(S + '/voice', { recursive: true })
const secs = []
for (const [i, text] of lines.entries()) {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-A' }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 0.96, pitch: 0 } })
  })
  if (!r.ok) { console.error('TTS 실패', i, r.status); process.exit(1) }
  const buf = Buffer.from((await r.json()).audioContent, 'base64')
  writeFileSync(`${S}/voice/${String(i).padStart(2, '0')}.wav`, buf)
  const sec = (buf.length - 44) / (24000 * 2)
  secs.push(+sec.toFixed(2)); console.log(i, sec.toFixed(2) + '초')
}
writeFileSync(S + '/voice/secs.json', JSON.stringify(secs))
