// 문장마다 따로 만들고, 앞뒤 빈소리를 다듬어 문장 사이에 일정한 쉼을 둔다.
// 사용: node tts-paced.mjs <작업폴더> [목소리] [출력폴더] [쉼 초] [빠르기] [장면 번호들]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const [S, VOICE = 'ko-KR-Chirp3-HD-Sulafat', OUTD = 'voice', GAP = '0.6', RATE = '0.95', ONLY] = process.argv.slice(2)
const SR = 24000, gap = Math.round(Number(GAP) * SR), cgap = Math.round(0.3 * SR)  // 문장 사이 / 쉼표 자리
const key = readFileSync(process.env.HOME + '/.config/harucharim/google-tts.key', 'utf8').trim()
let lines = JSON.parse(readFileSync(S + '/narration.json', 'utf8'))
if (ONLY) lines = ONLY.split(',').map(Number).map((i) => lines[i])
mkdirSync(`${S}/${OUTD}`, { recursive: true })
const synth = async (text) => {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'ko-KR', name: VOICE }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SR, speakingRate: Number(RATE) } })
  })
  if (!r.ok) { console.error('TTS 실패', r.status, (await r.text()).slice(0, 200)); process.exit(1) }
  const b = Buffer.from((await r.json()).audioContent, 'base64')
  const pcm = new Int16Array(b.buffer.slice(b.byteOffset + 44, b.byteOffset + b.length - ((b.length - 44) % 2)))
  // 앞뒤 빈소리 다듬기: 진폭 400 넘는 첫·끝 자리에서 40ms 여유
  let a = 0, z = pcm.length - 1
  while (a < z && Math.abs(pcm[a]) < 400) a++
  while (z > a && Math.abs(pcm[z]) < 400) z--
  return pcm.slice(Math.max(0, a - SR * 0.04), Math.min(pcm.length, z + SR * 0.08))
}
const wav = (pcm) => { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length * 2, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length * 2, 40); return Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.length * 2)]) }
const secs = []
for (const [i, line] of lines.entries()) {
  const sents = line.match(/[^.?!]+[.?!]+/g).map((s) => s.trim())
  const parts = []
  // 쉼표에서도 끊어 만든다 — 한 번에 읽히면 쉼표를 건너뛰고 붙여 읽었다("예로 들면호중구", "158개참고문헌", 사용자 보고)
  for (const [k, s] of sents.entries()) {
    const bits = s.split(/(?<=,)\s+/)
    for (const [j, b] of bits.entries()) { parts.push(await synth(b)); if (j < bits.length - 1) parts.push(new Int16Array(cgap)) }
    if (k < sents.length - 1) parts.push(new Int16Array(gap))
  }
  const all = new Int16Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length }
  writeFileSync(`${S}/${OUTD}/${String(i).padStart(2, '0')}.wav`, wav(all))
  secs.push(+(all.length / SR).toFixed(2)); console.log(i, sents.length + '문장', (line.match(/,/g) || []).length + '쉼표', (all.length / SR).toFixed(2) + '초')
}
writeFileSync(`${S}/${OUTD}/secs.json`, JSON.stringify(secs))
