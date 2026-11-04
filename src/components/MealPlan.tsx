import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PatientContext, SelectedItem, Supplement, MealSlot } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { buildPlan, shoppingList, shoppingText, planItems, fmtQty, type PlanDay } from '../engine/plan'
import { hasRecipe, packHint, ingredientsOf } from '../data/foods/recipes'
import { storageHint, STORAGE_SOURCE, COOKED_HINT } from '../data/foods/storage'
import { portionLabel } from '../lib/portion'
import { label as dayLabel, type DayKey } from '../lib/day'
import { track } from '../lib/stats'
import { IconShuffle } from './icons'
import { Section } from './ui'
import { drawPlanImage } from '../lib/planImage'
import { sheetRows, sheetTitle, SHEET_COLS } from '../lib/planSheet'
import { openBook, planConditionKey, planPlate, stepBack, stepNext, type PlanBook } from '../lib/planBook'

/**
 * 여러 날 식단과 장보기 목록(2026-10-23).
 *
 * 하루치 화면(RecommendedMenu)은 '왜' 를 자세히 적는 곳이고, 여기는 '며칠치를 한눈에' 와 '무엇을 살지' 를 답하는 곳이다.
 * 그래서 날마다 상을 짧게 보여 주고, 자세한 까닭은 그 날을 눌러 하루치 화면으로 가서 보게 한다.
 */
const PANTRY_KEY = 'harucharim.pantry'
const COMMON_AT_HOME = ['달걀', '우유', '두부', '양파', '대파', '당근', '감자', '고구마', '배추김치', '사과', '쌀']

function loadPantry(): Set<string> {
  try { const raw = localStorage.getItem(PANTRY_KEY); return new Set(raw ? (JSON.parse(raw) as string[]) : []) } catch { return new Set() }
}

/** 탭을 옮겨도 보던 안을 이어 보이기 위한 기억 — 조건이 같을 때만 쓴다(하루치의 DRAFT_MEMORY 와 같다) */
let PLAN_MEMORY: PlanBook<PlanDay[]> | null = null

/* 산 것 표시는 계획마다 따로 둔다 — 이전 안으로 돌아가면 그 안에서 표시한 것이 그대로 보여야 한다 */
const BOUGHT_KEY = 'harucharim.plan.bought'
const BOUGHT_KEEP = 8
function loadBought(): Record<string, string[]> {
  try {
    const j = JSON.parse(localStorage.getItem(BOUGHT_KEY) ?? '{}') as Record<string, unknown>
    /* 예전 꼴({ key, items })은 번호로 적혀 있어 이제 어느 계획인지 알 수 없다 */
    return j && typeof j === 'object' && !('key' in j) ? j as Record<string, string[]> : {}
  } catch { return {} }
}

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
  onApplyDays: (byDay: { day: string; items: { foodId: string; servings: number; meal: MealSlot }[] }[]) => void
  /** 한 날을 하루치 화면으로 — 계획에서 짠 식단을 그대로 넘겨 같은 상이 보이게 한다 */
  onOpenDay: (day: DayKey, menu: PlanDay['menu'], index: number) => void
}) {
  /* 집에 있는 재료 — 이 기기에만. 계획을 바꿔도 남는다(냉장고는 그대로니까) */
  const [pantry, setPantry] = useState<Set<string>>(loadPantry)
  const [pantryOpen, setPantryOpen] = useState(false)
  const pantryKey = [...pantry].sort().join(',')
  const togglePantry = (name: string) => setPantry((prev) => {
    const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name)
    try { localStorage.setItem(PANTRY_KEY, JSON.stringify([...next])) } catch { /* 없어도 된다 */ }
    return next
  })

  const conditionKey = planConditionKey(patient, selected, supps.map((s) => s.id), startDay, days, pantryKey)
  const makePlan = (nonce: number) =>
    buildPlan(patient, { startDay, days, selected, supplements: supps, diary, shown, nonce, pantry: pantry.size ? pantry : undefined })
  const [savedBook, setBook] = useState<PlanBook<PlanDay[]>>(() =>
    PLAN_MEMORY?.key === conditionKey ? PLAN_MEMORY : openBook(conditionKey, makePlan))
  /* 눌렀는데 바꿀 것이 없었는가 — 눌러도 그대로이면 고장처럼 보인다 */
  const [stuck, setStuck] = useState(false)
  /* 조건이 달라지면 지금까지 만든 안은 버린다 — 다른 사람의 식단이 되기 때문이다 */
  let book = savedBook
  if (book.key !== conditionKey) {
    book = openBook(conditionKey, makePlan)
    setBook(book)
    setStuck(false)
  }
  useEffect(() => { PLAN_MEMORY = book }, [book])
  const plan = book.plans[book.cursor]
  const nextPlan = () => {
    const r = stepNext(book, makePlan, (a, b) => planPlate(a) === planPlate(b))
    setBook(r.book)
    setStuck(r.stuck)
  }
  const prevPlan = () => { setStuck(false); setBook(stepBack(book)) }
  const list = useMemo(() => shoppingList(plan, pantry), [plan, pantry])
  /* 고를 수 있는 재료 — 이 계획에 드는 것(양념 말고) + 흔히 집에 있는 것 */
  const candidates = useMemo(() => {
    const s = new Set<string>(COMMON_AT_HOME)
    for (const p of plan) for (const sl of MEAL_SLOTS) for (const e of p.menu.meals[sl]) for (const ing of ingredientsOf(e.food)) if (!ing.self && ing.cat !== '양념·기본 재료') s.add(ing.name)
    for (const x of pantry) s.add(x)
    return [...s].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [plan, pantry])

  useEffect(() => { track('plan_build') }, [])
  const shownKey = plan.map((p) => `${p.day}:${MEAL_SLOTS.flatMap((s) => p.menu.meals[s].map((e) => e.food.id)).join(',')}`).join('|')
  useEffect(() => {
    if (!onShown) return
    for (const p of plan) onShown(p.day, MEAL_SLOTS.flatMap((s) => p.menu.meals[s].map((e) => e.food.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onShown, shownKey])

  /* 산 것 표시 — 이 기기에서만, 계획마다. 번호가 아니라 계획의 내용으로 알아본다 */
  const planKey = `${pantryKey}#${shownKey}`
  const [bought, setBought] = useState<Set<string>>(() => new Set())
  useEffect(() => { setBought(new Set(loadBought()[planKey] ?? [])) }, [planKey])
  const toggleBought = (k: string) => setBought((prev) => {
    const next = new Set(prev); if (next.has(k)) next.delete(k); else next.add(k)
    try {
      const all = loadBought()
      /* 지웠다 다시 넣어 맨 뒤로 보낸다 — 오래된 계획부터 덜어 낸다 */
      delete all[planKey]
      all[planKey] = [...next]
      for (const old of Object.keys(all).slice(0, -BOUGHT_KEEP)) delete all[old]
      localStorage.setItem(BOUGHT_KEY, JSON.stringify(all))
    } catch { /* 저장 못 해도 화면은 된다 */ }
    return next
  })

  const [msg, setMsg] = useState<string | null>(null)
  const say = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 2500) }
  const text = () => shoppingText(plan, list, (d) => dayLabel(d))
  const copy = async () => {
    track('plan_copy')
    try { await navigator.clipboard.writeText(text()); say('복사했습니다 — 메모·카톡에 붙여 넣으세요') }
    catch { say('복사가 막혀 있습니다 — 보내기를 눌러 보세요') }
  }
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; files?: File[] }) => Promise<void>; canShare?: (d: { files?: File[] }) => boolean }
  const share = async () => {
    track('plan_share')
    if (nav.share) { try { await nav.share({ title: '하루차림 장보기', text: text() }) } catch { /* 취소 */ } }
    else copy()
  }

  /* 식단표 그림 — 냉장고에 붙이거나 보내는 용도 */
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const saveImage = async () => {
    track('plan_image')
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    drawPlanImage(canvas, plan)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) { say('그림을 만들지 못했습니다'); return }
    const file = new File([blob], `하루차림-식단표-${startDay}.png`, { type: 'image/png' })
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: '하루차림 식단표' }); return } catch { /* 취소 → 내려받기 */ }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    say('식단표 그림을 저장했습니다')
  }
  const print = () => { track('plan_print'); document.body.classList.add('print-plan'); setTimeout(() => { window.print(); document.body.classList.remove('print-plan') }, 50) }

  const rows = useMemo(() => sheetRows(plan), [plan])
  const kcalOf = (p: PlanDay) => Math.round(p.menu.totals.kcal ?? 0)
  const protOf = (p: PlanDay) => Math.round(p.menu.totals.protein ?? 0)
  const totalAdded = plan.reduce((n, p) => n + planItems(p).length, 0)
  const tag = (c?: string) => c && /2인분 끓여/.test(c) ? '2인분 끓여 두세요' : c === '어제 끓인 것' ? '어제 끓인 것' : null

  return (
    <div id="plan-print">
      <div className="mb-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        {/* 폰 폭에서는 단추를 글 아래 줄에 둔다 — 옆에 두면 단추 두 개가 글 칸을 110px 로 줄여 날짜까지 꺾인다.
            '다시 구성' 은 어느 안에서든 같은 자리(오른쪽 끝)에 남아 거듭 누르기 좋다 */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{days}일치 식단 · 1인분</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{dayLabel(plan[0].day)} ~ {dayLabel(plan[plan.length - 1].day)}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              날마다 다른 상, 생선·고기 든 날은 앞에. 국·조림은 2인분을 끓여 이틀에 나눕니다.
              {selected.length > 0 && <> 첫날에는 담으신 <strong>{selected.length}가지</strong>가 들어 있습니다.</>}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1.5 print:hidden">
            {/* 처음 안을 보고 계실 때는 나오지 않는다 — 눌러도 아무 일이 없는 단추는 없느니만 못하다 */}
            {book.cursor > 0 && (
              <button
                className="whitespace-nowrap rounded-xl border-2 border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50"
                onClick={prevPlan}
              >
                ‹ 이전 안
              </button>
            )}
            <button
              className="whitespace-nowrap rounded-xl border-2 border-brand-600 bg-white px-3.5 py-2 text-sm font-bold text-brand-700 shadow-sm transition-colors hover:bg-brand-50 active:bg-brand-100"
              onClick={() => { track('plan_retry'); nextPlan() }}
            >
              <span className="flex items-center gap-1.5"><IconShuffle className="h-4 w-4" />다시 구성</span>
            </button>
          </div>
        </div>
        {stuck && (
          <p className="mt-2.5 rounded-lg border border-warn-200 bg-warn-50 px-3 py-2 text-[12px] leading-relaxed text-stone-700 print:hidden" role="status">
            <strong>다른 조합을 찾지 못했습니다.</strong> 지금 안을 그대로 둡니다.
          </p>
        )}
        {book.plans.length > 1 && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-brand-800/70 print:hidden">
            <strong>{book.cursor + 1}번째 안</strong>입니다(지금까지 {book.plans.length}가지).
            {book.cursor > 0 && <> <strong>이전 안</strong>으로 돌아가실 수 있습니다.</>}
            {book.cursor < book.plans.length - 1 && <> <strong>다시 구성</strong>을 누르시면 다음 안이 다시 나옵니다.</>}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5 print:hidden">
          <button className={`chip border ${pantry.size ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 bg-white text-stone-700'}`} onClick={() => setPantryOpen((v) => !v)} aria-expanded={pantryOpen}>
            집에 있는 재료{pantry.size ? ` ${pantry.size}` : ''}
          </button>
          <button className="chip border border-stone-300 bg-white text-stone-700" onClick={saveImage}>식단표 저장</button>
          <button className="chip border border-stone-300 bg-white text-stone-700" onClick={print}>인쇄</button>
        </div>
        {pantryOpen && (
          <div className="mt-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 print:hidden">
            <p className="text-[11.5px] leading-relaxed text-stone-600">냉장고에 있는 것을 누르세요. 그 재료를 쓰는 요리를 먼저 짜고, 장보기에서 뺍니다.
              {pantry.size > 0 && <button className="ml-2 text-brand-700 underline" onClick={() => { setPantry(new Set()); try { localStorage.removeItem(PANTRY_KEY) } catch { /* */ } }}>모두 지우기</button>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {candidates.map((name) => (
                <button key={name} aria-pressed={pantry.has(name)} onClick={() => togglePantry(name)}
                  className={`chip border text-[12px] ${pantry.has(name) ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 bg-white text-stone-600'}`}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
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
                    {p.menu.meals[s].map((e, k) => {
                      const t = tag(e.contribution)
                      return (
                        <span key={e.food.id + k}>
                          {k > 0 && <span className="text-stone-300"> · </span>}
                          {e.food.name}
                          {e.servings !== 1 && <span className="text-stone-500"> {portionLabel(e.food.serving.label, e.servings)}</span>}
                          {e.origin === 'chosen' && <span className="ml-1 rounded bg-stone-100 px-1 text-[10px] text-stone-500">담음</span>}
                          {t && <span className={`ml-1 rounded px-1 text-[10px] ${t === '어제 끓인 것' ? 'bg-stone-100 text-stone-600' : 'bg-accent-100 text-accent-700'}`}>{t}</span>}
                        </span>
                      )
                    })}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-end print:hidden">
              <button className="text-[11.5px] font-semibold text-brand-700 underline-offset-2 hover:underline" onClick={() => onOpenDay(p.day, p.menu, i)}>
                이 날 자세히(이유·영양) ›
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalAdded > 0 && (
        <button className="btn-primary mt-3 w-full print:hidden" onClick={() => { track('plan_take'); onApplyDays(plan.map((p) => ({ day: p.day, items: planItems(p) }))) }}>
          {days}일치 {totalAdded}가지를 날짜별로 내 식단에 담기
        </button>
      )}

      <div className="mt-5">
        <Section
          title="장보기 목록"
          desc={`${days}일 · 1인분 기준 ${list.itemCount}가지${pantry.size ? ` · 집에 있는 ${pantry.size}가지는 뺐습니다` : ''}. 괄호 안은 흔한 포장 단위, 양은 1인분 조리 가늠입니다. 산 것은 눌러 표시합니다.`}
          right={
            <div className="flex gap-1.5 print:hidden">
              <button className="btn-outline py-1.5 text-xs" onClick={copy}>복사</button>
              <button className="btn-outline py-1.5 text-xs" onClick={share}>보내기</button>
            </div>
          }
        >
          {msg && <p className="mb-2 rounded-lg bg-brand-50 px-3 py-2 text-[11.5px] text-brand-800 print:hidden" role="status">{msg}</p>}
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
                    const pk = it.self ? null : packHint(it.name, it.qty, it.unit)
                    const keep = storageHint(it.name)
                    return (
                      <li key={k}>
                        <button className="flex w-full items-start gap-2.5 py-1.5 text-left" onClick={() => toggleBought(k)} aria-pressed={done}>
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${done ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 bg-white'}`} aria-hidden>
                            {done && <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8.5l3 3 7-7" /></svg>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`text-[13px] ${done ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                              {it.name} <span className="num font-semibold">{fmtQty(it)}</span>
                              {pk && <span className="text-stone-500"> ({pk})</span>}
                              {keep && <span className="ml-1.5 rounded bg-warn-50 px-1 text-[10px] text-warn-700">{keep}</span>}
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
            그대로 드시는 {list.selfCount}가지는 그 자체로 적었습니다. 냉장 보관 기간은 {STORAGE_SOURCE.label} 기준이고 {COOKED_HINT}입니다.
            표에 없는 것은 포장 표시를 따르세요.
          </p>
        </Section>
      </div>

      {/*
        * 인쇄 판(2026-10-23 사용자 요청: 화면을 그대로 찍지 말고 한눈에 들어오게).
        * 화면에는 보이지 않고(.plan-sheet 는 display:none), 인쇄 단추가 body.print-plan 을 붙인 동안만 종이에 나온다.
        * body 에 바로 붙여(portal) 앱 화면의 틀·여백에 끌려가지 않게 한다. 날짜 × 끼니 표 + 장보기 세 단, A4 한 장을 겨냥한다.
        */}
      {createPortal(
        <div className="plan-sheet" aria-hidden>
          <div className="plan-sheet-head">
            <span className="brand">하루차림 식단표</span>
            <h1>{sheetTitle(rows)}</h1>
            <span className="sub">1인분 기준</span>
          </div>
          <table>
            <thead><tr><th>날짜</th>{SHEET_COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day}>
                  <th><b>{r.weekday}</b>{r.date}<small>{r.index + 1}일째 · {r.kcal.toLocaleString()} kcal · 단백질 {r.protein} g</small></th>
                  {SHEET_COLS.map((c) => (
                    <td key={c}>
                      {r.cells[c].length === 0 && <div className="none">—</div>}
                      {r.cells[c].map((l, i) => (
                        <div key={i}>
                          {l.when && <em>{l.when} </em>}{l.name}{l.portion && <span> {l.portion}</span>}
                          {l.tag && <i className={l.tag === '어제 것' ? 'carry' : undefined}>{l.tag === '2인분' ? '2인분 끓여 두기' : '어제 끓인 것'}</i>}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <h2>장보기 · {list.itemCount}가지{pantry.size ? ` (집에 있는 ${pantry.size}가지 제외)` : ''}</h2>
          <div className="plan-sheet-shop">
            {list.groups.map((g) => (
              <section key={g.cat}>
                <h3>{g.cat}{g.cat === '양념·기본 재료' ? ' (집에 있으면 건너뛰기)' : ''}</h3>
                {g.items.map((it) => {
                  const pk = it.self ? null : packHint(it.name, it.qty, it.unit)
                  const keep = storageHint(it.name)
                  return <div key={`${it.name}|${it.unit}`}>□ {it.name} {fmtQty(it)}{pk ? ` (${pk})` : ''}{keep && <small> {keep}</small>}</div>
                })}
              </section>
            ))}
          </div>
          <p className="plan-sheet-foot">양은 1인분 조리 가늠 · 국·조림은 2인분을 끓여 이틀에 · 냉장 보관 기간은 {STORAGE_SOURCE.label} 기준, 표에 없는 것은 포장 표시 · 치료를 대신하지 않습니다 · harucharim.com</p>
        </div>,
        document.body
      )}
    </div>
  )
}
