import { useState } from 'react'
import { NOTICE_LEAD_DAYS, type Notice } from '../data/notices'
import { markRead, posted, unread } from '../lib/notice'

/**
 * 공지를 보여 주는 자리.
 *
 * 두 가지로 나눈다.
 *
 * 보통 공지는 화면 위 띠로 알린다 — 하던 일을 막지 않는다.
 * 이용자에게 불리한 변경은 한 번 가리고 보여 준다. 약관은 "계속 쓰시면 동의하신 것으로
 * 본다"고 적어 두었는데, 띠 하나를 스쳐 지나가신 것을 동의로 삼는 것은 무리다.
 * 불리한 쪽만 걸음을 멈추게 하고, 나머지는 방해하지 않는다.
 */

function Body({ n }: { n: Notice }) {
  return (
    <>
      {n.body.map((p, i) => (
        <p key={i} className="mt-2 text-[13px] leading-relaxed text-stone-600">{p}</p>
      ))}
      {n.effectiveAt && (
        <p className="mt-2.5 text-[11px] text-stone-500">
          시행일 {n.effectiveAt} · {n.postAt}부터 알려 드리고 있습니다
          {n.adverse ? ` (불리한 변경이라 ${NOTICE_LEAD_DAYS.adverse}일 전에 알립니다)` : ''}
        </p>
      )}
      {n.link && (
        <a
          href={`${import.meta.env.BASE_URL}${n.link}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-block text-[12px] font-semibold text-brand-700 underline underline-offset-2"
        >
          {n.linkLabel ?? '문서 보기'}
        </a>
      )}
    </>
  )
}

/** 앱 위쪽에 붙는 알림. 안 보신 공지가 있을 때만 나타난다 */
export function NoticeBanner() {
  const [list, setList] = useState<Notice[]>(() => unread())
  const [openId, setOpenId] = useState<string | null>(null)

  if (list.length === 0) return null

  const adverse = list.find((n) => n.adverse)
  const n = adverse ?? list[0]
  const open = adverse != null || openId === n.id

  function close() {
    markRead(n.id)
    setOpenId(null)
    setList(unread())
  }

  if (open) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-3 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-title"
      >
        <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lift">
          <p className="text-[11px] font-bold text-brand-700">알려 드립니다</p>
          <h2 id="notice-title" className="mt-1 text-base font-bold text-stone-900">{n.title}</h2>
          <Body n={n} />
          <button className="btn-primary mt-4 w-full" onClick={close}>확인했습니다</button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-brand-200 bg-brand-50 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-brand-800">{n.title}</p>
        <button
          className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white"
          onClick={() => setOpenId(n.id)}
        >
          읽기
        </button>
        <button
          className="shrink-0 px-1 text-[11px] text-brand-700/70"
          aria-label="이 공지 닫기"
          onClick={close}
        >
          닫기
        </button>
      </div>
    </div>
  )
}

/** '내 정보'에 두는 지난 공지 목록 — 한 번 알린 것은 남겨 둔다 */
export function NoticeList() {
  const all = posted()
  const [openId, setOpenId] = useState<string | null>(null)
  if (all.length === 0) {
    return <p className="px-1 text-[12px] text-stone-500">아직 알려 드린 공지가 없습니다.</p>
  }
  return (
    <div className="space-y-2">
      {all.map((n) => {
        const on = openId === n.id
        return (
          <div key={n.id} className="rounded-xl border border-stone-200 bg-white p-3.5">
            <button
              className="flex w-full items-center gap-2 text-left"
              aria-expanded={on}
              onClick={() => { setOpenId(on ? null : n.id); if (!on) markRead(n.id) }}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-stone-800">{n.title}</span>
                <span className="mt-0.5 block text-[11px] text-stone-500">{n.postAt}</span>
              </span>
              <span aria-hidden className="shrink-0 text-[11px] text-stone-400">{on ? '접기' : '펼치기'}</span>
            </button>
            {on && <Body n={n} />}
          </div>
        )
      })}
    </div>
  )
}
