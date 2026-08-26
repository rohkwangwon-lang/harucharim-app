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
  no(!existsSync('supabase/account.sql'),
     '계정 삭제 SQL(of_delete_me)이 없음 — 화면만 있고 실제로 지워지지 않는다')

  const del = existsSync('src/components/DeleteAccount.tsx')
    ? readFileSync('src/components/DeleteAccount.tsx', 'utf-8') : ''
  no(Boolean(del) && !/of_delete_me/.test(del), '계정 삭제 화면이 서버 쪽 삭제를 부르지 않음')
  /* 진짜 삭제여야 한다 — 비활성으로 두는 방식은 애플이 반려 사유로 명시했다 */
  const sql = existsSync('supabase/account.sql') ? readFileSync('supabase/account.sql', 'utf-8') : ''
  no(Boolean(sql) && !/delete from auth\.users/.test(sql),
     '계정을 실제로 지우지 않음 — 비활성 처리는 애플이 반려 사유로 명시했다')
  no(Boolean(sql) && !/delete from public\.of_inquiries/.test(sql),
     '계정만 지우고 남기신 문의는 남겨 둠')
  /* 되돌릴 수 없다는 것을 누르기 전에 알리는가 */
  no(Boolean(del) && !/되돌릴 수 없/.test(del), '계정 삭제가 되돌릴 수 없다는 안내가 없음')
}

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
