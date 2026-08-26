/**
 * 아이콘.
 *
 * 이모지를 쓰면 기기마다 모양이 달라지고, 앱 전체가 급조된 인상을 준다.
 * 선 굵기와 모서리 처리를 하나로 맞춘 아이콘을 직접 그려 쓴다.
 *
 * 규칙
 *  · 24×24 격자, 선 굵기 1.6, 끝과 이음새는 둥글게
 *  · 채우지 않고 선으로만 그린다. 활성 상태는 색으로 구분한다
 *  · 주제를 그대로 그린다. 식단은 그릇, 기록은 달력, 영양제는 캡슐
 */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Svg({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  )
}

/** 내 식단 — 밥그릇과 젓가락 */
export const IconMeal = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 11h13a6.5 6.5 0 0 1-6.5 6.5H10A6.5 6.5 0 0 1 3.5 11Z" />
    <path d="M2.5 11h15" />
    <path d="M6 8.2c0-1 1.6-1 1.6-2.2M10 8.2c0-1 1.6-1 1.6-2.2" />
    <path d="M20.5 6.5v11" />
    <path d="M18.6 6.5v3.2c0 .6.4 1 .95 1s.95-.4.95-1V6.5" />
  </Svg>
)

/** 기록 — 달력에 표시된 날 */
export const IconDiary = (p: P) => (
  <Svg {...p}>
    <rect x="3.2" y="5" width="17.6" height="15.5" rx="2.4" />
    <path d="M3.2 9.6h17.6M8 3.5v3M16 3.5v3" />
    <circle cx="8.4" cy="13.4" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13.4" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="8.4" cy="17" r="1.05" fill="currentColor" stroke="none" />
  </Svg>
)

/** 추천 — 잎사귀와 반짝임 */
export const IconSuggest = (p: P) => (
  <Svg {...p}>
    <path d="M12.8 20.2c-3.4 0-6.2-2.8-6.2-6.2 0-4.6 5-8.4 10.6-9.2.5 5.8-1.4 15.4-4.4 15.4Z" />
    <path d="M9.6 17.2c1-2.6 2.9-4.9 5.3-6.4" />
    <path d="M4.6 4.4v2.8M3.2 5.8H6" />
  </Svg>
)

/** 찾기 — 돋보기 */
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="M15.8 15.8 20.5 20.5" />
  </Svg>
)

/** 영양제 — 캡슐 */
export const IconPill = (p: P) => (
  <Svg {...p}>
    <rect x="2.6" y="8.6" width="18.8" height="6.8" rx="3.4" transform="rotate(-40 12 12)" />
    <path d="M9.6 6.6 15 12" />
  </Svg>
)

/** 내 정보 — 사람 */
export const IconMe = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8.4" r="3.6" />
    <path d="M4.8 20c.6-3.7 3.6-6 7.2-6s6.6 2.3 7.2 6" />
  </Svg>
)

/** 바코드 */
export const IconBarcode = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 6.5v11M6.6 6.5v11M9.4 6.5v7.5M12.4 6.5v11M15.4 6.5v7.5M18.2 6.5v11M20.8 6.5v11" />
  </Svg>
)

/* ── 끼니 ───────────────────────────────────────────────── */

/** 아침 — 떠오르는 해 */
export const IconMorning = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 17.5h17" />
    <path d="M6.6 17.5a5.4 5.4 0 0 1 10.8 0" />
    <path d="M12 5.2v2M5.6 8 7 9.4M18.4 8 17 9.4" />
  </Svg>
)

/** 점심 — 해 */
export const IconNoon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
  </Svg>
)

/** 저녁 — 달 */
export const IconEvening = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />
  </Svg>
)

/** 간식 — 사과 */
export const IconSnack = (p: P) => (
  <Svg {...p}>
    <path d="M12 8.4c-1-.9-2.2-1.4-3.4-1.4-2.5 0-4.4 2.2-4.4 5.2 0 3.6 2.6 8 4.9 8 .9 0 1.7-.5 2.9-.5s2 .5 2.9.5c2.3 0 4.9-4.4 4.9-8 0-3-1.9-5.2-4.4-5.2-1.2 0-2.4.5-3.4 1.4Z" />
    <path d="M12 8.4V5.6c0-1.2 1-2.2 2.2-2.2" />
  </Svg>
)

/** 가이드 — 펼친 책 위에 잎사귀 하나. 읽을거리이면서 식이라는 뜻이다. */
export function IconGuide(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 5.5c2.6-.9 4.7-.9 6.5.3v13c-1.8-1.2-3.9-1.2-6.5-.3z" />
      <path d="M21 5.5c-2.6-.9-4.7-.9-6.5.3v13c1.8-1.2 3.9-1.2 6.5-.3z" />
      <path d="M12 8.7c.9-1.5 2.3-2.2 3.6-2.1.2 1.4-.3 2.9-1.6 3.7-.7.4-1.4.5-2 .4" />
    </Svg>
  )
}

/** 다시 구성 — 되돌아 도는 화살표. 같은 자리에서 다른 안을 낸다는 뜻이다. */
export const IconShuffle = (p: P) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 0 0-13.7-5.6L4 7.6" />
    <path d="M4 4v3.6h3.6" />
    <path d="M4 13a8 8 0 0 0 13.7 5.6L20 16.4" />
    <path d="M20 20v-3.6h-3.6" />
  </Svg>
)

/* ─────────────────────────── 로고 ─────────────────────────── */

/**
 * 하루차림 로고.
 *
 * 이 앱이 무엇인지 한 그림으로 말해야 한다. 두 가지를 겹쳤다.
 *  · 밥그릇 — 이 앱은 결국 매일의 끼니를 다루는 도구다
 *  · 그 위로 올라오는 잎 — 회복. 김이 오르는 모양이기도 하다
 *
 * 리본이나 십자 같은 표시는 쓰지 않았다.
 * 환자분이 매일 여는 화면에 병을 먼저 떠올리게 하고 싶지 않았다.
 * 아이콘들과 같은 규칙(24×24, 둥근 끝)으로 그려 앱 전체와 결이 맞는다.
 */
export function Logo(p: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {/* 잎 — 회복하는 쪽으로 자란다 */}
      <path d="M12 9.4c0-2.7 1.6-4.6 4-5.2.5 2.6-.6 4.9-2.7 5.9" fill="currentColor" fillOpacity={0.16} />
      <path d="M12 9.4c0-2.7 1.6-4.6 4-5.2.5 2.6-.6 4.9-2.7 5.9" />
      {/* 줄기 */}
      <path d="M12 12V8.6" />
      {/* 밥그릇 */}
      <path d="M3.6 12h16.8a8.4 8.4 0 0 1-8.4 7.6A8.4 8.4 0 0 1 3.6 12z" fill="currentColor" fillOpacity={0.1} />
      <path d="M3.6 12h16.8a8.4 8.4 0 0 1-8.4 7.6A8.4 8.4 0 0 1 3.6 12z" />
      {/* 받침 */}
      <path d="M6.4 21.2h11.2" />
    </svg>
  )
}
