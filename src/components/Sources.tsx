import { useState, type ReactNode } from 'react'
import { REF_BY_ID } from '../data/references'
import type { Reference } from '../data/types'
import { MEAL_BASIS } from '../data/mealBasis'

/**
 * 출처를 보여 주는 한 자리 — 2026-11-19 애플 심사 반려(지침 1.4.1)에서 나왔다.
 *
 * 반려 문구: 식단 정보에 출처 링크가 없다. 의학·건강 정보에는 출처를 달고,
 * 사용자가 쉽게 찾을 수 있어야 한다.
 *
 * 출처는 172건 모두 원문 주소가 있었는데, 화면마다 따로 만든 목록이
 *  - '이유' 단추 → 그 안에 다시 접힌 '근거 N건'(10 px 옅은 회색) 처럼 두 겹으로 숨어 있거나
 *  - 영양제 화면처럼 문헌 이름만 있고 누를 수 있는 주소가 빠져 있었다.
 * 심사자는 추천·내 식단 화면에서 출처를 하나도 보지 못했다.
 *
 * 그래서 출처를 여는 모양을 이 파일 하나로 모은다.
 *  1) 출처는 언제나 누를 수 있는 주소로 보인다(RefLink).
 *  2) 접어 두더라도 접힌 줄이 '출처 N건' 이라고 분명히 보인다(CiteList).
 *  3) 식단을 내놓는 화면에는 처음부터 펼쳐진 '이 식단의 출처' 상자를 둔다(MealSourcesCard).
 *  4) 어디서든 '출처 전체 보기' 로 172건 목록에 닿는다(openAllSources).
 * scripts/checks/citations.ts 가 이 약속을 지킨다 — 새 화면이 출처를 맨글자로 찍으면 검사가 멈춘다.
 */

/** 가이드 › 근거 등급 › 출처 전체 목록을 연다(App 이 듣는다) */
export const OPEN_SOURCES_EVENT = 'harucharim:open-sources'
export function openAllSources() {
  window.dispatchEvent(new Event(OPEN_SOURCES_EVENT))
}

/** 출처 하나 — 늘 누를 수 있는 주소로 */
export function RefLink({ r, className = '' }: { r: Reference; className?: string }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noreferrer"
      className={`underline decoration-stone-300 underline-offset-2 hover:text-brand-700 ${className}`}
    >
      {r.citation}
      <span className="sr-only"> (원문 열기)</span>
      <span aria-hidden className="ml-0.5 text-brand-600">↗</span>
    </a>
  )
}

export function refsOf(ids: string[]): Reference[] {
  const seen = new Set<string>()
  const out: Reference[] = []
  for (const id of ids) {
    const r = REF_BY_ID[id]
    if (r && !seen.has(id)) { seen.add(id); out.push(r) }
  }
  return out
}

/**
 * 출처 목록 — 접어 둘 수 있지만 접힌 줄이 분명히 보인다.
 * 예전 '근거 N건'(옅은 회색 10 px)을 '출처 N건'(초록 11 px, 굵게)으로 바꿨다.
 * '근거' 는 바로 옆 근거 등급 배지(A·B·C·G)와 겹쳐 무엇이 열리는지 흐렸다.
 */
export function CiteList({
  ids, open: initialOpen = false, className = 'mt-2', badge
}: { ids: string[]; open?: boolean; className?: string; badge?: ReactNode }) {
  const refs = refsOf(ids)
  if (refs.length === 0) return null
  return (
    <details className={className} open={initialOpen}>
      <summary className="flex min-h-[32px] cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-brand-700">
        {badge}
        <span>출처 {refs.length}건</span>
        <span aria-hidden className="text-brand-500">›</span>
      </summary>
      <ul className="mt-1 space-y-1">
        {refs.map((r) => (
          <li key={r.id} className="text-[11px] leading-relaxed text-stone-600">
            <RefLink r={r} />
          </li>
        ))}
      </ul>
    </details>
  )
}


export { MEAL_BASIS }

export function MealSourcesCard({
  extraIds = [], className = 'mb-4', defaultOpen = false
}: { extraIds?: string[]; className?: string; defaultOpen?: boolean }) {
  /*
   * 처음엔 접어 두되, 접힌 모양이 무엇인지 분명하게 — 제목·무엇의 출처인지·누르라는 표시.
   * 펼친 채로 두면 식단이 한 화면 아래로 밀려 정작 볼 것이 가려진다.
   */
  const [open, setOpen] = useState(defaultOpen)
  const extra = refsOf(extraIds).filter((r) => !MEAL_BASIS.some((b) => b.id === r.id))
  return (
    <div className={`rounded-2xl border border-brand-200 bg-white px-4 py-3 ${className}`}>
      <button
        type="button"
        className="flex min-h-[32px] w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0">
          <span className="block text-xs font-bold text-brand-800">이 식단의 출처 · {MEAL_BASIS.length + extra.length}건</span>
          {!open && (
            <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">
              열량·단백질 목표와 영양성분 값이 어느 문헌에서 왔는지
            </span>
          )}
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-brand-600">{open ? '접기' : '보기 ›'}</span>
      </button>
      {open && (
        <>
          <ul className="mt-1.5 space-y-1.5">
            {MEAL_BASIS.map((b) => {
              const r = REF_BY_ID[b.id]
              if (!r) return null
              return (
                <li key={b.id} className="text-[11px] leading-relaxed text-stone-600">
                  <span className="font-semibold text-stone-800">{b.use}</span>
                  <br />
                  <RefLink r={r} />
                </li>
              )
            })}
            {extra.map((r) => (
              <li key={r.id} className="text-[11px] leading-relaxed text-stone-600"><RefLink r={r} /></li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
            음식마다 왜 올렸는지와 그 출처는 음식 옆 <strong className="text-stone-700">이유·출처</strong>를 누르면 보입니다.
          </p>
          <AllSourcesButton className="mt-2" />
        </>
      )}
    </div>
  )
}

/** 출처 전체(172건) 목록으로 */
export function AllSourcesButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openAllSources}
      className={`min-h-[32px] text-[11px] font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 ${className}`}
    >
      이 앱의 출처 전체 보기 ›
    </button>
  )
}
