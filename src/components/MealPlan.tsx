import { useEffect, useMemo, useState } from 'react'
import type { PatientContext, SelectedItem, Supplement, MealSlot } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { buildPlan, shoppingList, shoppingText, planItems, fmtQty, type PlanDay } from '../engine/plan'
import { hasRecipe } from '../data/foods/recipes'
import { portionLabel } from '../lib/portion'
import { label as dayLabel, type DayKey } from '../lib/day'
import { track } from '../lib/stats'
import { IconShuffle } from './icons'
import { Section } from './ui'

/**
 * 여러 날 식단과 장보기 목록(2026-10-23).
 *
 * 하루치 화면(RecommendedMenu)은 '왜' 를 자세히 적는 곳이고, 여기는 '며칠치를 한눈에' 와 '무엇을 살지' 를 답하는 곳이다.
 * 그래서 날마다 상을 짧게 보여 주고, 자세한 까닭은 그 날을 눌러 하루치 화면으로 가서 보게 한다.
 */
export function MealPlan({
  patient, selected, supps, startDay, days, diary, shown, onShown, onApplyDays, onOpenDay
}: {
  patient: PatientContext
  selected: SelectedItem[]
  supps: Supplement[]
  startDay: DayKey
  days: number
  diary: Record<string, SelectedItem[]>
  shown?: Record<string, string[]>
  onShown?: (day: string, foodIds: string[]) => void
  /** 날짜별로 담는다 */
  onApplyDays: (byDay: { day: string; items: { foodId: string; servings: number; meal: MealSlot }[] }[]) => void
  /** 그 날을 하루치 화면으로 자세히 본다 */
  onOpenDay: (day: DayKey) => void
}) {
  const [nonce, setNonce] = useState(0)
  const plan = useMemo<PlanDay[]>(
    () => buildPlan(patient, { startDay, days, selected, supplements: supps, diary, shown, nonce }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patient, startDay, days, selected, supps, nonce]
  )
  const list = useMemo(() => shoppingList(plan), [plan])
  useEffect(() => { track('plan_build') }, [])

  /* 보여 드린 상은 날마다 적어 둔다 — 뒷날에 다시 오지 않게(하루치 화면과 같은 규칙) */
  const shownKey = plan.map((p) => `${p.day}:${MEAL_SLOTS.flatMap((s) => p.menu.meals[s].map((e) => e.food.id)).join(',')}`).join('|')
  useEffect(() => {
    if (!onShown) return
    for (const p of plan) onShown(p.day, MEAL_SLOTS.flatMap((s) => p.menu.meals[s].map((e) => e.food.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onShown, shownKey])

  /* 산 것 표시 — 이 기기에서만, 이 계획에서만 */
  const planKey = `${startDay}:${days}:${nonce}`
  const [bought, setBought] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem('harucharim.plan.bought')
      const j = raw ? JSON.parse(raw) as { key: string; items: string[] } : null
      setBought(new Set(j && j.key === planKey ? j.items : []))
    } catch { setBought(new Set()) }
  }, [planKey])
  const toggle = (k: string) => setBought((prev) => {
    const next = new Set(prev); if (next.has(k)) next.delete(k); else next.add(k)
    try { localStorage.setItem('harucharim.plan.bought', JSON.stringify({ key: planKey, items: [...next] })) } catch { /* 저장 못 해도 화면은 된다 */ }
    return next
  })

  const [copied, setCopied] = useState<string | null>(null)
  const text = () => shoppingText(plan, list, (d) => dayLabel(d))
  const copy = async () => {
    track('plan_copy')
    try { await navigator.clipboard.writeText(text()); setCopied('복사했습니다 — 메모·카톡에 붙여 넣으세요') }
    catch { setCopied('복사가 막혀 있습니다 — 아래 글을 길게 눌러 복사하세요') }
    setTimeout(() => setCopied(null), 2500)
  }
  const share = async () => {
    track('plan_share')
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> }
    if (nav.share) { try { await nav.share({ title: '하루차림 장보기', text: text() }) } catch { /* 취소 */ } }
    else copy()
  }

  const kcalOf = (p: PlanDay) => Math.round(p.menu.totals.kcal ?? 0)
  const protOf = (p: PlanDay) => Math.round(p.menu.totals.protein ?? 0)
  const totalAdded = plan.reduce((n, p) => n + planItems(p).length, 0)

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{days}일치 식단 · 1인분</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {dayLabel(plan[0].day)} ~ {dayLabel(plan[plan.length - 1].day)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              같은 영양 목표로 날마다 다른 상을 짰고, 생선·고기가 든 날을 앞에 두었습니다 — 사 온 지 하루 이틀 안에 드시도록요.
              {selected.length > 0 && <> 첫날에는 담으신 <strong>{selected.length}가지</strong>가 들어 있습니다.</>}
            </p>
          </div>
          <button
            className="shrink-0 rounded-xl border-2 border-brand-600 bg-white px-3.5 py-2 text-sm font-bold text-brand-700 shadow-sm transition-colors hover:bg-brand-50 active:bg-brand-100"
            onClick={() => { track('plan_retry'); setNonce((n) => n + 1) }}
          >
            <span className="flex items-center gap-1.5"><IconShuffle className="h-4 w-4" />다시 구성</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {plan.map((p, i) => (
          <div key={p.day} className="card px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-stone-900">
                <span className="mr-1.5 rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-800">{i + 1}일째</span>
                {dayLabel(p.day)}
              </p>
              <p className="num text-[11px] text-stone-500">{kcalOf(p).toLocaleString()} kcal · 단백질 {protOf(p)} g</p>
            </div>
            <ul className="mt-2 space-y-1">
              {MEAL_SLOTS.filter((s) => p.menu.meals[s].length > 0).map((s) => (
                <li key={s} className="flex gap-2 text-[12.5px] leading-relaxed">
                  <span className="w-12 shrink-0 font-semibold text-stone-500">{s}</span>
                  <span className="min-w-0 text-stone-800">
                    {p.menu.meals[s].map((e, k) => (
                      <span key={e.food.id + k}>
                        {k > 0 && <span className="text-stone-300"> · </span>}
                        {e.food.name}
                        {e.servings !== 1 && <span className="text-stone-500"> {portionLabel(e.food.serving.label, e.servings)}</span>}
                        {e.origin === 'chosen' && <span className="ml-1 rounded bg-stone-100 px-1 text-[10px] text-stone-500">담음</span>}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-end">
              <button className="text-[11.5px] font-semibold text-brand-700 underline-offset-2 hover:underline" onClick={() => onOpenDay(p.day)}>
                이 날 자세히(이유·영양) ›
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalAdded > 0 && (
        <button
          className="btn-primary mt-3 w-full"
          onClick={() => { track('plan_take'); onApplyDays(plan.map((p) => ({ day: p.day, items: planItems(p) }))) }}
        >
          {days}일치 {totalAdded}가지를 날짜별로 내 식단에 담기
        </button>
      )}

      <div className="mt-5">
        <Section
          title="장보기 목록"
          desc={`${days}일 · 1인분 기준 ${list.itemCount}가지. 양은 집에서 1인분을 만들 때의 가늠이니 포장 단위에 맞춰 조정하세요. 산 것은 눌러 표시합니다.`}
          right={
            <div className="flex gap-1.5">
              <button className="btn-outline py-1.5 text-xs" onClick={copy}>복사</button>
              <button className="btn-outline py-1.5 text-xs" onClick={share}>보내기</button>
            </div>
          }
        >
          {copied && <p className="mb-2 rounded-lg bg-brand-50 px-3 py-2 text-[11.5px] text-brand-800" role="status">{copied}</p>}
          <div className="space-y-3">
            {list.groups.map((g) => (
              <div key={g.cat} className={`card px-3.5 py-2.5 ${g.cat === '양념·기본 재료' ? 'bg-stone-50' : ''}`}>
                <p className="text-xs font-bold text-stone-700">
                  {g.cat}
                  {g.cat === '양념·기본 재료' && <span className="ml-1 font-normal text-stone-500">— 집에 있으면 건너뛰세요</span>}
                </p>
                <ul className="mt-1.5 divide-y divide-stone-100">
                  {g.items.map((it) => {
                    const k = `${it.name}|${it.unit}`
                    const done = bought.has(k)
                    return (
                      <li key={k}>
                        <button
                          className="flex w-full items-start gap-2.5 py-1.5 text-left"
                          onClick={() => toggle(k)}
                          aria-pressed={done}
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${done ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 bg-white'}`} aria-hidden>
                            {done && <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8.5l3 3 7-7" /></svg>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`text-[13px] ${done ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                              {it.name} <span className="num font-semibold">{fmtQty(it)}</span>
                            </span>
                            <span className="block truncate text-[11px] text-stone-500">{it.uses.join(' · ')}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
            요리 {plan.flatMap((p) => MEAL_SLOTS.flatMap((s) => p.menu.meals[s])).filter((e) => hasRecipe(e.food)).length}가지는 재료로 풀었고,
            과일·우유·영양보충 음료처럼 그대로 드시는 {list.selfCount}가지는 그 자체로 적었습니다.
            생선·고기는 사신 날로부터 하루 이틀 안에 드시는 날에 쓰도록 앞에 두었지만, 냉장 보관 기간은 포장의 표시를 따르세요.
          </p>
        </Section>
      </div>
    </div>
  )
}
