import { useMemo, useState } from 'react'
import type { PatientContext, SelectedItem } from '../data/types'
import { buildDayMenu, MEAL_SLOTS, type MealSlot } from '../engine/menu'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge } from './ui'
import { foodContribution } from '../engine/nutrition'
import { CANCER_BY_ID } from '../data/cancers'
import { Empty, Section, Stat } from './ui'

const SLOT_ICON: Record<MealSlot, string> = { 아침: '🌅', 점심: '🍚', 저녁: '🌙', 간식: '🍎' }

export function MenuPlanner({
  patient,
  selected,
  onAdd
}: {
  patient: PatientContext
  selected: SelectedItem[]
  onAdd: (foodId: string, servings: number) => void
}) {
  const [built, setBuilt] = useState(false)
  const menu = useMemo(() => buildDayMenu(selected, patient), [selected, patient, built])
  const profile = CANCER_BY_ID[patient.cancer]

  if (selected.length === 0) {
    return (
      <Empty>
        먼저 ‘음식 찾기’에서 드시고 싶은 음식을 골라 주세요.
        <br />
        고르신 것을 바탕으로 {profile.name}에 맞는 하루 식단을 구성해 드립니다.
      </Empty>
    )
  }

  const totalKcal = Math.round(menu.totals.kcal ?? 0)
  const totalProtein = Math.round(menu.totals.protein ?? 0)
  const totalNa = Math.round(menu.totals.na ?? 0)

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
              {menu.scope}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {profile.name} · {menu.season}철 기준 식단
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              아래 아침·점심·저녁·간식을 <strong>모두 합한 것이 하루 한 사람분</strong>입니다.
              한 끼 분량이 아니니 유의하세요.
            </p>
          </div>
          <button className="btn-ghost shrink-0 text-xs" onClick={() => setBuilt((b) => !b)}>
            다시 구성
          </button>
        </div>
      </div>

      <Section
        title="하루 영양 합계"
        desc={`고르신 ${selected.length}가지에 부족한 부분을 채운 결과입니다.`}
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat label="에너지" value={String(totalKcal)} unit="kcal" hint={`목표 ${menu.target.kcal[0]}~${menu.target.kcal[1]}`} />
          <Stat label="단백질" value={String(totalProtein)} unit="g" hint={`목표 ${menu.target.protein[0]} g 이상`} />
          <Stat label="나트륨" value={String(totalNa)} unit="mg" hint={`상한 ${profile.target.naLimit ?? 2000} mg`}
            tone={totalNa > (profile.target.naLimit ?? 2000) ? 'bad' : 'good'} />
        </div>
      </Section>

      {menu.removed.length > 0 && (
        <Section title="제외한 음식" desc="고르신 것 중 이 암종·시기에서 권하지 않는 항목입니다.">
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
                      onClick={() => onAdd(r.alternative!.id, 1)}
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

      <Section
        title="끼니별 구성"
        desc="네 끼니를 모두 합한 것이 하루 목표량입니다. 제철 재료에는 표시가 붙습니다."
      >
        <div className="space-y-3">
          {MEAL_SLOTS.map((slot) => {
            const entries = menu.meals[slot]
            if (entries.length === 0) return null
            const slotKcal = entries.reduce(
              (sum, e) => sum + (foodContribution(e.food, e.servings).kcal ?? 0), 0
            )
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
                      <li key={e.food.id} className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                            {e.food.name}
                          </span>
                          {e.seasonal && (
                            <span className="chip shrink-0 bg-emerald-100 text-emerald-700">제철</span>
                          )}
                          {e.origin === 'added' && (
                            <span className="chip shrink-0 bg-brand-100 text-brand-700">추천</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {e.food.serving.label} × {e.servings} · {Math.round(per.kcal ?? 0)} kcal ·
                          단백질 {(per.protein ?? 0).toFixed(1)} g · 나트륨 {Math.round(per.na ?? 0)} mg
                        </div>
                        {e.origin === 'added' && e.ruleTitle && (
                          <div className="mt-1.5 rounded-lg bg-brand-50 px-2.5 py-2">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              {e.contribution && (
                                <span className="chip bg-brand-600 text-white">{e.contribution}</span>
                              )}
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

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-slate-400">
        이 식단은 <strong>하루(24시간) 전체</strong>를 기준으로, 선택하신 음식과 입력하신 정보만으로 계산한 참고안입니다.
        추천 항목마다 어떤 권고에 따른 것인지와 그 근거를 함께 표시했습니다.
        실제 처방·영양 상담을 대체하지 않습니다.
      </p>
    </div>
  )
}

/** 추천 근거 문헌 */
function Refs({ ids }: { ids: string[] }) {
  const refs = ids.map((id) => REF_BY_ID[id]).filter(Boolean)
  if (refs.length === 0) return null
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-[10px] font-medium text-brand-700/70 hover:text-brand-800">
        근거 {refs.length}건
      </summary>
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
