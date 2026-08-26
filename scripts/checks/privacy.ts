/**
 * 통계·개인정보 검사.
 *
 * 이 앱은 암종·치료 시기·체중을 다룬다. 개인정보보호법 제23조의 민감정보라서
 * 다른 개인정보와 달리 '별도의 동의' 없이는 처리 자체가 금지되고,
 * 위반하면 5년 이하 징역 또는 5천만원 이하 벌금이다(제71조).
 *
 * 통계 기능은 한번 새면 되돌릴 수 없다. 이미 나간 것은 지운다고 없던 일이 되지 않는다.
 * 그래서 여기서 세 가지를 못 박는다.
 *
 *   1. 동의 없이는 한 줄도 나가지 않는다.
 *   2. 나가는 값은 뭉개진 것뿐이다 — 나이·체중 원본이 실려서는 안 된다.
 *   3. 계정과 이어지지 않는다.
 *
 * 나중에 누가(나를 포함해) 편하려고 원본을 실으면 여기서 걸린다.
 */
import { readFileSync } from 'node:fs'
import {
  ageBand, bmiBand, hasConsent, track, setConsent, EVENTS, cleanSource, SOURCES
} from '../../src/lib/stats'

const bads: string[] = []
function no(cond: boolean, msg: string) { if (cond) bads.push(msg) }

/* ── localStorage 흉내 — jiti 에는 브라우저가 없다 ───────── */
const mem = new Map<string, string>()
const calls: unknown[] = []
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) }
}
/* node 는 crypto 를 읽기 전용으로 두므로 randomUUID 만 갈아 끼운다 */
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => 'test-pid-0000' } })
}

/* ── 1. 기본은 꺼져 있는가 ──────────────────────────────── */
no(hasConsent(), '동의를 받기도 전에 통계가 켜져 있음')

track('open')
no(mem.has('oncofood.stats.queue'), '동의 전인데 세기 시작함 — 큐에 쌓였다')
no(mem.has('oncofood.stats.pid'), '동의 전인데 추적 번호를 만들었다')

/* ── 2. 켜면 세되, 끄면 지우는가 ────────────────────────── */
setConsent(true)
track('open')
track('menu_build', 3)
no(!mem.has('oncofood.stats.queue'), '동의했는데 세지 않음')

setConsent(false)
no(mem.has('oncofood.stats.pid'), '동의를 거두셨는데 추적 번호가 남아 있음')
no(mem.has('oncofood.stats.queue'), '동의를 거두셨는데 쌓인 것이 남아 있음')
no(hasConsent(), '동의를 거두었는데 여전히 켜져 있음')

/* ── 3. 나이·체중이 뭉개지는가 ──────────────────────────── */
const AGES: [number, string][] = [
  [55, '50대'], [49, '40대'], [50, '50대'], [9, '10대'],
  [79, '70대'], [80, '80대 이상'], [95, '80대 이상'], [0, '40대']
]
for (const [a, want] of AGES) {
  const got = ageBand(a)
  no(got !== want, `연령대가 어긋남: ${a}세 → "${got}" (${want} 이어야)`)
  no(/\d{2,}세|^\d+$/.test(got), `연령대에 원본 나이가 남음: ${a} → "${got}"`)
}

const BMIS: [number, number, string][] = [
  [45, 163, '저체중'], [60, 163, '정상'], [64, 163, '과체중'], [75, 163, '비만']
]
for (const [w, h, want] of BMIS) {
  const got = bmiBand(w, h)
  no(got !== want, `체격 구간이 어긋남: ${w}kg/${h}cm → "${got}" (${want} 이어야)`)
  no(/\d/.test(got), `체격 구간에 숫자가 남음: "${got}"`)
}

/* ── 4. 서버로 보내는 값에 원본이 없는가 ────────────────── */
const src = readFileSync('src/lib/stats.ts', 'utf-8')
const payload = src.slice(src.indexOf("rpc('of_track'"), src.indexOf('if (error) return'))

/*
 * 보내는 칸(p_xxx)에 무엇이 담기는지 하나씩 본다.
 *
 * 처음에는 payload 전체를 훑었는데, 그러면 ageBand(patient.age) 의 '인자' 까지
 * 유출로 세어 버린다. 뭉개려고 넘기는 값과 그대로 싣는 값은 전혀 다르다.
 * 봐야 할 것은 칸에 최종적으로 담기는 표현이다.
 */
const fields = [...payload.matchAll(/(p_\w+):\s*([^\n]+?),?\n/g)]
  .map(([, k, v]) => [k, v.trim().replace(/,$/, '')] as const)

no(fields.length < 10, `보내는 칸을 읽지 못함 (${fields.length}개) — 검사가 헛돌고 있다`)

const FORBIDDEN: [RegExp, string][] = [
  [/\bpatient\.age\b/, '나이 원본'],
  [/\bpatient\.weightKg\b/, '체중 원본'],
  [/\bpatient\.heightCm\b/, '신장 원본'],
  [/\bpatient\.name\b/, '이름'],
  [/\bpatient\.conditions\b(?!.*\.length)/, '증상 목록(가짓수만 보내야 함)'],
  [/\bpatient\.medications\b(?!.*\.length)/, '복용 약 목록(가짓수만 보내야 함)'],
  [/\.email\b/, '이메일'],
  [/\buser\.id\b|\buserId\b|\bsession\b/, '계정 식별자'],
  [/weightLog|observedLoss|\bselected\b|\bmeals\b|weightLossPct/, '식단·체중 기록']
]
for (const [k, v] of fields) {
  for (const [re, what] of FORBIDDEN) {
    /* 뭉개는 함수를 거쳐 나온 값이면 원본이 아니다 */
    const blurred = /^(ageBand|bmiBand)\(/.test(v)
    if (!blurred && re.test(v)) bads.push(`${k} 칸에 ${what} 이 그대로 실림 — "${v}"`)
  }
}

/* 나이·체중 칸은 반드시 뭉개는 함수를 거쳐야 한다 */
for (const [k, want] of [['p_age_band', 'ageBand('], ['p_bmi_band', 'bmiBand(']] as const) {
  const f = fields.find(([n]) => n === k)
  no(!f, `${k} 칸이 아예 없음`)
  no(Boolean(f) && !f![1].startsWith(want), `${k} 가 ${want}…) 를 거치지 않음 — "${f?.[1]}"`)
}

/* 보내야 하는 뭉갠 값은 실제로 쓰이는가 */
for (const must of ['ageBand(', 'bmiBand(']) {
  no(!payload.includes(must), `뭉개는 함수를 안 거침: ${must}`)
}

/* ── 5. 아는 이름만 보내는가 ────────────────────────────── */
const used = new Set<string>()
for (const f of ['App.tsx', 'components/RecommendedMenu.tsx', 'components/Diary.tsx',
                 'components/Supplements.tsx', 'components/HowTo.tsx', 'components/Onboarding.tsx']) {
  const t = readFileSync(`src/${f}`, 'utf-8')
  for (const m of t.matchAll(/track\('([a-z_]+)'/g)) used.add(m[1])
}
const unknown = [...used].filter((u) => !(EVENTS as readonly string[]).includes(u))
no(unknown.length > 0, `목록에 없는 이름을 보냄: ${unknown.join(', ')}`)
no(used.size < 6, `실제로 세는 것이 ${used.size}종뿐 — 통계로 쓸 수 없다`)

/* ── 6. SQL 쪽 방어 ─────────────────────────────────────── */
const sql = readFileSync('supabase/stats.sql', 'utf-8')
no(!/having count\(\*\) >= 5/.test(sql), '작은 칸을 가리지 않음 — 다섯 명 미만이 그대로 나온다')
no(!/of_is_admin\(\)/.test(sql), '집계 함수가 관리자 확인을 안 함')
no(!/of_forget/.test(sql), '동의를 거두셨을 때 지우는 길이 없음')
no(/references auth\.users|auth\.uid\(\)\s*(as|,)?\s*pid/.test(sql), '통계 표가 계정과 이어져 있음')

/* 집계 함수마다 관리자 확인이 붙어 있는가 — 하나만 빠져도 다 새는 문이 된다 */
for (const fn of sql.matchAll(/create or replace function public\.(of_stat_\w+)/g)) {
  const body = sql.slice(sql.indexOf(fn[0]), sql.indexOf('$$;', sql.indexOf(fn[0])))
  no(!body.includes('of_is_admin()'), `${fn[1]} 에 관리자 확인이 없음`)
}

/* ── 7. 화면에서 무엇이 나가는지 밝히는가 ───────────────── */
const consent = readFileSync('src/components/StatsConsent.tsx', 'utf-8')
for (const must of ['나가는 것', '나가지 않는 것', '제23조', '그대로 쓰실 수 있습니다']) {
  no(!consent.includes(must), `동의 화면에 "${must}" 설명이 없음`)
}
/* 개인을 들여다보는 화면을 만들지 않았는가 */
const admin = readFileSync('src/components/Admin.tsx', 'utf-8')
no(/of_users['"]\)|select\(\s*['"]\*/.test(admin), '관리자 화면이 개인 줄을 직접 읽으려 함')

/* ── 8. 고지가 사실과 맞는가 ────────────────────────────
 *
 * 통계를 붙이기 전, 앱과 처리방침은 "건강 정보는 어디로도 전송되지 않습니다" 라고
 * 단언하고 있었다. 통계를 켠 분에게는 그 말이 거짓이 된다.
 * 방침과 실제가 어긋나면 그 자체가 개인정보보호법 제30조 위반이고,
 * 무엇보다 앱이 하는 말을 믿을 수 없게 만든다.
 *
 * 기능을 늘릴 때 고지를 함께 고치는 것을 잊기 쉬우므로 여기서 붙잡는다.
 */
const app = readFileSync('src/App.tsx', 'utf-8')
const howto = readFileSync('src/components/HowTo.tsx', 'utf-8')
const policy = readFileSync('public/privacy.html', 'utf-8')

/* 통계 기능이 켜져 있는 한, 무엇도 안 나간다고 단언해서는 안 된다 */
for (const [name, text] of [['앱 고지', app], ['사용법', howto]] as const) {
  no(/건강 정보는[^.]*어디로도 전송되지 않습니다/.test(text),
     `${name} 가 아직 "건강 정보는 어디로도 전송되지 않습니다" 라고 단언함 — 통계를 켜면 사실이 아니다`)
  no(!/통계/.test(text), `${name} 에 통계 이야기가 없음`)
}

no(/이용자 분석에 쓰지 않습니다/.test(policy),
   '처리방침이 "이용자 분석에 쓰지 않습니다" 라고 적혀 있음 — 실제와 어긋난다')
for (const must of ['민감정보', '제23조', '별도의 동의', '연령대', '체격 구간', '철회']) {
  no(!policy.includes(must), `처리방침에 "${must}" 설명이 없음`)
}
/* 방침이 수집 항목을 실제와 같이 적었는가 */
for (const must of ['무작위 식별자', '5명 미만']) {
  no(!policy.includes(must), `처리방침에 "${must}" 가 없음`)
}

/* ── 9. 유입 경로가 신원 단서가 되지 않는가 ──────────────
 *
 * 카페마다 링크 뒤에 ?from=... 을 붙여 어디서 오셨는지 본다.
 * 그런데 주소창 글자를 그대로 실으면, 누가 ?from=김OO소개 를 붙이는 순간
 * 그게 서버에 남아 신원 단서가 된다. 영문·숫자만, 짧게 잘라서 받는다.
 */
const SRC_BAD = ['김철수', 'a@b.com', '010-1234-5678', '01012345678', '1965',
                 'x'.repeat(40), '<script>', 'cafe1', 'naver-cafe', '환자']
for (const v of SRC_BAD) {
  no(cleanSource(v) !== null, `알게 된 경로가 정해지지 않은 값을 통과시킴: "${v.slice(0, 20)}"`)
}
for (const s2 of SOURCES) {
  no(cleanSource(s2.id) === null, `알게 된 경로가 제 항목을 막음: "${s2.id}"`)
  no(!s2.label.trim(), `알게 된 경로 "${s2.id}" 에 화면에 보일 이름이 없음`)
}
no(cleanSource('CAFE') !== 'cafe', '알게 된 경로가 대소문자를 통일하지 않음')

/* SQL 쪽도 같은 목록으로 묶여 있는가 — 앱이 뚫려도 막을 자리가 필요하다 */
const sqlSrc = sql.match(/source\s+text\s+check \(source in \(([^)]*)\)\)/)
no(!sqlSrc, 'SQL 쪽에 알게 된 경로 목록 제한이 없음')
if (sqlSrc) {
  const inSql = [...sqlSrc[1].matchAll(/'([a-z]+)'/g)].map((m2) => m2[1]).sort()
  const inApp = SOURCES.map((s2) => s2.id).sort()
  no(inSql.join() !== inApp.join(),
     `앱과 SQL 의 경로 목록이 다름 — 앱 [${inApp.join(',')}] / SQL [${inSql.join(',')}]`)
}

/* ── 10. 동의를 여쭙는 방식이 강요가 아닌가 ──────────────
 *
 * 개인정보보호법 제22조 제5항은 선택 동의를 하지 않았다는 이유로
 * 서비스 제공을 거부하지 못하게 한다. 곧 거절이 동의만큼 쉽고 잘 보여야 한다.
 * 거절을 회색 잔글씨로 밀어 두는 흔한 방식은 형식만 동의이지 실은 동의가 아니다.
 */
const ask = readFileSync('src/components/StatsAsk.tsx', 'utf-8')
no(!/모든 기능을[^<]*그대로|그대로<\/strong>\s*쓰실/.test(ask),
   '동의 요청 화면이 "거절해도 그대로 쓸 수 있다" 고 말하지 않음')

/* 두 단추가 같은 무게인가 — 한쪽만 flex-1 이면 크기가 어긋난다 */
const btns = [...ask.matchAll(/className="(btn-[a-z]+ [^"]*)"[^>]*onClick=\{\(\) => answer\((true|false)\)\}/g)]
no(btns.length !== 2, `동의/거절 단추를 ${btns.length}개 찾음 — 둘이어야 한다`)
if (btns.length === 2) {
  const [a1, a2] = btns.map((b) => b[1].replace(/btn-[a-z]+/, '').trim())
  no(a1 !== a2, `두 단추의 크기가 다름 — "${a1}" 대 "${a2}". 거절이 작으면 동의가 아니다`)
  no(!btns.some((b) => b[2] === 'false'), '거절 단추가 없음')
}
/* 거절을 잔글씨·연회색으로 밀어 두지 않았는가 */
const refuse = ask.slice(ask.indexOf('answer(false)') - 220, ask.indexOf('answer(false)') + 120)
no(/text-\[1[01]px\]|text-stone-[34]00/.test(refuse), '거절 단추가 잔글씨나 연회색으로 밀려 있음')

/* 켜실 때까지 되묻지 않는가 */
no(!/asked|ASKED_KEY/.test(ask), '한 번 답하셨는지 기억하지 않음 — 되묻는 것도 강요다')

/* ── 11. 관리자 화면이 일반 사용자에게 새지 않는가 ───────
 *
 * 앱 화면 안에 관리자 숫자를 섞어 두면 언젠가 실수로 노출된다.
 * 별도 화면으로 빼되, 두 가지를 확인한다 —
 * 관리자 판별 없이는 열리지 않을 것, 그리고 일반 화면에 입구가 없을 것.
 */
/* 주석을 걷고 본다 — 주석에 적힌 말이 방어 노릇을 해서는 안 된다 */
const appSrc = app.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

no(!/adminOpen && isAdmin/.test(appSrc),
   '관리자 페이지가 관리자 판별 없이 열림 — 주소만 알면 누구나 본다')

/* 관리자 덩어리가 일반 화면에 남아 있지 않은가 */
no(/<Admin\s*\/>/.test(appSrc), '일반 화면에 <Admin /> 이 그대로 남아 있음')
for (const m2 of appSrc.matchAll(/<AdminInquiries\s*\/>|<AdminPage/g)) {
  const before = appSrc.slice(Math.max(0, m2.index! - 300), m2.index!)
  no(!/isAdmin/.test(before), `${m2[0]} 가 관리자 판별 밖에 놓여 있음`)
}

/* 관리자가 아닌 분께 입구가 보이지 않는가 */
const entry = appSrc.indexOf('관리자 페이지 열기')
no(entry < 0, '관리자에게 입구가 없음 — 만들어도 열 길이 없다')
if (entry >= 0) {
  no(!/isAdmin && \(/.test(appSrc.slice(Math.max(0, entry - 400), entry)),
     '관리자 입구가 모두에게 보임')
}

console.log(bads.length
  ? `개인정보 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
  : `개인정보 검사 완료 — 동의·뭉개기·집계 방어 확인, 문제 없음 (세는 항목 ${used.size}종)`)
