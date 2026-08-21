import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * 로그인.
 *
 * 로그인은 선택이다. 하지 않아도 앱의 모든 기능을 쓸 수 있고,
 * 문의도 이메일만 적으면 남길 수 있다.
 * 로그인하면 답변을 앱 안에서 확인할 수 있다는 점이 다르다.
 */

export type Provider = 'kakao' | 'google'

export const PROVIDER_LABEL: Record<Provider, string> = {
  kakao: '카카오로 계속하기',
  google: 'Google 로 계속하기'
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, user: session?.user ?? null, loading }
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

export async function signIn(provider: Provider) {
  if (!supabase) throw new Error('로그인이 아직 준비되지 않았습니다.')
  // 로그인 후 이 앱으로 정확히 돌아오게 한다 (GitHub Pages 하위 경로 대응)
  const redirectTo = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, scopes: SCOPES[provider] }
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
