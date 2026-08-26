import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { setConsent } from '../lib/stats'

/**
 * 계정 삭제.
 *
 * 애플 App Store Review Guideline 5.1.1(v) 은 계정을 만들 수 있는 앱에
 * 앱 안에서의 계정 삭제를 요구한다. 예외가 없다.
 * 개인정보보호법 제36조도 같은 것을 요구하며, '메일을 보내 주세요' 는 요건을 채우지 못한다.
 *
 * 두 가지를 지킨다.
 *
 * 하나, 무엇이 지워지고 무엇이 남는지 먼저 적는다.
 * 이 앱은 건강 기록을 기기에만 두므로, 계정을 지워도 식단과 체중은 기기에 남는다.
 * 그걸 모르시면 "다 지웠는데 왜 남아 있지" 또는 그 반대로 놀라시게 된다.
 * 그래서 기기 기록을 함께 지울지 따로 여쭙는다.
 *
 * 둘, 되돌릴 수 없다는 것을 누르기 전에 알린다.
 * 다만 확인 문구를 타이핑하게 하지는 않는다 — 이 앱을 쓰시는 분 중에는
 * 항암 중 손이 떨리시는 분도 있다. 두 번 누르게 하는 것으로 충분하다.
 */
export function DeleteAccount({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [alsoLocal, setAlsoLocal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function remove() {
    if (!supabase) return
    setBusy(true)
    setErr(null)
    try {
      const { error } = await supabase.rpc('of_delete_me')
      if (error) throw new Error(error.message)

      /* 통계 동의를 거두고, 이미 올라간 익명 집계도 지운다 */
      setConsent(false)

      if (alsoLocal) {
        try {
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith('harucharim.')) localStorage.removeItem(k)
          }
        } catch { /* 저장이 막힌 브라우저 */ }
      }

      await signOut()
      onDone()
      location.reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        className="mt-3 w-full rounded-xl border border-danger-200 px-3 py-2.5 text-xs font-semibold text-danger-700"
        onClick={() => setOpen(true)}
      >
        계정 삭제
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-danger-200 bg-danger-50/60 p-3.5">
      <h4 className="text-sm font-bold text-danger-800">계정을 지울까요?</h4>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
        <strong>되돌릴 수 없습니다.</strong> 같은 계정으로 다시 로그인하셔도 아래 것들은 돌아오지 않습니다.
      </p>

      <div className="mt-2.5 space-y-2 rounded-lg bg-white p-3">
        <div>
          <p className="text-[11px] font-bold text-stone-700">지워지는 것</p>
          <ul className="mt-0.5 space-y-0.5 text-[11px] leading-relaxed text-stone-600">
            <li>· 로그인 계정 (카카오·구글 연결)</li>
            <li>· 남기신 문의와 받으신 답변</li>
            <li>· 보내신 이용 통계 (동의하셨던 경우)</li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold text-stone-700">이 기기에 남는 것</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
            암종·식단·체중 기록은 <strong>원래 이 기기 안에만</strong> 있어서 서버에 지울 것이 없습니다.
            함께 지우시려면 아래를 눌러 주세요.
          </p>
        </div>
      </div>

      <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-stone-700">
        <input
          type="checkbox"
          checked={alsoLocal}
          onChange={(e) => setAlsoLocal(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-danger-600"
        />
        <span>이 기기에 적어 둔 식단·체중·설정도 함께 지웁니다</span>
      </label>

      {err && <p className="mt-2 text-[11px] font-semibold text-danger-700">{err}</p>}

      <div className="mt-3 flex gap-2">
        <button className="btn-outline flex-1 text-xs" disabled={busy} onClick={() => setOpen(false)}>
          그만두기
        </button>
        <button
          className="flex-1 rounded-xl bg-danger-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60"
          disabled={busy}
          onClick={remove}
        >
          {busy ? '지우는 중…' : '계정 삭제'}
        </button>
      </div>
    </div>
  )
}
