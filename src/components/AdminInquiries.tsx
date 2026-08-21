import { useEffect, useState } from 'react'
import {
  answerInquiry, closeInquiry, KIND_LABEL, listAllInquiries,
  type AdminInquiry
} from '../lib/inquiry'
import { Section } from './ui'

/**
 * 문의 관리 화면.
 *
 * 관리자로 등록된 계정으로 로그인했을 때만 나타난다.
 * Supabase 대시보드를 열지 않고 앱에서 바로 답변할 수 있어야
 * 진료 중에도 처리가 된다.
 */
export function AdminInquiries() {
  const [items, setItems] = useState<AdminInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const load = () => {
    setLoading(true)
    listAllInquiries().then((r) => { setItems(r); setLoading(false) })
  }
  useEffect(load, [])

  const send = async (id: string) => {
    const text = (drafts[id] ?? '').trim()
    if (!text) { setError('답변 내용을 적어 주세요.'); return }
    setBusy(id); setError(null)
    try {
      await answerInquiry(id, text)
      setDrafts((d) => ({ ...d, [id]: '' }))
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const shown = filter === 'open' ? items.filter((i) => i.status === 'open') : items
  const openCount = items.filter((i) => i.status === 'open').length

  return (
    <Section
      title="문의 관리"
      desc={`들어온 문의 ${items.length}건 · 답변 대기 ${openCount}건`}
      right={
        <button className="text-xs font-medium text-stone-400 hover:text-stone-600" onClick={load}>
          새로고침
        </button>
      }
    >
      <div className="mb-3 flex gap-1 rounded-xl bg-stone-100 p-1">
        {([['open', `답변 대기 ${openCount}`], ['all', `전체 ${items.length}`]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
              filter === k ? 'bg-white text-brand-700 shadow-sm' : 'text-stone-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700">{error}</p>
      )}

      {loading ? (
        <div className="card px-4 py-8 text-center text-sm text-stone-400">불러오는 중…</div>
      ) : shown.length === 0 ? (
        <div className="card px-4 py-8 text-center text-sm text-stone-400">
          {filter === 'open' ? '답변을 기다리는 문의가 없습니다.' : '들어온 문의가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((q) => (
            <div key={q.id} className="card p-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="chip bg-stone-100 text-stone-600">{KIND_LABEL[q.kind]}</span>
                <span className={`chip ${
                  q.status === 'answered' ? 'bg-brand-100 text-brand-700'
                  : q.status === 'closed' ? 'bg-stone-200 text-stone-500'
                  : 'bg-warn-100 text-warn-700'
                }`}>
                  {q.status === 'answered' ? '답변함' : q.status === 'closed' ? '종료' : '대기'}
                </span>
                <span className="text-[11px] text-stone-400">
                  {new Date(q.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              <p className="text-sm font-semibold text-stone-900">{q.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-stone-600">{q.body}</p>

              <p className="mt-2 text-[11px] text-stone-400">
                연락처: {q.contact_email ?? (q.user_id ? '로그인 사용자 (앱에서 답변 확인)' : '없음')}
              </p>

              {q.answer ? (
                <div className="mt-2.5 rounded-lg bg-brand-50 px-3 py-2.5">
                  <p className="mb-1 text-[11px] font-bold text-brand-700">보낸 답변</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-700">{q.answer}</p>
                  {q.status !== 'closed' && (
                    <button
                      className="mt-2 text-[11px] text-stone-400 hover:text-stone-600"
                      onClick={async () => { await closeInquiry(q.id); load() }}
                    >
                      종료 처리
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-2.5">
                  <textarea
                    className="input min-h-[80px] resize-y text-xs"
                    placeholder="답변을 적어 주세요."
                    value={drafts[q.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  />
                  <button
                    className="btn-primary mt-2 w-full py-1.5 text-xs"
                    disabled={busy === q.id}
                    onClick={() => send(q.id)}
                  >
                    {busy === q.id ? '저장 중…' : '답변 저장'}
                  </button>
                  {q.contact_email && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                      이 분은 로그인하지 않으셨습니다. 답변을 저장한 뒤 {q.contact_email} 로 직접 메일을 보내 주세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
