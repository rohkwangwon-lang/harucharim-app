/**
 * 공지 검사.
 *
 * 이용약관 10항과 처리방침 11항이 이렇게 약속하고 있다 —
 * "시행일 7일 전(이용자에게 불리한 변경은 30일 전)에 앱 안에 알리겠습니다."
 *
 * 이 검사는 그 약속을 사람의 기억이 아니라 날짜 계산으로 지킨다.
 * 간격을 못 채운 공지가 하나라도 있으면 배포 전에 여기서 멈춘다.
 *
 * 잣대를 앱에서 빌리지 않는다 — lib/notice.ts 의 함수를 부르지 않고
 * 날짜를 여기서 직접 센다. 그 파일이 틀리면 함께 틀려 버리기 때문이다.
 */
import { NOTICES, NOTICE_LEAD_DAYS, type Notice } from '../../src/data/notices'
import { readFileSync, existsSync } from 'node:fs'

const problems: string[] = []
const say = (m: string) => problems.push(m)

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** 두 날짜 사이의 일수 — Date 를 쓰지 않고 세어 본다 */
function toDays(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  /* 1970-01-01 부터의 일수. 윤년을 그대로 센다 */
  let days = 0
  for (let yy = 1970; yy < y; yy++) days += leap(yy) ? 366 : 365
  const len = [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  for (let mm = 1; mm < m; mm++) days += len[mm - 1]
  return days + d - 1
}
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

const seen = new Set<string>()

for (const n of NOTICES as Notice[]) {
  const where = `공지 ${n.id}`

  if (seen.has(n.id)) say(`${where} — id 가 겹친다. 읽음 표시가 서로 덮어쓴다`)
  seen.add(n.id)

  if (!DATE.test(n.postAt)) say(`${where} — 게시일 형식이 YYYY-MM-DD 가 아니다 (${n.postAt})`)
  if (!n.title.trim()) say(`${where} — 제목이 비었다`)
  if (n.body.length === 0 || n.body.some((p) => !p.trim())) say(`${where} — 본문이 비었다`)

  /* 약관·방침 개정이면 시행일이 있어야 하고, 고지 간격을 지켜야 한다 */
  if (n.kind === 'terms' || n.kind === 'privacy') {
    if (!n.effectiveAt) {
      say(`${where} — 약관·방침 개정인데 시행일이 없다`)
    } else if (!DATE.test(n.effectiveAt)) {
      say(`${where} — 시행일 형식이 YYYY-MM-DD 가 아니다 (${n.effectiveAt})`)
    } else {
      const lead = toDays(n.effectiveAt) - toDays(n.postAt)
      const need = n.adverse ? NOTICE_LEAD_DAYS.adverse : NOTICE_LEAD_DAYS.normal
      if (lead < need) {
        say(
          `${where} — 알린 날(${n.postAt})과 시행일(${n.effectiveAt}) 사이가 ${lead}일뿐이다. ` +
          `${n.adverse ? '불리한 변경은' : '약관·방침 개정은'} ${need}일이 필요하다 (약관 10항)`
        )
      }
    }
  }

  if (n.link) {
    if (!existsSync(`public/${n.link}`)) say(`${where} — 걸어 둔 문서 public/${n.link} 가 없다`)
  }
}

/*
 * 문서에 적힌 시행일과 공지에 적힌 시행일이 같아야 한다.
 * 하나만 고치고 다른 하나를 두고 오는 것이 이 프로젝트에서 일곱 번 있었다.
 */
const DOC: Record<string, string> = { terms: 'public/terms.html', privacy: 'public/privacy.html' }
for (const kind of ['terms', 'privacy'] as const) {
  const latest = NOTICES
    .filter((n) => n.kind === kind && n.effectiveAt)
    .sort((a, b) => (a.effectiveAt! < b.effectiveAt! ? 1 : -1))[0]
  if (!latest) continue

  const html = readFileSync(DOC[kind], 'utf-8')
  const [y, m, d] = latest.effectiveAt!.split('-').map(Number)
  const korean = `시행일 ${y}년 ${m}월 ${d}일`
  if (!html.includes(korean)) {
    say(`${DOC[kind]} — 공지는 시행일을 ${latest.effectiveAt} 이라 하는데 문서에 "${korean}" 이 없다`)
  }
}

/* 문서가 약속한 일수와 코드가 쓰는 일수가 같은지 — 문서를 읽어서 대조한다 */
const terms = readFileSync('public/terms.html', 'utf-8')
const promised = terms.match(/시행일\s*(\d+)일\s*전\(이용자에게 불리한 변경은\s*(\d+)일\s*전\)/)
if (!promised) {
  say('public/terms.html — 고지 기간을 적은 문장을 찾지 못했다. 문구가 바뀌었으면 이 검사도 함께 고쳐야 한다')
} else {
  if (Number(promised[1]) !== NOTICE_LEAD_DAYS.normal) {
    say(`약관은 ${promised[1]}일 전이라 적었는데 코드는 ${NOTICE_LEAD_DAYS.normal}일을 쓴다`)
  }
  if (Number(promised[2]) !== NOTICE_LEAD_DAYS.adverse) {
    say(`약관은 불리한 변경을 ${promised[2]}일 전이라 적었는데 코드는 ${NOTICE_LEAD_DAYS.adverse}일을 쓴다`)
  }
}

if (problems.length === 0) {
  console.log(`공지 검사 완료 — 공지 ${NOTICES.length}건·고지 간격·문서 시행일 대조, 문제 없음`)
} else {
  console.log(`공지 검사 — 문제 ${problems.length}건`)
  for (const p of problems) console.log(`■ ${p}`)
  process.exitCode = 1
}
