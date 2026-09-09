/**
 * 로그인 검사.
 *
 * 이 앱은 로그인을 필수로 두었다. 그러면 로그인 화면은 기능이 아니라 문이다 —
 * 문이 안 열리면 앱이 없는 것과 같다. 그런데 문은 화면 검사에서 늘 빠진다.
 * 열어 본 사람이 이미 로그인되어 있기 때문이다.
 *
 * 실제로 오래도록 이랬다. 들어오는 길이 카카오·구글 둘뿐이었는데,
 * auth.ts 첫머리에는 "로그인은 선택이다" 라고 적혀 있었다.
 * 문서와 코드가 어긋난 채로 아무도 밟지 않았다.
 *
 * 여기서 세 가지를 못 박는다.
 *   1. 소셜 계정이 없는 분도 들어올 길이 있는가
 *   2. 잊으신 비밀번호를 실제로 다시 정할 수 있는가 (메일만 보내고 끝나지 않는가)
 *   3. 막혔을 때 우리 말로, 무엇을 하면 되는지 알려 주는가
 */
import { readFileSync } from 'node:fs'
import { checkSignUp, friendlyAuth, MIN_PASSWORD } from '../../src/lib/authMessages'

const bads: string[] = []
function no(cond: boolean, msg: string) { if (cond) bads.push(msg) }

const auth = readFileSync('src/lib/auth.ts', 'utf-8')
const onboard = readFileSync('src/components/Onboarding.tsx', 'utf-8')
const app = readFileSync('src/App.tsx', 'utf-8')
const newPw = readFileSync('src/components/NewPassword.tsx', 'utf-8')

/* ── 1. 소셜이 없는 분도 들어올 수 있는가 ─────────────────── */

no(!/signInWithPassword/.test(auth),
   '이메일로 로그인하는 길이 없음 — 카카오·구글이 둘 다 없는 분은 앱 앞에서 돌아서신다')
no(!/auth\.signUp\(/.test(auth),
   '이메일로 가입하는 길이 없음 — 로그인만 있고 가입이 없으면 새로 오신 분이 못 들어온다')
no(!/EmailWay/.test(onboard),
   '첫 화면에 이메일 갈래가 걸려 있지 않음 — auth.ts 에만 있고 화면에 없으면 없는 것이다')
/*
 * 만 14세 확인은 로그인 앞에 서는 문이다.
 * 소셜 단추만 잠그고 이메일 칸을 열어 두면 그 문을 옆으로 돌아 지나간다.
 */
no(!/<EmailWay enabled=\{adult\}/.test(onboard),
   '만 14세 확인이 이메일 갈래에는 걸리지 않음 — 소셜 단추만 잠그고 옆문을 열어 둔 셈이다')

/*
 * 처음 오신 분에게 로그인 칸을 먼저 펴 두면, 가입한 적이 없으니 반드시 실패한다.
 * 그 실패를 사용자가 "내가 뭘 잘못 적었나" 로 받아들이게 두어서는 안 된다.
 */
no(!/seenBefore \? 'in' : 'up'/.test(onboard),
   '처음 오신 분에게도 로그인 칸이 먼저 펴짐 — 가입한 적이 없으니 반드시 실패한다')

/* ── 2. 잊으신 비밀번호를 실제로 다시 정할 수 있는가 ───────── */

no(!/resetPasswordForEmail/.test(auth), '비밀번호 재설정 메일을 보내는 길이 없음')
no(!/auth\.updateUser\(\{ password/.test(auth),
   '메일은 보내는데 새 비밀번호를 실제로 바꾸는 자리가 없음 — 메일만 오고 아무것도 못 한다')
no(!/PASSWORD_RECOVERY/.test(auth),
   '재설정 메일로 들어오신 것을 알아채지 못함 — 세션만 생기고 앱이 그냥 열린다')
no(!/updatePassword/.test(newPw), '새 비밀번호 화면이 실제로 비밀번호를 바꾸지 않음')

/*
 * 순서가 핵심이다.
 *
 * 메일의 주소를 누르면 세션이 먼저 생긴다. 그러면 로그인 문은 이미 열려 있다.
 * 비밀번호 정하는 화면을 그 문 뒤에 두면 영영 나오지 않는다 —
 * 앱만 열리고, 비밀번호는 잊으신 그대로 남는다.
 */
const atRecover = app.indexOf('if (recovering)')
const atGate = app.indexOf('if (!state.patient.onboarded || loggedOut)')
no(atRecover < 0, 'App 이 비밀번호 재설정 길을 아예 다루지 않음')
no(atRecover >= 0 && atGate >= 0 && atRecover > atGate,
   '비밀번호 정하는 화면이 로그인 문 뒤에 있음 — 메일로 들어오시면 그냥 지나쳐 앱이 열린다')

/* ── 3. 막혔을 때 무엇을 하면 되는지 알려 주는가 ──────────── */

/*
 * 잣대를 코드에서 빌리지 않는다.
 * Supabase 가 실제로 보내는 영어 문구를 그대로 적어 두고, 그것이 우리 말로
 * 바뀌는지, 그리고 '다음에 무엇을 하면 되는지' 가 담겼는지를 본다.
 */
const REAL_ERRORS: [string, string][] = [
  ['Invalid login credentials', '가입'],          // 가입한 적 없는 분을 가입 쪽으로 보내야 한다
  ['User already registered', '로그인'],          // 가입이 아니라 로그인으로 보내야 한다
  ['Email not confirmed', '스팸함'],              // 편지가 안 왔다는 문의가 가장 많은 자리
  ['Password should be at least 8 characters', String(MIN_PASSWORD)],
  ['For security purposes, you can only request this after 24 seconds', '잠시'],
  ['Email signups are disabled', '카카오'],
  ['Failed to fetch', '인터넷']
]
for (const [raw, must] of REAL_ERRORS) {
  const said = friendlyAuth(raw)
  no(said === raw, `서버 문구가 영어 그대로 나옴 — "${raw}"`)
  no(/[a-z]{6,}/.test(said.replace(/[가-힣·—"'()\s.,]/g, '')),
     `우리 말로 바꾸다 만 것 같음 — "${raw}" → "${said}"`)
  no(!said.includes(must),
     `무엇을 하면 되는지가 빠짐 — "${raw}" → "${said}" (…${must}… 가 있어야)`)
}

/* 모르는 문구는 지어내지 않고 그대로 보여 준다 */
const unknown = 'Some brand new error we have never seen'
no(friendlyAuth(unknown) !== unknown, '모르는 오류에 엉뚱한 안내를 지어냄')

/* ── 4. 적어 주신 것을 보내기 전에 걸러 내는가 ─────────────── */

const CASES: [string, string, boolean][] = [
  ['hong@example.com', '12345678', true],
  ['hong@example.com', '1234567', false],       // 한 자 모자람
  ['hong@example', '12345678', false],          // 점 뒤가 없음
  ['hong example.com', '12345678', false],      // @ 가 없음
  ['  hong@example.com  ', '12345678', true],   // 앞뒤 공백은 우리가 턴다
  /*
   * 지메일의 '+' 주소. 심사용 계정을 이 꼴로 만들도록 안내해 두었으므로
   * (관리자 주소와 겹치지 않게) 여기서 막히면 그 안내가 통째로 무너진다.
   */
  ['rohkwangwon+review@gmail.com', '12345678', true],
  ['hong@ex ample.com', '12345678', false],     // 가운데 공백
  ['', '12345678', false]
]
for (const [email, pw, ok] of CASES) {
  const got = checkSignUp(email, pw)
  no(ok && got !== null, `쓸 수 있는 것을 막음 — "${email}" / ${pw.length}자 → ${got}`)
  no(!ok && got === null, `쓸 수 없는 것을 통과시킴 — "${email}" / ${pw.length}자`)
}

/*
 * 서버에 보내기 전에 걸러 내는 뜻은 '메일이 오갈 시간을 아끼는 것' 이다.
 * 우리 잣대가 서버보다 느슨하면 그 뜻이 없어진다.
 */
no(MIN_PASSWORD < 8, `비밀번호 길이 잣대가 서버(8자)보다 느슨함 — ${MIN_PASSWORD}자`)

/* ── 5. 비밀번호를 우리가 붙들고 있지 않은가 ───────────────── */

for (const [name, text] of [['auth.ts', auth], ['Onboarding.tsx', onboard], ['NewPassword.tsx', newPw]] as const) {
  no(/localStorage\.setItem\([^)]*(password|pw|비밀번호)/i.test(text),
     `${name} 이 비밀번호를 기기에 적어 둠`)
  no(/console\.(log|warn|error)\([^)]*(password|\bpw\b)/i.test(text),
     `${name} 이 비밀번호를 기록으로 남김`)
}

console.log(bads.length
  ? `로그인 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
  : `로그인 검사 완료 — 들어오는 길 3가지·서버 오류 ${REAL_ERRORS.length}종·입력 ${CASES.length}가지 대조, 문제 없음`)
