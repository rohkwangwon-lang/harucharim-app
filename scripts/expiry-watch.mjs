#!/usr/bin/env node
/**
 * 만료·휴면 지킴이.
 *
 * 하루차림은 기한이 있는 것들에 기대고 있다 — 도메인(3년), 공공데이터 인증키(대략 1년),
 * 그리고 7일 동안 요청이 없으면 잠드는 Supabase 무료 요금제.
 * 기한은 사람이 기억하면 반드시 한 번은 놓친다. 그래서 사흘마다 기계가 센다.
 *
 *   node scripts/expiry-watch.mjs            점검하고 ops/expiry-status.md 를 쓴다
 *   node scripts/expiry-watch.mjs --issues   알릴 것이 있으면 GitHub 이슈를 연다(gh 필요)
 *
 * 이슈는 선생님께 배정하고 본문에서 이름을 불러, GitHub 가 메일로 알린다.
 * 연결값(Supabase 주소·키)은 어디에도 찍지 않는다.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const LIST = 'ops/expiry.json'
const STATUS = 'ops/expiry-status.md'
const LABEL = '만료알림'

/** 한국 날짜 'YYYY-MM-DD' — 러너는 UTC 로 돈다 */
export function kstToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10)
}

/** a 에서 b 까지 며칠 */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400e3)
}

/**
 * 몇 일 전 알림에 해당하는가.
 * 남은 날이 90 이하이면 90, 30 이하이면 30 … 가장 가까운 문턱을 돌려준다. 지났으면 'past'.
 */
export function stageFor(daysLeft, leads) {
  if (daysLeft < 0) return 'past'
  const hit = [...leads].sort((x, y) => x - y).find((l) => daysLeft <= l)
  return hit ?? null
}

/** 등록소 원장에서 실제 만료일을 읽는다 — 가비아에서 연장하면 여기가 먼저 바뀐다 */
async function rdapExpiry(host) {
  if (!host.endsWith('.com')) return null
  try {
    const r = await fetch(`https://rdap.verisign.com/com/v1/domain/${host}`)
    if (!r.ok) return null
    const d = await r.json()
    const ev = (d.events ?? []).find((e) => e.eventAction === 'expiration')
    return ev ? ev.eventDate.slice(0, 10) : null
  } catch {
    return null
  }
}

/**
 * Supabase 를 깨운다.
 * 인증 서버가 살아 있는지 보고, 데이터베이스까지 한 번 닿게 한다 —
 * 읽을 권한이 없어도 거절 자체가 데이터베이스를 거쳐 돌아온다.
 */
async function pingSupabase() {
  const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY ?? ''
  if (!url || !key) return { state: 'skip', note: '연결값이 없어 건너뜀 (로컬에서 돌린 경우)' }
  try {
    const h = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } })
    const db = await fetch(`${url}/rest/v1/of_inquiries?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    })
    const ok = h.ok && db.status < 500
    return { state: ok ? 'ok' : 'down', note: `인증 ${h.status} · 데이터베이스 ${db.status}` }
  } catch (e) {
    return { state: 'down', note: `닿지 않음 (${e?.cause?.code ?? e?.name ?? '연결 실패'})` }
  }
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf-8' })
}

/** 같은 제목의 열린 이슈가 있으면 새로 열지 않는다 */
function openIssue(owner, title, body) {
  gh(['label', 'create', LABEL, '--color', 'B60205', '--description', '하루차림 만료·휴면 알림', '--force'])
  const found = JSON.parse(gh(['issue', 'list', '--label', LABEL, '--state', 'open', '--limit', '100', '--json', 'title']))
  if (found.some((i) => i.title === title)) return '이미 열려 있음'
  gh(['issue', 'create', '--title', title, '--body', body, '--label', LABEL, '--assignee', owner])
  return '새로 엶'
}

const STAGE_WORD = { 90: '90일 전', 30: '30일 전', 7: '7일 전', past: '기한 지남' }

async function main() {
  const list = JSON.parse(readFileSync(LIST, 'utf-8'))
  const today = kstToday()
  const month = today.slice(0, 7)
  const alerts = []
  const rows = []

  for (const it of list.items) {
    if (it.kind === 'dormancy') {
      const p = await pingSupabase()
      rows.push([it.name, '—', '—', p.state === 'ok' ? '깨어 있음' : p.state === 'skip' ? '건너뜀' : '⚠️ 응답 이상'])
      if (p.state === 'down') {
        alerts.push({
          title: `[휴면 알림] ${it.name} — 응답하지 않습니다`,
          body: `@${list.owner} ${today} 점검에서 Supabase 가 제대로 응답하지 않았습니다 (${p.note}).\n\n` +
            `**영향** ${it.impact}\n\n**할 일** ${it.renew}\n\n` +
            `복구하신 뒤 이 이슈를 닫아 주십시오. 사흘 뒤 다시 점검합니다.`
        })
      }
      continue
    }

    let expires = it.expires
    let note = it.confirmed ? '' : ' (추정)'
    if (it.kind === 'domain') {
      const real = await rdapExpiry(it.host)
      if (real) {
        note = ' (원장 확인)'
        if (real !== it.expires) note = ` (원장은 ${real} — ops/expiry.json 을 고칠 것)`
        expires = real
      } else {
        note = ' (원장 조회 실패 — 목록의 날짜로 셈)'
      }
    }

    const left = daysBetween(today, expires)
    const stage = stageFor(left, list.leadDays)
    const months = Math.max(0, Math.floor(left / 30.44))
    rows.push([it.name, expires + note, left < 0 ? '지남' : `약 ${months}개월`, stage ? `⚠️ ${STAGE_WORD[stage]}` : '여유'])

    if (stage) {
      alerts.push({
        title: `[만료 알림] ${it.name} — ${STAGE_WORD[stage]} (${expires})`,
        body: `@${list.owner} ${it.name} 의 기한이 ${left < 0 ? `${-left}일 지났습니다` : `${left}일 남았습니다`} — ${expires}${note}.\n\n` +
          `**영향** ${it.impact}\n\n**할 일** ${it.renew}\n\n` +
          (it.confirmed ? '' : `> 이 날짜는 **추정**입니다. 실제 기한을 확인하시면 \`ops/expiry.json\` 의 expires 를 고치고 confirmed 를 true 로 바꿔 주십시오.\n\n`) +
          `연장하신 뒤 \`ops/expiry.json\` 의 날짜를 새 기한으로 고치고 이 이슈를 닫아 주십시오.`
      })
    }
  }

  /*
   * 기록은 달 단위로만 바뀌게 쓴다 — 사흘마다 고치면 커밋이 쌓인다.
   * 그래도 한 달에 한 번은 반드시 바뀌므로, 공개 저장소에서 60일 동안 활동이 없으면
   * GitHub 가 예약 작업을 멈추는 규칙에 걸리지 않는다.
   */
  const md = [
    '# 만료·휴면 점검 기록',
    '',
    '`.github/workflows/expiry-watch.yml` 이 사흘마다 점검하고, 달이 바뀌거나 상태가 바뀔 때만 이 파일을 고쳐 씁니다.',
    '알릴 것이 생기면 `만료알림` 이슈가 열리고 GitHub 가 메일로 알립니다. 기한과 할 일은 `ops/expiry.json` 에 있습니다.',
    '',
    `점검한 달: ${month}`,
    '',
    '| 항목 | 기한 | 남은 기간 | 상태 |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.join(' | ')} |`),
    ''
  ].join('\n')
  writeFileSync(STATUS, md)

  console.log(`만료·휴면 점검 ${today}`)
  for (const r of rows) console.log(`  ${r[3].padEnd(10)} ${r[0]} — ${r[1]}`)

  if (process.argv.includes('--issues')) {
    for (const a of alerts) console.log(`  이슈 ${openIssue(list.owner, a.title, a.body)}: ${a.title}`)
  } else if (alerts.length) {
    console.log(`  알릴 것 ${alerts.length}건 (--issues 로 돌리면 이슈를 엽니다)`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error('점검 실패:', e?.message ?? e); process.exit(1) })
}
