import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { friendlyAuth } from './authMessages'

/* 화면이 쓰는 문구는 서버를 붙들지 않는 자리에 따로 둔다 — 검사가 불러 볼 수 있게 */
export { EMAIL_OPENS, MIN_PASSWORD, checkSignUp, emailOpen, friendlyAuth } from './authMessages'

/**
 * 로그인.
 *
 * 로그인은 필수다 — 첫 화면에서 거쳐야 넘어간다(App.tsx).
 * 이 주석은 오래도록 "로그인은 선택이다" 라고 적혀 있었는데, 코드는 이미
 * 오래전부터 막고 있었다. 문서와 코드가 어긋난 채로 남아 있었다.
 *
 * 들어오는 길은 셋이다.
 *   · 카카오 · 구글 — 아이디를 새로 만들지 않아도 된다
 *   · 이메일 + 비밀번호 — 둘 다 없는 분을 위한 길
 *
 * 이메일 길을 뒤늦게 낸 이유는, 소셜 로그인만 두면 그 둘 중 하나가 없는 분이
 * 앱 앞에서 그냥 돌아서게 되기 때문이다. 항암 중에 앱을 여신 분께
 * "먼저 카카오부터 만드세요" 라고 할 수는 없다.
 */

export type Provider = 'kakao' | 'google'

/** 들어오신 길 — 소셜 둘에 이메일을 더한 것 */
export type LoginWay = Provider | 'email'

export const PROVIDER_LABEL: Record<Provider, string> = {
  kakao: '카카오로 계속하기',
  google: 'Google 로 계속하기'
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  /*
   * 비밀번호를 다시 정하러 오신 길인가.
   *
   * 메일의 주소를 누르면 Supabase 가 세션을 먼저 만들어 준다.
   * 이 앱은 로그인하면 바로 안으로 들여보내므로, 그냥 두면
   * 새 비밀번호를 정하지 못한 채 앱만 열리고 만다 — 잊으신 그대로다.
   * 그래서 그 사실을 붙들어 두었다가 비밀번호 정하는 화면을 먼저 보여 준다.
   */
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return {
    session,
    user: session?.user ?? null,
    loading,
    recovering,
    doneRecovering: () => setRecovering(false)
  }
}

/**
 * 로그인 제공자에게 요청할 정보.
 *
 * 카카오는 기본값으로 이메일까지 요구하는데, 그 동의항목은 비즈앱 심사를 통과해야
 * 쓸 수 있다. 심사 전에 요청하면 카카오가 KOE205 로 거절한다.
 * 우리는 이메일이 없어도 동작하도록 만들었으므로 닉네임만 요청한다.
 */
const SCOPES: Partial<Record<Provider, string>> = {
  kakao: 'profile_nickname'
}

/*
 * 지난번에 어느 쪽으로 들어오셨는지 기억한다.
 *
 * 로그인 자체는 이미 기기에 남아 자동으로 이어진다(persistSession).
 * 그래도 앱을 오래 열지 않아 세션이 만료되면 다시 고르셔야 하는데,
 * 그때 "내가 카카오였나 구글이었나" 를 떠올려야 한다.
 * 다른 쪽으로 들어가면 아예 다른 계정이 되니, 그 기억은 사용자 몫으로 두면 안 된다.
 *
 * 저장하는 것은 '어느 쪽' 뿐이다 — 아이디도 비밀번호도 이 앱은 받지 않는다.
 */
const LAST_PROVIDER = 'harucharim.lastProvider'

export function lastProvider(): LoginWay | null {
  try {
    const v = localStorage.getItem(LAST_PROVIDER)
    return v === 'kakao' || v === 'google' || v === 'email' ? v : null
  } catch {
    return null
  }
}

export async function signIn(provider: Provider) {
  if (!supabase) throw new Error('로그인이 아직 준비되지 않았습니다.')
  try {
    localStorage.setItem(LAST_PROVIDER, provider)
  } catch {
    /* 사파리 프라이빗 모드 등 — 기억하지 못할 뿐 로그인은 그대로 된다 */
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectTo(), scopes: SCOPES[provider] }
  })
  if (error) throw error
}

export async function signOut() {
  await supabase?.auth.signOut()
}

/** 화면에 보여 줄 이름 — 카카오는 닉네임이 들어온다 */
export function displayName(user: User | null): string {
  if (!user) return ''
  const m = user.user_metadata ?? {}
  return (
    (m.name as string) ||
    (m.full_name as string) ||
    (m.nickname as string) ||           // 카카오는 여기로 닉네임이 온다
    (m.preferred_username as string) ||
    user.email ||
    '사용자'
  )
}

/* ────────────────────── 이메일 + 비밀번호 ──────────────────────
 *
 * 소셜 로그인이 없는 분을 위한 길.
 *
 * 비밀번호는 이 앱을 거치기만 하고 어디에도 남지 않는다 —
 * Supabase 가 해시로만 보관하고, 우리 코드는 값을 저장하지도 로그로 남기지도 않는다.
 *
 * 오류 문구를 그대로 보여 주면 영어로 "Invalid login credentials" 가 뜬다.
 * 무엇을 어떻게 고쳐야 하는지가 담기도록 우리 말로 바꿔 적는다.
 */

/**
 * 가입.
 *
 * 메일함으로 확인 편지가 가는지는 서버 설정에 달려 있다.
 * 편지가 가는 설정이면 세션이 바로 생기지 않으므로, 그 사실을 돌려주어
 * 화면이 "메일함을 확인해 주세요" 라고 안내할 수 있게 한다.
 */
export async function signUpWithEmail(
  email: string, password: string
): Promise<{ needsConfirm: boolean }> {
  if (!supabase) throw new Error('로그인이 아직 준비되지 않았습니다.')
  rememberEmailWay()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: redirectTo() }
  })
  if (error) throw new Error(friendlyAuth(error.message))
  return { needsConfirm: !data.session }
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('로그인이 아직 준비되지 않았습니다.')
  rememberEmailWay()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(friendlyAuth(error.message))
}

/** 비밀번호를 잊으셨을 때 — 메일로 다시 정할 주소를 보낸다 */
export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error('로그인이 아직 준비되지 않았습니다.')
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectTo()
  })
  if (error) throw new Error(friendlyAuth(error.message))
}

/** 메일의 주소로 들어오신 뒤 새 비밀번호를 정한다 */
export async function updatePassword(password: string) {
  if (!supabase) throw new Error('로그인이 아직 준비되지 않았습니다.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(friendlyAuth(error.message))
}

/** 로그인 후 이 앱으로 정확히 돌아오게 한다 (하위 경로 배포 대응) */
function redirectTo(): string {
  return new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
}

/*
 * 이메일로 들어오신 분도 "지난번에 어느 쪽이었나" 를 기억해 드려야 한다.
 * 카카오·구글과 같은 자리에 적어 둔다 — 적는 것은 '어느 쪽' 뿐이고
 * 이메일 주소나 비밀번호는 넣지 않는다.
 */
function rememberEmailWay() {
  try { localStorage.setItem(LAST_PROVIDER, 'email') } catch { /* 저장이 막힌 브라우저 */ }
}
