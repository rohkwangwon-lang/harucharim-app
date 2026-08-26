/**
 * 스토어 심사 검사.
 *
 * 이 앱의 최종 목적은 PWA 가 아니라 구글 플레이·앱스토어 정식 출시다.
 * PWA 로만 생각하고 만들면 심사에서 막히는 것들이 있는데,
 * 그건 다 만든 뒤에야 알게 되고 그때 고치면 몇 주가 날아간다.
 *
 * 그래서 심사 기준 가운데 '코드를 보면 알 수 있는 것' 만 여기서 미리 붙잡는다.
 * 사람이 판단할 몫(4.2 Minimum Functionality 같은 것)은 검사로 대신할 수 없으므로
 * 남은 일을 화면에 적어 주는 데까지만 한다.
 */
import { readFileSync, existsSync } from 'node:fs'

const bads: string[] = []
const todos: string[] = []
function no(cond: boolean, msg: string) { if (cond) bads.push(msg) }

const app = readFileSync('src/App.tsx', 'utf-8')
const policy = readFileSync('public/privacy.html', 'utf-8')
const vite = readFileSync('vite.config.ts', 'utf-8')
const index = readFileSync('index.html', 'utf-8')

/* ── 1. 계정 삭제 — 애플 5.1.1(v), 예외 없음 ───────────────
 *
 * "계정을 만들 수 있는 앱은 앱 안에서 계정 삭제를 시작할 수 있어야 한다."
 * 카카오·구글 로그인이 있으므로 이 앱은 대상이다.
 * 개인정보보호법 제36조도 같은 것을 요구하며, '메일 보내세요' 로는 안 된다.
 */
const hasLogin = /signInWithOAuth|signIn\(/.test(readFileSync('src/lib/auth.ts', 'utf-8'))
if (hasLogin) {
  no(!existsSync('src/components/DeleteAccount.tsx'),
     '로그인이 있는데 계정 삭제 화면이 없음 — 애플 5.1.1(v) 로 반려된다')
  no(!/<DeleteAccount/.test(app),
     '계정 삭제 화면을 만들어 놓고 App 에 걸지 않음 — 이용자가 열 길이 없다')
  no(!existsSync('supabase/setup.sql'), '설치 SQL(supabase/setup.sql)이 없음')

  const del = existsSync('src/components/DeleteAccount.tsx')
    ? readFileSync('src/components/DeleteAccount.tsx', 'utf-8') : ''
  no(Boolean(del) && !/of_delete_me/.test(del), '계정 삭제 화면이 서버 쪽 삭제를 부르지 않음')
  /* 진짜 삭제여야 한다 — 비활성으로 두는 방식은 애플이 반려 사유로 명시했다 */
  const sql = existsSync('supabase/setup.sql') ? readFileSync('supabase/setup.sql', 'utf-8') : ''
  no(Boolean(sql) && !/of_delete_me/.test(sql),
     '설치 SQL 에 계정 삭제(of_delete_me)가 없음 — 화면만 있고 실제로 지워지지 않는다')
  no(Boolean(sql) && !/delete from auth\.users/.test(sql),
     '계정을 실제로 지우지 않음 — 비활성 처리는 애플이 반려 사유로 명시했다')
  no(Boolean(sql) && !/delete from public\.of_inquiries/.test(sql),
     '계정만 지우고 남기신 문의는 남겨 둠')
  /* 되돌릴 수 없다는 것을 누르기 전에 알리는가 */
  no(Boolean(del) && !/되돌릴 수 없/.test(del), '계정 삭제가 되돌릴 수 없다는 안내가 없음')
}

/* ── 1-2. 오류가 나도 화면이 남는가 ──────────────────────
 *
 * 리액트는 그리다 멈추면 화면을 통째로 지운다. 아무 말 없이 하얘진다.
 * 심사자가 그 화면을 만나면 그 자리에서 반려이고,
 * 항암 중에 앱을 여신 분은 기록이 날아간 줄 아신다.
 */
no(!existsSync('src/components/Guard.tsx'), '오류를 받아 내는 자리가 없음 — 한 번 어긋나면 화면이 하얘진다')
const main = readFileSync('src/main.tsx', 'utf-8')
no(!/<Guard>/.test(main), 'Guard 를 만들어 놓고 App 을 감싸지 않음')
if (existsSync('src/components/Guard.tsx')) {
  const g = readFileSync('src/components/Guard.tsx', 'utf-8')
  no(!/getDerivedStateFromError/.test(g), 'Guard 가 오류를 받아 내지 못함')
  /* 기록이 남아 있다는 것과 나갈 길을 알려야 한다 */
  no(!/그대로 있습니다/.test(g), '기록이 무사하다는 안내가 없음 — 그 말이 가장 먼저 필요하다')
  no(!/location\.reload/.test(g), '다시 여는 길이 없음')
}

/* ── 1-3. 앱 판 번호 ──────────────────────────────────────
 * 문의와 통계에 함께 실려, 어느 판에서 난 일인지 가리는 유일한 단서다.
 */
const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version?: string }
no(!pkg.version || pkg.version === '0.0.0', `앱 판 번호가 ${pkg.version} — 문의·통계에 그대로 찍힌다`)

/* ── 2. 개인정보 — 애플 5.1.1, 구글 데이터 안전 ──────────── */
no(!existsSync('public/privacy.html'), '개인정보처리방침 문서가 없음 — 두 스토어 모두 필수')
no(!/개인정보처리방침/.test(app), '앱 안에서 개인정보처리방침으로 가는 길이 없음')
for (const must of ['수집하는 항목', '보유 기간', '이용자의 권리']) {
  no(!policy.includes(must), `처리방침에 "${must}" 항목이 없음 — 데이터 안전 양식과 어긋난다`)
}

/* ── 3. 건강 앱 추가 심사 ────────────────────────────────
 *
 * 두 스토어 모두 건강·의료 앱에 근거와 한계 표시를 요구한다.
 * 이 앱은 이미 A·B·C·G 등급과 인용을 달고 있으므로 그것이 남아 있는지만 본다.
 */
no(!/대체하지 않습니다/.test(app), '진료를 대체하지 않는다는 고지가 없음 — 건강 앱 심사에서 걸린다')
const howto = readFileSync('src/components/HowTo.tsx', 'utf-8')
no(!/근거 등급|근거 A/.test(howto), '근거 등급을 설명하는 자리가 없음')

/* ── 4. 매니페스트 — TWA·설치 요건 ─────────────────────── */
for (const [re, what] of [
  [/short_name:/, '홈 화면 이름(short_name)'],
  [/description:/, '설명(description)'],
  [/display:\s*'standalone'/, '독립 실행(display: standalone)'],
  [/lang:\s*'ko'/, '언어(lang)'],
  [/start_url:/, '시작 주소(start_url)']
] as [RegExp, string][]) {
  no(!re.test(vite), `매니페스트에 ${what} 이 없음`)
}
/* 구글 플레이는 512px 아이콘과 maskable 을 요구한다 */
no(!/sizes:\s*'512x512'/.test(vite), '512px 아이콘이 없음 — 플레이 스토어 요건')
no(!/purpose:\s*'maskable'/.test(vite), 'maskable 아이콘이 없음 — 안드로이드에서 아이콘이 잘린다')
for (const f of ['public/icon-192.png', 'public/icon-512.png', 'public/icon-maskable-512.png']) {
  no(!existsSync(f), `${f} 파일이 없음`)
}

/* ── 5. 세로·가로와 접근성 ──────────────────────────────── */
no(!/viewport/.test(index), 'viewport 설정이 없음')
no(!/lang="ko"/.test(index), '<html lang="ko"> 가 아님 — 심사에서 언어가 어긋난다')

/* ── 6. 합친 설치 파일이 원본과 어긋나지 않는가 ──────────
 *
 * 나눠 두었던 SQL 을 setup.sql 하나로 합쳤다.
 * 손으로 옮긴 것이라 빠뜨리기 쉽고, 빠지면 그 기능만 조용히 안 된다 —
 * 설치는 성공했다고 나오는데 앱에서만 실패하므로 원인을 찾기가 어렵다.
 *
 * 앱이 실제로 부르는 이름이 전부 들어 있는지 대조한다.
 */
const setup = existsSync('supabase/setup.sql') ? readFileSync('supabase/setup.sql', 'utf-8') : ''
no(!setup, 'supabase/setup.sql 이 없음')

if (setup) {
  /* 앱 소스 어디에서든 rpc('...') 로 부르는 이름을 모은다 */
  const called = new Set<string>()
  for (const f of ['src/lib/stats.ts', 'src/lib/inquiry.ts', 'src/components/DeleteAccount.tsx']) {
    if (!existsSync(f)) continue
    for (const m of readFileSync(f, 'utf-8').matchAll(/rpc(?:<[^>]*>)?\(\s*'(\w+)'/g)) called.add(m[1])
  }
  /* 화면에서 from('...') 으로 읽는 표·뷰도 함께 본다 */
  for (const f of ['src/lib/inquiry.ts']) {
    if (!existsSync(f)) continue
    for (const m of readFileSync(f, 'utf-8').matchAll(/from\('(\w+)'\)/g)) called.add(m[1])
  }
  no(called.size < 8, `앱이 부르는 이름을 ${called.size}개밖에 못 찾음 — 검사가 헛돌고 있다`)

  const missing = [...called].filter((n) => !setup.includes(n))
  no(missing.length > 0,
     `setup.sql 에 빠진 것: ${missing.join(', ')} — 설치는 되는데 앱에서만 실패한다`)

  /* 순서 — of_stat_return 은 of_return_rate 뒤에 와야 한다 */
  const defs = new Map<string, number>()
  for (const m of setup.matchAll(/create or replace function public\.(of_\w+)/g)) {
    if (!defs.has(m[1])) defs.set(m[1], m.index!)
  }
  const TABLES2 = new Set(
    [...setup.matchAll(/create table if not exists public\.(of_\w+)/g)].map((m) => m[1])
  )
  for (const [name, at] of defs) {
    const end = setup.indexOf('$$;', at)
    const body = setup.slice(at, end < 0 ? setup.length : end)
    for (const c of body.matchAll(/public\.(of_\w+)\s*\(/g)) {
      if (c[1] === name || TABLES2.has(c[1]) || !defs.has(c[1])) continue
      if (defs.get(c[1])! > at) {
        const msg = `setup.sql: ${name} 이 아래에 정의된 ${c[1]} 을 부름 — 설치가 그 자리에서 멈춘다`
        if (!bads.includes(msg)) bads.push(msg)
      }
    }
  }

  /* 덮어쓰기 관계 — of_is_admin 은 계정 식별자까지 보는 판이어야 한다 */
  no(!/a\.user_id\s*=\s*auth\.uid\(\)/.test(setup),
     'setup.sql 의 of_is_admin 이 계정 식별자를 안 봄 — 카카오 로그인은 이메일이 없어 관리자가 못 된다')

  /* 확인용 마무리 질의가 있는가 */
  no(!/설치 확인|결과/.test(setup), 'setup.sql 에 설치 확인 질의가 없음 — 됐는지 알 길이 없다')
}

/* ── 남은 일 — 검사로 대신할 수 없는 것 ─────────────────── */
if (!existsSync('.well-known/assetlinks.json') && !existsSync('public/.well-known/assetlinks.json')) {
  todos.push('구글 플레이(TWA): .well-known/assetlinks.json 이 도메인 루트에 있어야 한다.\n     지금은 github.io 하위 경로라 넣을 자리가 없다 — 자체 도메인이 필요하다.')
}
if (!existsSync('capacitor.config.ts') && !existsSync('capacitor.config.json')) {
  todos.push('앱스토어(애플 4.2): 웹뷰만 씌운 앱은 반려된다.\n     푸시 알림·바코드 네이티브 연동 같은 것을 붙여야 한다 (Capacitor 등).')
}

const head = bads.length
  ? `스토어 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
  : '스토어 검사 완료 — 계정 삭제·처방침·매니페스트·아이콘 확인, 문제 없음'

console.log(head + (todos.length
  ? `\n\n남은 일 ${todos.length}가지 (코드로 끝나지 않는 것)\n` + todos.map((t) => '  ▸ ' + t).join('\n')
  : ''))
