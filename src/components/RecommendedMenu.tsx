import { useMemo, useState } from 'react'
import { IconEvening, IconMorning, IconNoon, IconSnack } from './icons'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { buildDayMenu } from '../engine/menu'
import { foodContribution, personalTarget } from '../engine/nutrition'
import { CANCER_BY_ID } from '../data/cancers'
import { SUPPLEMENT_BY_ID } from '../data/supplements'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, Section, Stat } from './ui'

const SLOT_ICON: Record<MealSlot, typeof IconMorning> = {
  아침: IconMorning, 점심: IconNoon, 저녁: IconEvening, 간식: IconSnack
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
  onApply,
  onApplyAll,
  onGoCompose
}: {
  patient: PatientContext
  selected: SelectedItem[]
  /** 복용 중인 영양제 id — 하루 합계에 함께 넣는다 */
  supplements: string[]
  onApply: (foodId: string, meal: MealSlot) => void
  onApplyAll: (items: { foodId: string; meal: MealSlot }[]) => void
  onGoCompose: () => void
}) {
  const [seed, setSeed] = useState(0)
  const profile = CANCER_BY_ID[patient.cancer]
  const naLimit = profile.target.naLimit ?? 2000
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const supps = useMemo(
    () => supplements.map((id) => SUPPLEMENT_BY_ID[id]).filter(Boolean),
    [supplements]
  )
  const menu = useMemo(() => buildDayMenu(selected, patient, supps), [selected, patient, supps, seed])

  const added = MEAL_SLOTS.flatMap((slot) =>
    menu.meals[slot].filter((e) => e.origin === 'added').map((e) => ({ foodId: e.food.id, meal: slot }))
  )

  /*
   * 화면에 보이는 숫자끼리 더해도 합계가 나오도록, 항목별로 반올림한 값을 그대로 쌓는다.
   * 정확한 값을 마지막에 한 번 반올림하면 항목을 손으로 더해 본 사람과 숫자가 어긋난다.
   * 영양제 몫은 끼니에 속하지 않으므로 따로 세어 마지막에 더한다.
   */
  const slotNa: Record<MealSlot, number> = { 아침: 0, 점심: 0, 저녁: 0, 간식: 0 }
  const slotKcal: Record<MealSlot, number> = { 아침: 0, 점심: 0, 저녁: 0, 간식: 0 }
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
          <button className="btn-ghost shrink-0 text-xs" onClick={() => setSeed((n) => n + 1)}>
            다시 구성
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="에너지" value={String(kcal)} unit="kcal" hint={`목표 ${target.kcal[0]}~${target.kcal[1]}`} />
        <Stat label="단백질" value={String(protein)} unit="g" hint={`목표 ${target.protein[0]} g 이상`} />
        <Stat label="나트륨" value={String(na)} unit="mg" hint={`상한 ${naLimit}`}
          tone={na > naLimit ? 'bad' : 'good'} />
      </div>

      {added.length > 0 && (
        <button className="btn-primary mb-4 w-full" onClick={() => onApplyAll(added)}>
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
                          {e.seasonal && <span className="chip shrink-0 bg-emerald-100 text-emerald-700">제철</span>}
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
                          {e.food.serving.label} × {e.servings} · {Math.round(per.kcal ?? 0)} kcal ·
                          단백질 {(per.protein ?? 0).toFixed(1)} g · 나트륨 {Math.round(per.na ?? 0)} mg
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
        <div className="card divide-y divide-stone-100">
          {menu.notes.map((n, i) => (
            <p key={i} className="px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">{n}</p>
          ))}
        </div>
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
