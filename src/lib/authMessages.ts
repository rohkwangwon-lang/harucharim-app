/**
 * 로그인 화면이 사람에게 하는 말.
 *
 * Supabase 를 부르지 않는 순수 함수만 둔다.
 * 서버를 붙들고 있으면 검사에서 부를 수가 없고, 부르지 못하면
 * "이 문구가 실제로 이렇게 나오는가" 를 아무도 확인하지 않은 채로 남는다.
 *
 * 그리고 이 앱의 로그인은 항암 중이신 분이 처음 만나는 화면이다.
 * 여기서 영어 오류 문구를 만나면 그 자리에서 앱을 닫으신다.
 */

/**
 * 이메일 가입이 열리는 날.
 *
 * 이메일 가입을 붙인 날(9월 9일), 약관 3항과 처리방침 1항은 여전히
 * "카카오·구글로만 로그인, 비밀번호는 받지 않는다" 였다. 문서를 고쳐 9월 11일에 알렸고,
 * 약관 10항은 "시행일 7일 전에 알린다" 고 약속하므로 새 판은 9월 18일에 시행한다.
 * 그 전에 비밀번호를 받기 시작하면 문서가 아직 허락하지 않은 것을 받는 셈이다.
 *
 * 날짜로 막아 두면 그날 아침 저절로 열린다 — 누가 기억해서 켤 일이 아니다.
 * 처리방침의 시행일과 이 날짜가 같은지는 login 검사가 본다.
 */
export const EMAIL_OPENS = '2026-09-18'

/** 그날이 되었는가. day 는 'YYYY-MM-DD' — 날짜를 밖에서 받아야 검사가 불러 볼 수 있다 */
export function emailOpen(day: string): boolean {
  return day >= EMAIL_OPENS
}

/** 비밀번호가 이만큼은 되어야 한다 — Supabase 기본값과 같게 둔다 */
export const MIN_PASSWORD = 8

/** 적어 주신 것이 쓸 만한가. 통과하면 null */
export function checkSignUp(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return '이메일 주소를 다시 확인해 주세요. (예: hong@example.com)'
  }
  if (password.length < MIN_PASSWORD) {
    return `비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`
  }
  return null
}

/**
 * 서버가 보내는 영어 문구를 우리 말로.
 *
 * 짐작으로 고쳐 적지 않는다 — 모르는 문구는 그대로 보여 주는 편이,
 * 엉뚱한 안내로 다른 곳을 뒤지게 하는 것보다 낫다.
 *
 * 문구마다 '무엇을 하시면 되는지' 를 함께 적는다.
 * "이메일 또는 비밀번호가 맞지 않습니다" 만으로는, 카카오로 가입해 놓고
 * 이메일로 들어오려 하시는 분이 영영 못 들어오신다.
 */
export function friendlyAuth(msg: string): string {
  const m = msg.toLowerCase()
  if (/invalid login credentials/.test(m)) {
    return '이메일 또는 비밀번호가 맞지 않습니다. 처음이시면 위의 "처음이에요 (가입)" 으로, '
      + '카카오·구글로 가입하셨다면 그 단추로 들어와 주세요.'
  }
  if (/user already registered|already been registered/.test(m)) {
    return '이미 가입된 이메일입니다. 위의 "로그인" 으로 들어와 주세요.'
  }
  if (/email not confirmed/.test(m)) {
    return '메일함에서 확인 편지의 주소를 먼저 눌러 주세요. 스팸함도 함께 보십시오.'
  }
  if (/password should be at least|password is too short/.test(m)) {
    return `비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`
  }
  if (/rate limit|too many requests|after \d+ seconds/.test(m)) {
    return '요청이 잦습니다. 잠시 뒤에 다시 해 주세요.'
  }
  if (/email address .* is invalid|invalid email/.test(m)) {
    return '이메일 주소를 다시 확인해 주세요.'
  }
  if (/signups not allowed|email logins are disabled|email signups are disabled/.test(m)) {
    return '이메일 가입이 서버에서 아직 열려 있지 않습니다. 카카오·구글로 들어와 주세요.'
  }
  if (/network|fetch|failed to fetch/.test(m)) return '인터넷 연결을 확인해 주세요.'
  return msg
}
