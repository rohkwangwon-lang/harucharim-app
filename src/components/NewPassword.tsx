import { useState } from 'react'
import { MIN_PASSWORD, signOut, updatePassword } from '../lib/auth'

/**
 * 비밀번호를 다시 정하는 화면.
 *
 * 메일의 주소를 누르면 Supabase 가 세션부터 만들어 준다.
 * 이 앱은 로그인만 되면 바로 안으로 들여보내므로, 이 화면이 없으면
 * 앱만 열리고 비밀번호는 잊으신 그대로 남는다 — 다음에 또 같은 자리에서 막히신다.
 * 그래서 로그인 문 앞에 이 화면을 먼저 세운다.
 *
 * 나가는 길도 둔다. 메일을 잘못 누르셨거나 마음이 바뀌셨을 수 있는데,
 * 그때 로그아웃하지 않고 그냥 두면 남의 기기에서 세션이 살아 있게 된다.
 */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    if (pw.length < MIN_PASSWORD) { setMsg(`비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`); return }
    if (pw !== again) { setMsg('두 번 적으신 비밀번호가 서로 다릅니다.'); return }
    setBusy(true); setMsg(null)
    try {
      await updatePassword(pw)
      onDone()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '잠시 뒤에 다시 해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-xl font-bold text-stone-900">새 비밀번호를 정해 주세요</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        메일로 보내 드린 주소로 들어오셨습니다. 여기서 비밀번호를 정하시면 바로 들어가십니다.
      </p>

      <label className="mt-5 block text-[11px] font-medium text-stone-500" htmlFor="of-pw1">새 비밀번호</label>
      <input
        id="of-pw1"
        type="password"
        autoComplete="new-password"
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
        placeholder={`${MIN_PASSWORD}자 이상`}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />

      <label className="mt-3 block text-[11px] font-medium text-stone-500" htmlFor="of-pw2">한 번 더</label>
      <input
        id="of-pw2"
        type="password"
        autoComplete="new-password"
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
        value={again}
        onChange={(e) => setAgain(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void save() }}
      />

      {msg && (
        <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2.5 text-xs leading-relaxed text-warn-700">{msg}</p>
      )}

      <button className="btn-primary mt-4 w-full py-3" disabled={busy} onClick={() => void save()}>
        {busy ? '바꾸는 중…' : '이 비밀번호로 바꾸기'}
      </button>

      <button
        className="mt-3 w-full text-center text-xs text-stone-400 hover:text-stone-600"
        onClick={() => { void signOut(); onDone() }}
      >
        그만두기 — 로그아웃하고 처음 화면으로
      </button>
    </div>
  )
}
