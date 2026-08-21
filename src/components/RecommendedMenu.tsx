import { useMemo, useState } from 'react'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { buildDayMenu } from '../engine/menu'
import { foodContribution, personalTarget } from '../engine/nutrition'
import { CANCER_BY_ID } from '../data/cancers'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, Section, Stat } from './ui'

const SLOT_ICON: Record<MealSlot, string> = { 아침: '🌅', 점심: '🍚', 저녁: '🌙', 간식: '🍎' }

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
  onApply,
  onApplyAll,
  onGoCompose
}: {
  patient: PatientContext
  selected: SelectedItem[]
  onApply: (foodId: string, meal: MealSlot) => void
  onApplyAll: (items: { foodId: string; meal: MealSlot }[]) => void
  onGoCompose: () => void
}) {
  const [seed, setSeed] = useState(0)
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const menu = useMemo(() => buildDayMenu(selected, patient), [selected, patient, seed])

  const added = MEAL_SLOTS.flatMap((slot) =>
    menu.meals[slot].filter((e) => e.origin === 'added').map((e) => ({ foodId: e.food.id, meal: slot }))
  )

  const kcal = Math.round(menu.totals.kcal ?? 0)
  const protein = Math.round(menu.totals.protein ?? 0)
  const na = Math.round(menu.totals.na ?? 0)

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">하루(24시간) 전체</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {profile.name} · {menu.season}철 추천 식단
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
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
        <Stat label="나트륨" value={String(na)} unit="mg" hint={`상한 ${profile.target.naLimit ?? 2000}`}
          tone={na > (profile.target.naLimit ?? 2000) ? 'bad' : 'good'} />
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
                <p className="text-sm font-semibold text-slate-900">{r.food.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{r.reason}</p>
                {r.alternative && (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400">이렇게 바꿔 보세요</span>
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
            if (entries.length === 0) return null
            const slotKcal = entries.reduce((s, e) => s + (foodContribution(e.food, e.servings).kcal ?? 0), 0)
            return (
              <div key={slot} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-2">
                  <span className="text-sm font-bold text-slate-800">
                    <span className="mr-1.5">{SLOT_ICON[slot]}</span>{slot}
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">{Math.round(slotKcal)} kcal</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {entries.map((e) => {
                    const per = foodContribution(e.food, e.servings)
                    return (
                      <li key={e.food.id + slot} className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                            {e.food.name}
                          </span>
                          {e.seasonal && <span className="chip shrink-0 bg-emerald-100 text-emerald-700">제철</span>}
                          {e.origin === 'chosen' ? (
                            <span className="chip shrink-0 bg-slate-100 text-slate-500">내가 담음</span>
                          ) : (
                            <button
                              className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white"
                              onClick={() => onApply(e.food.id, slot)}
                            >
                              담기
                            </button>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
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

      <Section title="점검">
        <div className="card divide-y divide-slate-100">
          {menu.notes.map((n, i) => (
            <p key={i} className="px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">{n}</p>
          ))}
        </div>
      </Section>

      <button className="btn-outline mb-4 w-full text-xs" onClick={onGoCompose}>
        ← 나만의 식단 구성으로 돌아가기
      </button>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-slate-400">
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
          <li key={r.id} className="text-[10px] leading-relaxed text-slate-500">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-slate-300">{r.citation}</a>
            ) : r.citation}
          </li>
        ))}
      </ul>
    </details>
  )
}
