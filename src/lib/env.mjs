/**
 * .env 로더 (수집 스크립트 전용).
 *
 * 공공데이터포털 키는 Encoding/Decoding 두 형태가 있는데, Encoding 키를 다시
 * URL 인코딩하면 `%2B` 가 `%252B` 가 되어 "등록되지 않은 서비스키" 오류가 난다.
 * 그래서 어떤 형태를 넣든 한 번만 인코딩되도록 여기서 정규화한다.
 */
import fs from 'node:fs'
import path from 'node:path'

export function loadEnv(cwd = process.cwd()) {
  const p = path.resolve(cwd, '.env')
  if (!fs.existsSync(p)) {
    console.error('.env 파일이 없습니다. `cp .env.example .env` 후 키를 넣으세요.')
    process.exit(1)
  }
  const out = {}
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).split('#')[0].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

/** 서비스키를 URL 에 넣을 수 있는 형태로 정규화한다 (이중 인코딩 방지) */
export function serviceKey(raw) {
  if (!raw) return ''
  // 이미 인코딩된 키(%XX 포함)는 그대로 쓴다
  if (/%[0-9A-Fa-f]{2}/.test(raw)) return raw
  return encodeURIComponent(raw)
}

/** 로그에 키가 새지 않도록 가린다 */
export function redact(text, env) {
  let out = String(text)
  for (const v of Object.values(env)) {
    if (v && v.length > 8) out = out.split(v).join('***')
  }
  return out
}
