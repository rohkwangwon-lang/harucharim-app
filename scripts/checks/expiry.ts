/**
 * 만료·휴면 검사.
 *
 * 기한 목록(ops/expiry.json)은 한 번 만들고 나면 아무도 다시 보지 않는다.
 * 그 사이 새 인증키를 붙이거나 새 공공 API 를 부르기 시작하면, 그것은 목록 밖에서
 * 조용히 기한을 향해 간다. 이 검사는 목록이 실제로 기대고 있는 것을 다 덮는지를 본다.
 *
 *   1. .env.example 에 있는 수집용 키가 모두 목록에 있는가
 *   2. 수집 스크립트가 부르는 바깥 주소가 모두 목록에 있는가
 *   3. 도메인이 public/CNAME 과 같은가
 *   4. 휴면 점검 간격이 잠드는 기한보다 짧은가
 *   5. 알림 문턱 계산이 맞는가 — 잣대는 여기서 따로 세운다
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { daysBetween, stageFor } from '../expiry-watch.mjs'

const bads: string[] = []
function no(cond: boolean, msg: string) { if (cond) bads.push(msg) }

const LIST = 'ops/expiry.json'
no(!existsSync(LIST), `${LIST} 이 없음 — 기한 목록이 사라졌다`)
const list = existsSync(LIST) ? JSON.parse(readFileSync(LIST, 'utf-8')) : { items: [], leadDays: [] }
const items: any[] = list.items ?? []
const DATE = /^\d{4}-\d{2}-\d{2}$/

/* ── 0. 목록 자체 ─────────────────────────────────────── */
no(!list.owner, '알림을 받을 사람(owner)이 비어 있음 — 이슈를 아무에게도 배정하지 못한다')
no(!Array.isArray(list.leadDays) || list.leadDays.length === 0, '알림 문턱(leadDays)이 비어 있음')
const unconfirmed: string[] = []
for (const it of items) {
  no(!it.id || !it.name || !it.kind, `목록 항목에 id·name·kind 가 빠짐 — ${JSON.stringify(it).slice(0, 60)}`)
  no(!it.impact || !it.renew, `${it.name} — 멈추면 무엇이 되는지(impact)와 어떻게 살리는지(renew)가 있어야 알림이 쓸모 있다`)
  if (it.kind === 'domain' || it.kind === 'apikey') {
    no(!DATE.test(it.expires ?? ''), `${it.name} — 기한이 YYYY-MM-DD 가 아님 (${it.expires})`)
    if (!it.confirmed) unconfirmed.push(it.name)
  }
}

/* ── 1. 수집용 키가 모두 목록에 있는가 ──────────────────────── */
const envNames = existsSync('.env.example')
  ? [...readFileSync('.env.example', 'utf-8').matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1])
  : []
no(envNames.length === 0, '.env.example 에서 키 이름을 읽지 못함 — 이 검사가 헛돌고 있다')
const covered = new Set(items.flatMap((it) => it.env ?? []))
for (const k of envNames) {
  if (k.startsWith('VITE_')) continue            // 앱이 쓰는 공개 연결값 — 휴면 항목이 따로 지킨다
  no(!covered.has(k), `인증키 ${k} 가 기한 목록에 없음 — 만료돼도 아무도 모른다`)
}

/* ── 2. 수집 스크립트가 부르는 바깥 주소가 모두 목록에 있는가 ─────── */
const hosts = new Set(items.flatMap((it) => it.hosts ?? []))
const fetchers = readdirSync('scripts').filter((f) => /^fetch-.*\.mjs$/.test(f))
no(fetchers.length === 0, 'scripts/fetch-*.mjs 를 하나도 못 찾음 — 이 검사가 헛돌고 있다')
for (const f of fetchers) {
  const src = readFileSync(`scripts/${f}`, 'utf-8')
  for (const m of src.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    no(!hosts.has(m[1].toLowerCase()), `${f} 가 부르는 ${m[1]} 가 기한 목록에 없음`)
  }
}

/* ── 3. 도메인 ─────────────────────────────────────────── */
const cname = existsSync('public/CNAME') ? readFileSync('public/CNAME', 'utf-8').trim() : ''
const dom = items.find((it) => it.kind === 'domain')
no(Boolean(cname) && !dom, `public/CNAME 은 ${cname} 인데 기한 목록에 도메인이 없음`)
no(Boolean(dom) && dom.host !== cname, `기한 목록의 도메인(${dom?.host})이 public/CNAME(${cname})과 다름`)

/* ── 4. 휴면 점검 간격 ─────────────────────────────────── */
const WF = '.github/workflows/expiry-watch.yml'
const wf = existsSync(WF) ? readFileSync(WF, 'utf-8') : ''
/*
 * 주석을 걷어 낸 본문. 워크플로 주석에 "service_role 키는 쓰지 않는다" 같은 경고를 적어 두는데,
 * 그 경고 글자에 걸려 '키가 있다' 고 잘못 외친 적이 있다. 설정만 보고 판단한다.
 */
const wfCode = wf.split('\n').filter((l) => !l.trim().startsWith('#')).map((l) => l.replace(/\s#.*$/, '')).join('\n')
no(!wf, `${WF} 이 없음 — 목록은 있는데 아무도 세지 않는다`)
if (wf) {
  const cron = wfCode.match(/cron:\s*'([^']+)'/)?.[1] ?? ''
  const every = Number(cron.split(/\s+/)[2]?.match(/^\*\/(\d+)$/)?.[1] ?? NaN)
  no(!Number.isFinite(every), `예약 간격을 읽지 못함 (${cron}) — 날(日) 칸을 */N 으로 적을 것`)
  for (const it of items.filter((x) => x.kind === 'dormancy')) {
    // 날(日) 칸의 'N일마다' 는 달이 바뀌면 1일로 되돌아가며 간격이 벌어진다(29일 → 다음 달 1일).
    // 가장 벌어질 때는 N+2일쯤이므로 그만큼 여유를 두고 견준다.
    // (여기에 별표-빗금을 붙여 적으면 블록 주석이 거기서 닫혀 버린다 — 실제로 한 번 그랬다.)
    no(Number.isFinite(every) && every + 2 >= it.maxIdleDays,
       `${it.name} — 사흘마다가 아니라 ${every}일마다 깨우면 월말에 ${it.maxIdleDays}일을 넘길 수 있다`)
  }
  no(!/issues:\s*write/.test(wfCode), '지킴이에 이슈 쓰기 권한이 없음 — 알릴 길이 없다')
  no(!/contents:\s*write/.test(wfCode), '지킴이에 기록 쓰기 권한이 없음 — 60일 뒤 GitHub 가 예약 작업을 멈춘다')
  no(!/SUPABASE_ANON_KEY:\s*\$\{\{\s*secrets\.VITE_SUPABASE_ANON_KEY/.test(wfCode),
     '지킴이가 Supabase 연결값을 받지 않음 — 휴면 점검이 늘 건너뛴다')
  no(/service_role|SERVICE_ROLE/.test(wfCode), '지킴이에 service_role 키가 있음 — 절대 쓰지 말 것')
}

/* ── 5. 알림 문턱 계산 — 잣대를 스크립트에서 빌리지 않는다 ─────── */
const leads = [90, 30, 7]
const STAGES: [number, number | 'past' | null][] = [
  [91, null], [90, 90], [31, 90], [30, 30], [8, 30], [7, 7], [1, 7], [0, 7], [-1, 'past']
]
for (const [left, want] of STAGES) {
  const got = stageFor(left, leads)
  no(got !== want, `남은 ${left}일 → ${String(got)} 이 나옴 (${String(want)} 이어야)`)
}
no(daysBetween('2029-06-11', '2029-09-09') !== 90, '날짜 셈이 틀림 — 2029-06-11 에서 09-09 까지는 90일')
no(daysBetween('2028-02-28', '2028-03-01') !== 2, '윤년 셈이 틀림 — 2028-02-28 에서 03-01 까지는 2일')

/* ── 6. 연결값을 찍지 않는가 ───────────────────────────── */
const watch = readFileSync('scripts/expiry-watch.mjs', 'utf-8')
no(/console\.(log|error)\([^)]*(url|key|process\.env)/i.test(watch),
   '지킴이가 연결값을 찍을 수 있음 — 공개 저장소의 실행 기록은 누구나 본다')

console.log(bads.length
  ? `만료 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
  : `만료 검사 완료 — 기한 ${items.length}가지·키 ${envNames.filter((k) => !k.startsWith('VITE_')).length}개·바깥 주소 ${hosts.size}곳 대조, 문제 없음` +
    (unconfirmed.length ? `\n  (추정 기한 ${unconfirmed.length}가지 — 실제 날짜를 확인해 ops/expiry.json 에 적을 것: ${unconfirmed.join(', ')})` : ''))
