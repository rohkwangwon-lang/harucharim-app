import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase 연결.
 *
 * 이 앱의 기본 원칙은 "입력한 정보는 기기 안에만 둔다" 이다.
 * 문의와 로그인은 그 원칙에서 벗어나는 유일한 기능이므로, 설정이 없으면
 * 아예 켜지지 않게 두고 나머지 기능은 그대로 쓸 수 있게 한다.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null
