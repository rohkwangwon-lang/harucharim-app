import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { displayName, PROVIDER_LABEL, signIn, signOut, useSession, type Provider } from '../lib/auth'
import {
  KIND_HINT, KIND_LABEL, listMyInquiries, submitInquiry,
  type Inquiry, type InquiryKind
} from '../lib/inquiry'

const KINDS: InquiryKind[] = ['food', 'supplement', 'error', 'etc']
const PROVIDERS: Provider[] = ['kakao', 'google']

/**
 * 1:1 문의.
 *
 * 찾는 음식이 없을 때 바로 요청할 수 있어야 의미가 있으므로,
 * 검색 화면에서도 열 수 있는 대화 상자로 만든다.
 */
export function InquiryDialog({
  onClose,
  presetSubject,
  presetKind
}: {
  onClose: () => void
  /** 검색어에서 넘어온 경우 미리 채워 둔다 */
  presetSubject?: string
  presetKind?: InquiryKind
}) {
  const { user } = useSession()
  const [kind, setKind] = useState<InquiryKind>(presetKind ?? 'food')
  const [subject, setSubject] = useState(presetSubject ?? '')
  const [body, setBody] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mine, setMine] = useState<Inquiry[]>([])
  const [tab, setTab] = useState<'write' | 'list'>('write')

  useEffect(() => {
    if (user) listMyInquiries().then(setMine)
  }, [user, done])

  const send = async () => {
    setError(null)
    if (!subject.trim()) { setError('무엇에 대한 문의인지 한 줄로 적어 주세요.'); return }
    if (!body.trim()) { setError('내용을 적어 주세요.'); return }
    setSending(true)
    try {
      await submitInquiry({ kind, subject, body, contactEmail: email }, user?.id, user?.email ?? undefined)
      setDone(true)
      setSubject(''); setBody('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="shrink-0 border-b border-slate-100 px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          <h3 className="text-lg font-bold text-slate-900">문의하기</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            찾으시는 음식·영양제가 없거나 내용이 이상하면 알려 주세요.
          </p>
          {user && (
            <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
              {(['write', 'list'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                    tab === t ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {t === 'write' ? '문의 남기기' : `내 문의 ${mine.length ? `(${mine.length})` : ''}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!isSupabaseConfigured ? (
            <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-700">문의 기능을 준비하고 있습니다</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                아직 서버가 연결되지 않았습니다. 조금만 기다려 주세요.
              </p>
            </div>
          ) : tab === 'list' ? (
            <MyList items={mine} />
          ) : done ? (
            <div className="rounded-xl bg-brand-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-brand-800">문의를 받았습니다</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {user
                  ? '답변이 등록되면 이 화면의 ‘내 문의’ 에서 확인하실 수 있습니다.'
                  : '적어 주신 이메일로 답변을 보내 드리겠습니다.'}
              </p>
              <button className="btn-ghost mt-4 text-xs" onClick={() => setDone(false)}>
                다른 문의 남기기
              </button>
            </div>
          ) : (
            <>
              {/* 이 앱이 답할 수 있는 범위를 먼저 밝힌다 */}
              <div className="mb-4 rounded-xl bg-warn-50 px-3.5 py-3">
                <p className="text-xs leading-relaxed text-warn-700">
                  <strong className="font-bold">개별 치료 상담은 받지 않습니다.</strong> 이 창구는 앱에 담긴 음식·영양제
                  자료를 늘리고 고치기 위한 곳입니다. 치료나 증상에 대한 판단은 반드시 담당 의료진과 상의하세요.
                </p>
              </div>

              <label className="label">어떤 문의인가요?</label>
              <div className="mb-4 grid grid-cols-2 gap-1.5">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                      kind === k
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>

              <label className="label">
                {kind === 'error' ? '어떤 항목인가요?' : '무엇을 찾으시나요?'}
              </label>
              <input
                className="input mb-1"
                placeholder={kind === 'supplement' ? '예: 임팩타민 프리미엄 파워' : '예: 밀푀유나베'}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
              />
              <p className="mb-4 text-[11px] leading-relaxed text-slate-400">{KIND_HINT[kind]}</p>

              <label className="label">자세한 내용</label>
              <textarea
                className="input mb-4 min-h-[110px] resize-y"
                placeholder="아는 만큼만 적어 주셔도 됩니다."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
              />

              {user ? (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">답변받으실 계정</p>
                    <p className="truncate text-sm font-medium text-slate-800">{displayName(user)}</p>
                  </div>
                  <button className="shrink-0 text-xs text-slate-400 hover:text-slate-600" onClick={signOut}>
                    로그아웃
                  </button>
                </div>
              ) : (
                <>
                  <label className="label">답변받으실 이메일</label>
                  <input
                    className="input mb-3"
                    type="email"
                    inputMode="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="mb-4 rounded-xl border border-slate-200 px-3.5 py-3">
                    <p className="mb-2 text-xs text-slate-500">
                      로그인하시면 이메일을 적지 않아도 되고, 답변을 앱에서 바로 보실 수 있습니다.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {PROVIDERS.map((p) => (
                        <button
                          key={p}
                          className={`btn text-xs ${
                            p === 'kakao'
                              ? 'bg-[#FEE500] text-[#191600] hover:bg-[#f5dc00]'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                          onClick={() => signIn(p).catch((e) => setError(String(e.message ?? e)))}
                        >
                          {PROVIDER_LABEL[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
                보내신 내용과 연락처는 답변을 위해서만 쓰고 1년 뒤 지웁니다.
                건강 상태나 진단명은 적지 않으셔도 됩니다.{' '}
                <a
                  href={`${import.meta.env.BASE_URL}privacy.html`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                >
                  개인정보처리방침
                </a>
              </p>

              {error && (
                <p className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-xs leading-relaxed text-danger-700">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="safe-bottom shrink-0 border-t border-slate-100 bg-white px-5 py-3">
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>닫기</button>
            {isSupabaseConfigured && tab === 'write' && !done && (
              <button className="btn-primary flex-[2]" onClick={send} disabled={sending}>
                {sending ? '보내는 중…' : '보내기'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MyList({ items }: { items: Inquiry[] }) {
  if (items.length === 0) {
    return <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">남기신 문의가 없습니다.</div>
  }
  return (
    <div className="space-y-2">
      {items.map((q) => (
        <div key={q.id} className="card p-3.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="chip bg-slate-100 text-slate-600">{KIND_LABEL[q.kind]}</span>
            <span className={`chip ${q.status === 'answered' ? 'bg-brand-100 text-brand-700' : 'bg-warn-100 text-warn-700'}`}>
              {q.status === 'answered' ? '답변 완료' : '확인 중'}
            </span>
            <span className="text-[11px] text-slate-400">
              {new Date(q.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900">{q.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{q.body}</p>
          {q.answer && (
            <div className="mt-2.5 rounded-lg bg-brand-50 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-bold text-brand-700">답변</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{q.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
