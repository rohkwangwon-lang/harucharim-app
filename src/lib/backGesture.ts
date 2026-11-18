/**
 * 왼쪽 끝에서 오른쪽으로 밀어 '이전 화면'으로 — 2026-11-18 사용자 요청.
 *
 * 아이폰 앱에는 브라우저의 '뒤로' 단추가 없다. 아이폰 사용자가 손에 익은 몸짓은
 * 화면 왼쪽 가장자리에서 오른쪽으로 쓸어 넘기는 것이다(설정·메일 등 아이폰 앱 공통).
 *
 * 화면마다 '뒤로'에 해당하는 일을 여기 올려 두고(useBackHandler), 몸짓이 들어오면
 * 가장 위에 있는 것 하나만 실행한다.
 *   단계 3  관리자 화면처럼 앱 전체를 덮는 화면
 *   단계 2  음식 자세히 같은 덮개 창
 *   단계 1  한 화면 안의 하위 화면(며칠 치 → 이날 자세히)
 *   단계 0  앞 탭으로 (App 이 탭을 옮긴 순서를 기억한다)
 * 같은 단계면 나중에 열린 것이 위다.
 *
 * 글을 적는 창(문의 쓰기, 통계 동의)은 올리지 않는다 — 밀다가 적던 글이 날아가면 안 된다.
 *
 * 웹(사파리·크롬)에서는 켜지 않는다: 브라우저가 같은 몸짓을 '페이지 뒤로'로 쓰고 있어서
 * 둘이 겹치면 앱 밖으로 나가 버린다. 아이폰 앱 안에서만 켠다(components/BackSwipe.tsx).
 */
import { useEffect, useRef } from 'react'

type Entry = { level: number; seq: number; run: { current: () => void } }

const stack: Entry[] = []
let seq = 0

/** active 인 동안 '뒤로'에 handler 를 올려 둔다 */
export function useBackHandler(active: boolean, level: number, handler: () => void) {
  const run = useRef(handler)
  run.current = handler
  useEffect(() => {
    if (!active) return
    const e: Entry = { level, seq: ++seq, run }
    stack.push(e)
    return () => {
      const i = stack.indexOf(e)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active, level])
}

/** 지금 '뒤로' 할 곳이 있는가 */
export function canGoBack(): boolean {
  return stack.length > 0
}

/** 가장 위의 '뒤로'를 실행한다. 할 곳이 없으면 false */
export function goBack(): boolean {
  if (!stack.length) return false
  pickTop(stack).run.current()
  return true
}

/** 단계가 높은 것, 같으면 나중에 열린 것 */
export function pickTop<T extends { level: number; seq: number }>(list: T[]): T {
  return list.reduce((a, b) => (b.level > a.level || (b.level === a.level && b.seq > a.seq) ? b : a))
}

/* ───── 몸짓 판정 — 순수 함수(검사에서 그대로 부른다) ───── */

/** 가장자리로 치는 폭(px). 아이폰 기본 몸짓과 같은 감각 */
export const EDGE = 28
/** 이만큼 밀면 '뒤로' */
export const TRIGGER = 80

/** 손가락이 처음 닿은 곳이 왼쪽 가장자리인가 */
export function startsAtEdge(x: number): boolean {
  return x >= 0 && x <= EDGE
}

/**
 * 지금까지 움직인 모양으로 판정한다.
 *  'pending' 아직 모름 · 'swipe' 가로로 미는 중 · 'cancel' 세로 스크롤로 봄
 */
export function classify(dx: number, dy: number): 'pending' | 'swipe' | 'cancel' {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax < 10 && ay < 10) return 'pending'
  if (dx > 0 && ax > ay * 1.5) return 'swipe'
  return 'cancel'
}

/** 손을 뗐을 때 '뒤로'를 실행할까 */
export function shouldTrigger(dx: number, dy: number): boolean {
  return dx >= TRIGGER && Math.abs(dy) < dx
}
