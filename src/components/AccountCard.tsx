import { displayName, signOut, useSession } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { DeleteAccount } from './DeleteAccount'

/**
 * 계정 — 내 정보 맨 위.
 *
 * 2026-11-19 애플 심사 반려(지침 5.1.1(v)): "계정을 만들 수 있는데 삭제를 시작할 곳이 없다".
 * 삭제 기능은 있었지만 내 정보 맨 아래 가까이, 다른 카드들 사이에 단추 하나로 있어 심사자가 찾지 못했다.
 * 로그인 표시와 로그아웃은 '문의하기' 카드 안에 있었다.
 *
 * 그래서 계정에 관한 것을 한 카드로 모아 내 정보를 열면 처음 보이는 자리에 둔다.
 *  - 누구로 로그인했는지
 *  - 로그아웃
 *  - 계정 삭제(눌러서 펼치면 지워지는 것·남는 것 → 한 번 더 눌러 삭제 → 삭제됐다는 안내)
 * scripts/checks/account.ts 가 이 자리를 지킨다.
 */
export function AccountCard({ isAdmin, onDeleted }: { isAdmin: boolean; onDeleted: () => void }) {
  const { user } = useSession()
  if (!isSupabaseConfigured) return null
  return (
    <section id="account" className="card mb-5 p-4" aria-labelledby="account-title">
      <h3 id="account-title" className="text-sm font-bold text-stone-800">계정</h3>
      {user ? (
        <>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-stone-600">
              <span className="chip bg-brand-100 text-brand-700">로그인됨</span>{' '}
              {user.email ?? displayName(user)}
            </p>
            {/*
              * 로그아웃해도 이 기기에 적어 두신 식단·체중은 지워지지 않는다 — 다시 로그인하면 그대로 있다.
              * 함께 쓰는 기기에서는 꼭 필요한 단추다(2026-10-14 "로그아웃을 찾지 못했다").
              */}
            <button
              className="min-h-[36px] shrink-0 rounded-lg border border-stone-300 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
              onClick={() => { void signOut() }}
            >
              로그아웃
            </button>
          </div>

          <DeleteAccount onDone={onDeleted} />

          {!isAdmin && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] text-stone-400">
                관리자로 등록하려면
              </summary>
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                아래 계정 식별자를 <code className="rounded bg-stone-100 px-1">of_admins</code> 표에
                넣으면 이 계정이 관리자가 됩니다. 카카오 로그인은 이메일을 주지 않아
                식별자로 등록해야 합니다.
              </p>
              <p
                className="mt-1.5 cursor-pointer select-all break-all rounded-lg bg-stone-100 px-2.5 py-2 font-mono text-[11px] text-stone-700"
                onClick={() => navigator.clipboard?.writeText(user.id)}
                title="눌러서 복사"
              >
                {user.id}
              </p>
            </details>
          )}
        </>
      ) : (
        /* 앱을 연 직후 로그인 정보를 불러오는 아주 짧은 사이 */
        <p className="mt-2 text-xs text-stone-500">로그인 정보를 불러오는 중입니다…</p>
      )}
    </section>
  )
}
