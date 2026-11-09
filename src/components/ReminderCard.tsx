import { useState } from 'react'
import { applyReminder, isNative, readReminder, type Reminder } from '../lib/native'

/**
 * 기록 알림 — 아이폰 앱에서만 보인다(2026-11-09 앱스토어 준비).
 *
 * 매일 정한 시각에 "오늘 드신 것을 적어 두세요" 한 번. 기록이 쌓여야 주간 보고가 모자란 것을 짚을 수 있다.
 * 약 복용 알림은 두지 않는다 — 치료에 닿는 기능은 식약처 회신의 경계 밖이다.
 * 웹에는 알림을 정시에 띄울 확실한 방법이 없어(브라우저가 닫혀 있으면 못 띄움) 보이지 않게 한다.
 */
const TIMES: Array<[number, number, string]> = [[12, 30, '낮 12:30'], [19, 0, '저녁 7시'], [20, 0, '저녁 8시'], [21, 0, '밤 9시']]

export function ReminderCard() {
  const [r, setR] = useState<Reminder>(readReminder)
  const [note, setNote] = useState<string | null>(null)
  if (!isNative()) return null

  const save = async (next: Reminder) => {
    setR(next)
    const res = await applyReminder(next)
    if (res === 'denied') {
      setR({ ...next, on: false })
      setNote('아이폰 설정 → 하루차림 → 알림에서 알림 허용을 켜 주시면 됩니다.')
    } else setNote(next.on ? `매일 ${label(next)}에 알려 드릴게요.` : '기록 알림을 껐습니다.')
  }

  return (
    <div className="card mb-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-stone-900">기록 알림</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">하루 한 번, 드신 것을 적어 두시라고 알려 드려요.</p>
        </div>
        <button
          role="switch"
          aria-checked={r.on}
          aria-label="기록 알림"
          onClick={() => save({ ...r, on: !r.on })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${r.on ? 'bg-brand-600' : 'bg-stone-300'}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${r.on ? 'left-[1.375rem]' : 'left-0.5'}`} />
        </button>
      </div>
      {r.on && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="알림 시각">
          {TIMES.map(([h, m, text]) => {
            const on = r.hour === h && r.minute === m
            return (
              <button
                key={text}
                role="radio"
                aria-checked={on}
                onClick={() => save({ on: true, hour: h, minute: m })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 bg-white text-stone-700'}`}
              >
                {text}
              </button>
            )
          })}
        </div>
      )}
      {note && <p className="mt-2 text-[11.5px] text-brand-800" role="status">{note}</p>}
    </div>
  )
}

function label(r: Reminder): string {
  return TIMES.find(([h, m]) => h === r.hour && m === r.minute)?.[2] ?? `${r.hour}시 ${r.minute}분`
}
