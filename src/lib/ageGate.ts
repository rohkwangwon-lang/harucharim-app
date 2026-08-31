/**
 * 만 14세 확인.
 *
 * 개인정보보호법 제22조의6 은 만 14세 미만 아동의 개인정보를 받을 때
 * 법정대리인의 동의를 받게 한다. 이 앱은 그 동의를 받을 장치가 없으므로
 * 애초에 14세 미만은 받지 않는 쪽을 택했고, 약관과 처리방침에도 그렇게 적어 두었다.
 *
 * 그런데 적어 두기만 하고 묻지는 않고 있었다. 문서로만 금지하고 확인하지 않으면
 * 지키는 것이 아니라 책임을 이용자에게 미뤄 둔 것에 가깝다.
 *
 * 나이를 물어 저장하지는 않는다 — 그러면 확인하려고 새 개인정보를 만드는 셈이다.
 * "만 14세 이상"이라는 사실만 기기에 남긴다.
 */

const KEY = 'harucharim.age14'

export function isAdultConfirmed(): boolean {
  try { return localStorage.getItem(KEY) === 'yes' } catch { return false }
}

export function confirmAdult(yes: boolean) {
  try {
    if (yes) localStorage.setItem(KEY, 'yes')
    else localStorage.removeItem(KEY)
  } catch { /* 저장이 막힌 브라우저 */ }
}
