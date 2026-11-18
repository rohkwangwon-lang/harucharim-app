/**
 * 왼쪽 가장자리에서 오른쪽으로 밀면 이전 화면으로(lib/backGesture.ts).
 *
 * 미는 동안 왼쪽에 '‹' 동그라미가 따라 나와서, 얼마나 더 밀면 되는지 보이게 한다.
 * 충분히 밀면 동그라미가 초록으로 바뀌고, 손을 떼면 돌아간다. 돌아갈 곳이 없으면 아무 일도 없다.
 * 아이폰 앱 안에서만 켠다 — 웹 브라우저는 같은 몸짓을 '페이지 뒤로'로 쓴다.
 */
import { useEffect, useState } from 'react'
import { isIOSApp } from '../lib/native'
import { canGoBack, classify, goBack, shouldTrigger, startsAtEdge, TRIGGER } from '../lib/backGesture'

export function BackSwipe() {
  const [drag, setDrag] = useState<{ dx: number; y: number } | null>(null)

  useEffect(() => {
    if (!isIOSApp()) return
    let start: { x: number; y: number } | null = null
    let mode: 'pending' | 'swipe' | 'cancel' = 'cancel'

    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      if (e.touches.length !== 1 || !t || !startsAtEdge(t.clientX) || !canGoBack()) { start = null; return }
      start = { x: t.clientX, y: t.clientY }
      mode = 'pending'
    }
    const move = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!start || !t || mode === 'cancel') return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (mode === 'pending') mode = classify(dx, dy)
      if (mode === 'swipe') {
        e.preventDefault() // 미는 동안 화면이 위아래로 흔들리지 않게
        setDrag({ dx: Math.max(0, dx), y: t.clientY })
      } else if (mode === 'cancel') {
        setDrag(null)
      }
    }
    const up = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      if (start && t && mode === 'swipe' && shouldTrigger(t.clientX - start.x, t.clientY - start.y)) {
        goBack()
        window.scrollTo({ top: 0 })
      }
      start = null
      mode = 'cancel'
      setDrag(null)
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up, { passive: true })
    window.addEventListener('touchcancel', up, { passive: true })
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
      window.removeEventListener('touchcancel', up)
    }
  }, [])

  if (!drag) return null
  const p = Math.min(1, drag.dx / TRIGGER)
  const ready = p >= 1
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 z-[60] flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold shadow-lift transition-colors ${ready ? 'bg-brand-600 text-white' : 'bg-white text-stone-500'}`}
      style={{ top: drag.y - 22, transform: `translateX(${-44 + p * 60}px)`, opacity: 0.4 + p * 0.6 }}
    >
      ‹
    </div>
  )
}
