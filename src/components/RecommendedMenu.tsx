import { useEffect, useMemo, useState } from 'react'
import { portionLabel } from '../lib/portion'
import { menuConditionKey } from '../lib/menuIdentity'
import { track } from '../lib/stats'
import { IconEvening, IconMorning, IconNoon, IconShuffle, IconSnack } from './icons'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { buildDayMenu, fiberGoal, recentFoods, type DayMenu } from '../engine/menu'
import { foodContribution, personalTarget } from '../engine/nutrition'
import { CANCER_BY_ID } from '../data/cancers'
import { SUPPLEMENT_BY_ID } from '../data/supplements'
import { REF_BY_ID } from '../data/references'
import { DayNoteList, EvidenceBadge, NutrientPanel, NutrientRow, nutrientState, Section } from './ui'

const SLOT_ICON: Record<MealSlot, typeof IconMorning> = {
  아침: IconMorning, 오전간식: IconSnack, 점심: IconNoon, 오후간식: IconSnack, 저녁: IconEvening
}

/**
 * 추천 식단.
 *
 * '나만의 식단 구성'이 담은 것을 다루는 화면이라면, 여기는 그 위에
 * 앱이 채워 완성한 하루를 보여 준다. 담은 것이 없어도 통째로 제안한다.
 * 마음에 들면 한 번에 가져갈 수 있어야 실제로 쓰인다.
 */
export function RecommendedMenu({
  patient,
  selected,
  supplements,
  day,
  diary,
  shown,
  onShown,
  onApply,
  onApplyAll,
  onGoCompose
}: {
  patient: PatientContext
  selected: SelectedItem[]
  /** 복용 중인 영양제 id — 하루 합계에 함께 넣는다 */
  supplements: string[]
  /** 지금 보고 있는 날짜 — 날마다 다른 식단이 나오게 한다 */
  day: string
  /** 날짜별 기록 — 최근에 드신 것을 피하는 데 쓴다 */
  diary: Record<string, SelectedItem[]>
  /** 날짜별로 보여 드린 추천 — 적어 두지 않으셔도 되풀이를 막기 위한 것 */
  shown?: Record<string, string[]>
  /** 오늘 보여 드린 상을 적어 둔다 */
  onShown?: (day: string, foodIds: string[]) => void
  onApply: (foodId: string, meal: MealSlot) => void
  onApplyAll: (items: { foodId: string; meal: MealSlot }[]) => void
  onGoCompose: () => void
}) {
  const profile = CANCER_BY_ID[patient.cancer]
  const naLimit = profile.target.naLimit ?? 2000
  // 신장 기능이 떨어진 분에게는 단백질 과다가 문제가 된다
  const renalCare = patient.conditions.some((c) => c === '신기능저하' || c === '간성뇌증위험')
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const supps = useMemo(
    () => supplements.map((id) => SUPPLEMENT_BY_ID[id]).filter(Boolean),
    [supplements]
  )
  /*
   * 날짜와 최근 기록을 함께 넘긴다.
   * 날짜를 넘기지 않으면 조건이 같은 한 언제 열어도 똑같은 식단이 나온다.
   * 실제로 8월 한 달 동안 하루도 빠짐없이 같은 여섯 가지였다.
   */
  /*
   * 내용이 같으면 같은 것으로 본다.
   *
   * 이 지도는 아래에서 '조건이 바뀌었나' 를 재는 잣대로도 쓰인다.
   * 그런데 지금 보여 드리는 상을 적어 두기 시작하면서(shown), 상을 하나 보여 드릴 때마다
   * shown 이 새로 만들어지고 이 지도도 새 것이 되었다. 담긴 내용은 똑같은데도 —
   * recentFoods 는 오늘 것을 건너뛰므로 오늘 무엇을 보여 드렸든 오늘의 내용은 그대로다.
   *
   * 그 바람에 '다시 구성' 을 누르면 새 안을 만들자마자 '조건이 바뀌었다' 로 읽혀
   * 그 안이 곧바로 버려졌다. 누르면 아무 일도 일어나지 않는 것처럼 보였다.
   * 그래서 껍데기가 아니라 내용으로 견준다.
   */
  const recent = useMemo(() => recentFoods(diary, day, undefined, shown), [diary, day, shown])

  /*
   * 지금까지 보여 드린 안을 모두 들고 있는다.
   *
   * 예전에는 번호(seed)만 올리고 결과는 버렸다. 그래서 '다시 구성' 을 눌러
   * 지나친 안으로 돌아갈 방법이 없었다 — 앞의 것이 나았다는 것은
   * 다음 것을 보고 나서야 알게 되는데, 그때는 이미 사라진 뒤였다.
   *
   * 번호를 되돌리는 것만으로는 안 된다. 다음 안을 만들 때 직전 안의 주요리를
   * 피하도록 해 두어서, 같은 번호라도 만들 때마다 다른 것이 나오기 때문이다.
   * 그러니 만든 것을 그대로 들고 있다가 앞뒤로 오간다.
   */
  const AVOID_TOP = 2
  const [drafts, setDrafts] = useState<DayMenu[]>([])
  const [cursor, setCursor] = useState(0)

  /* 첫 안 — 조건이 바뀌면 이것부터 다시 만들어진다 */
  const first = useMemo(
    () => buildDayMenu(selected, patient, { supplements: supps, day, nonce: 0, recent }),
    [selected, patient, supps, day, recent]
  )

  /*
   * 조건이 달라지면 지금까지 만든 안은 버린다 — 다른 사람의 식단이 되기 때문이다.
   *
   * 무엇이 '달라진 것' 인지는 menuIdentity 에 적어 두었다. 값을 그대로 의존성에 넣으면
   * 내용이 같아도 껍데기가 새것이면 달라진 것으로 읽혀, '다시 구성' 이 먹통이 된다.
   */
  const conditionKey = useMemo(
    () => menuConditionKey(patient, selected, supplements, day, recent),
    [patient, selected, supplements, day, recent]
  )
  useEffect(() => { setDrafts([]); setCursor(0) }, [conditionKey])
  useEffect(() => { track('menu_build') }, [])

  const menu = cursor === 0 ? first : (drafts[cursor - 1] ?? first)
  const seed = cursor

  /** 열량이 큰 두 가지 — 다음 안에서는 이것을 피한다 */
  const bigTwo = (m: DayMenu) =>
    MEAL_SLOTS
      .flatMap((slot) => m.meals[slot].map((e) => ({
        id: e.food.id, kcal: foodContribution(e.food, e.servings).kcal ?? 0
      })))
      .sort((a, b) => b.kcal - a.kcal)
      .slice(0, AVOID_TOP)

  const rebuild = () => {
    /* 앞으로 가 본 적이 있으면 만들지 않고 그때 것을 다시 보여 드린다 */
    if (cursor < drafts.length) { setCursor(cursor + 1); return }
    const avoid = new Map(recent)
    for (const e of bigTwo(menu)) avoid.set(e.id, 0)
    const next = buildDayMenu(selected, patient, {
      supplements: supps, day, nonce: cursor + 1, recent: avoid
    })
    setDrafts((d) => [...d, next])
    setCursor(cursor + 1)
  }

  const added = MEAL_SLOTS.flatMap((slot) =>
    menu.meals[slot].filter((e) => e.origin === 'added').map((e) => ({ foodId: e.food.id, meal: slot }))
  )

  /*
   * 지금 보여 드리고 있는 상을 적어 둔다.
   *
   * 되풀이를 막는 잣대가 적어 두신 기록뿐이었다. 매일 적으시는 분은 드물어서,
   * 대부분의 화면에서는 그 잣대가 늘 비어 있었다 — 스무하루 내내 같은 닭백숙이었다.
   * 오늘 것은 오늘 추천에 영향을 주지 않는다(recentFoods 가 오늘 날짜를 건너뛴다).
   * 내일부터 어제 보신 것을 피하게 될 뿐이다.
   */
  const shownIds = MEAL_SLOTS.flatMap((slot) => menu.meals[slot].map((e) => e.food.id)).join(',')
  useEffect(() => {
    if (!onShown) return
    onShown(day, shownIds ? shownIds.split(',') : [])
  }, [onShown, day, shownIds])

  /*
   * 화면에 보이는 숫자끼리 더해도 합계가 나오도록, 항목별로 반올림한 값을 그대로 쌓는다.
   * 정확한 값을 마지막에 한 번 반올림하면 항목을 손으로 더해 본 사람과 숫자가 어긋난다.
   * 영양제 몫은 끼니에 속하지 않으므로 따로 세어 마지막에 더한다.
   */
  const slotNa: Record<MealSlot, number> = { 아침: 0, 오전간식: 0, 점심: 0, 오후간식: 0, 저녁: 0 }
  const slotKcal: Record<MealSlot, number> = { 아침: 0, 오전간식: 0, 점심: 0, 오후간식: 0, 저녁: 0 }
  for (const slot of MEAL_SLOTS) {
    for (const e of menu.meals[slot]) {
      const per = foodContribution(e.food, e.servings)
      slotNa[slot] += Math.round(per.na ?? 0)
      slotKcal[slot] += Math.round(per.kcal ?? 0)
    }
  }
  const suppNa = Math.round(menu.suppTotals.na ?? 0)
  const suppKcal = Math.round(menu.suppTotals.kcal ?? 0)
  const na = MEAL_SLOTS.reduce((n, s) => n + slotNa[s], 0) + suppNa
  const kcal = MEAL_SLOTS.reduce((n, s) => n + slotKcal[s], 0) + suppKcal
  const protein = Math.round(menu.totals.protein ?? 0)
  const fiber = Math.round((menu.totals.fiber ?? 0) * 10) / 10
  const fg = fiberGoal(patient, profile)
  const kcalState = nutrientState(kcal, target.kcal[0], target.kcal[1])
  const proteinState = nutrientState(protein, target.protein[0], target.protein[1], { overOk: !renalCare })
  const fiberState = nutrientState(fiber, fg.range[0], fg.range[1])
  const naState = nutrientState(na, 0, naLimit, { limit: naLimit })

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">하루(24시간) 전체</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {profile.name} · {menu.season}철 추천 식단
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              {selected.length > 0 ? (
                <>담으신 <strong>{selected.length}가지</strong>에 부족한 부분을 채웠습니다.</>
              ) : (
                <>아직 담으신 것이 없어 <strong>처음부터 구성</strong>했습니다. 마음에 드는 것만 가져가셔도 됩니다.</>
              )}
            </p>
          </div>
          {/*
            * 마음에 안 들면 다시 받아 볼 수 있다는 것을 알려 주는 단추.
            *
            * 회색 바탕(btn-ghost)에 작은 글씨라 연둣빛 상자 위에서 눌리지 않는
            * 설명 딱지처럼 보였다. 실제로 이 단추는 거의 눌리지 않았다.
            * 누를 수 있는 것처럼 보이게 하고, 무엇을 하는 단추인지 아래에 한 줄 적는다.
            */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/*
              * 앞의 안으로 돌아가는 단추.
              *
              * 앞의 것이 나았다는 것은 다음 것을 보고 나서야 알게 되는데,
              * 예전에는 그때 이미 사라진 뒤였다. 처음 안을 보고 계실 때는 나오지 않는다 —
              * 눌러도 아무 일이 없는 단추는 없느니만 못하다.
              */}
            {cursor > 0 && (
              <button
                className="rounded-xl border-2 border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50"
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
              >
                ‹ 이전 안
              </button>
            )}
            <button
              className="rounded-xl border-2 border-brand-600 bg-white px-3.5 py-2 text-sm font-bold text-brand-700 shadow-sm transition-colors hover:bg-brand-50 active:bg-brand-100"
              onClick={() => { track('menu_retry'); rebuild() }}
            >
              <span className="flex items-center gap-1.5">
                <IconShuffle className="h-4 w-4" />
                다시 구성
              </span>
            </button>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-brand-800/70">
          {seed === 0 ? (
            <>마음에 드는 것이 없으면 <strong>다시 구성</strong>을 눌러 보세요. 같은 영양 목표로 다른 조합을 짜 드립니다.</>
          ) : (
            /*
              * 몇 번째 안인지 밝힌다.
              *
              * 눌렀는데 곁들이 한둘만 바뀌면 아무 일도 없는 것처럼 보인다.
              * 실제로 그런 말을 들었다. 폭을 넓혀 절반 가까이 바뀌게 고쳤지만,
              * 그래도 무엇이 달라졌는지 눈으로 찾게 두기보다 세어 드리는 편이 낫다.
              */
            <><strong>{cursor + 1}번째 안</strong>입니다{drafts.length > cursor ? ` (지금까지 ${drafts.length + 1}가지)` : ''}.
              {' '}계속 누르시면 다른 조합을 더 보여 드리고, <strong>이전 안</strong>으로 돌아가실 수도 있습니다.</>
          )}
        </p>
      </div>

      <NutrientPanel states={[kcalState, proteinState, fiberState, naState]}>
        <NutrientRow label="에너지" value={kcal} unit="kcal"
          min={target.kcal[0]} max={target.kcal[1]} state={kcalState} />
        <NutrientRow label="단백질" value={protein} unit="g"
          min={target.protein[0]} max={target.protein[1]} state={proteinState} />
        <NutrientRow label="식이섬유" value={fiber} unit="g"
          min={fg.range[0]} max={fg.range[1]} state={fiberState}
          hint={fg.lowResidue ? '지금은 잔사를 줄이는 시기입니다' : undefined} />
        <NutrientRow label="나트륨" value={na} unit="mg"
          min={0} max={naLimit} limit={naLimit} state={naState} />
      </NutrientPanel>

      {added.length > 0 && (
        <button className="btn-primary mb-4 w-full" onClick={() => { track('menu_take'); onApplyAll(added) }}>
          추천 {added.length}가지를 내 식단에 담기
        </button>
      )}

      {menu.removed.length > 0 && (
        <Section title="빼는 것이 좋겠습니다" desc="담으신 것 중 이 암종·시기에서 권하지 않는 항목입니다.">
          <div className="space-y-2">
            {menu.removed.map((r) => (
              <div key={r.food.id} className="card border-danger-200 bg-danger-50/40 p-3.5">
                <p className="text-sm font-semibold text-stone-900">{r.food.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">{r.reason}</p>
                {r.alternative && (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-stone-400">이렇게 바꿔 보세요</span>
                      <p className="truncate text-sm font-medium text-brand-700">{r.alternative.name}</p>
                    </div>
                    <button
                      className="btn-primary shrink-0 py-1.5 text-xs"
                      onClick={() => onApply(r.alternative!.id, '점심')}
                    >
                      담기
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="끼니별 구성" desc="네 끼니를 모두 합한 것이 하루 목표량입니다.">
        <div className="space-y-2.5">
          {MEAL_SLOTS.map((slot) => {
            const entries = menu.meals[slot]
            const why = menu.slotNotes[slot]
            // 비어 있어도 칸을 없애지 않는다. 왜 비었는지가 답이기 때문이다.
            if (entries.length === 0 && !why) return null
            return (
              <div key={slot} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-3.5 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-stone-800">
                    {(() => { const I = SLOT_ICON[slot]; return <I className="h-4 w-4 text-stone-500" /> })()}
                    {slot}
                  </span>
                  <span className="text-xs tabular-nums text-stone-400">
                    {slotKcal[slot]} kcal · 나트륨 {slotNa[slot]} mg
                  </span>
                </div>
                {why && (
                  <p className="border-b border-stone-100 bg-warn-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-stone-600">
                    {why}
                  </p>
                )}
                <ul className="divide-y divide-stone-100">
                  {entries.map((e) => {
                    const per = foodContribution(e.food, e.servings)
                    return (
                      <li key={e.food.id + slot} className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">
                            {e.food.name}
                          </span>
                          {e.seasonal && <span className="chip shrink-0 bg-accent-100 text-accent-700">제철</span>}
                          {e.origin === 'chosen' ? (
                            <span className="chip shrink-0 bg-stone-100 text-stone-500">내가 담음</span>
                          ) : (
                            <button
                              className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white"
                              onClick={() => onApply(e.food.id, slot)}
                            >
                              담기
                            </button>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-stone-400">
                          {portionLabel(e.food.serving.label, e.servings)} · {Math.round(per.kcal ?? 0)} kcal ·
                          단백질 {(per.protein ?? 0).toFixed(1)} g · 나트륨 {per.na === undefined ? '정보 없음' : `${Math.round(per.na)} mg`}
                        </div>
                        {e.origin === 'added' && e.ruleTitle && (
                          <div className="mt-1.5 rounded-lg bg-brand-50 px-2.5 py-2">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              {e.contribution && <span className="chip bg-brand-600 text-white">{e.contribution}</span>}
                              {e.evidence && <EvidenceBadge level={e.evidence} />}
                            </div>
                            <p className="text-[11px] leading-relaxed text-brand-900">{e.ruleTitle}</p>
                            <Refs ids={e.refIds ?? []} />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="나트륨 합계 내역" desc="위 끼니별 숫자를 그대로 더한 값입니다. 손으로 더해 보셔도 같습니다.">
        <div className="card divide-y divide-stone-100">
          {MEAL_SLOTS.filter((s) => menu.meals[s].length > 0).map((s) => (
            <div key={s} className="flex items-center justify-between px-3.5 py-2 text-xs">
              <span className="text-stone-500">{s}</span>
              <span className="tabular-nums text-stone-700">{slotNa[s].toLocaleString('ko-KR')} mg</span>
            </div>
          ))}
          {suppNa > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2 text-xs">
              <span className="text-stone-500">
                영양제 {supps.length}종
                <span className="ml-1 text-[10px] text-stone-400">끼니에 들어가지 않는 몫</span>
              </span>
              <span className="tabular-nums text-stone-700">{suppNa.toLocaleString('ko-KR')} mg</span>
            </div>
          )}
          <div className="flex items-center justify-between bg-stone-50/60 px-3.5 py-2.5 text-sm font-bold">
            <span className="text-stone-800">합계</span>
            <span className={`tabular-nums ${na > naLimit ? 'text-danger-700' : 'text-stone-900'}`}>
              {na.toLocaleString('ko-KR')} mg
              <span className="ml-1.5 text-[11px] font-medium text-stone-400">/ 상한 {naLimit.toLocaleString('ko-KR')}</span>
            </span>
          </div>
        </div>
      </Section>

      <Section title="점검">
<DayNoteList notes={menu.notes} />
      </Section>

      <button
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-800 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-stone-900"
        onClick={onGoCompose}
      >
        <span aria-hidden>←</span> 내 식단으로 돌아가기
      </button>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-stone-400">
        추천 항목마다 어떤 권고에 따른 것인지와 근거를 함께 표시했습니다.
        실제 처방·영양 상담을 대체하지 않습니다.
      </p>
    </div>
  )
}

function Refs({ ids }: { ids: string[] }) {
  const refs = ids.map((id) => REF_BY_ID[id]).filter(Boolean)
  if (refs.length === 0) return null
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-[10px] font-medium text-brand-700/70">근거 {refs.length}건</summary>
      <ul className="mt-1 space-y-0.5">
        {refs.map((r) => (
          <li key={r.id} className="text-[10px] leading-relaxed text-stone-500">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-stone-300">{r.citation}</a>
            ) : r.citation}
          </li>
        ))}
      </ul>
    </details>
  )
}
