import { useState } from 'react'
import type { Food, MealSlot, PatientContext } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { evaluateFood } from '../engine/rules'
import { foodContribution, NUTRIENT_META, fmt } from '../engine/nutrition'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, LevelBadge } from './ui'

/** 식품 상세 — 하단 시트 형태 */
export function FoodDetail({
  food,
  patient,
  onClose,
  onAdd,
  defaultMeal
}: {
  food: Food
  patient: PatientContext
  onClose: () => void
  onAdd: (servings: number, meal: MealSlot) => void
  /** 검색 화면에서 미리 정해 둔 끼니가 있으면 그것을 기본값으로 */
  defaultMeal?: MealSlot
}) {
  const [meal, setMeal] = useState<MealSlot>(defaultMeal ?? '점심')
  const [servings, setServings] = useState(1)
  const verdict = evaluateFood(food, patient, 1)
  const per = foodContribution(food, servings)

  const shown = NUTRIENT_META.filter((m) => typeof per[m.key] === 'number' && per[m.key]! > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative flex max-h-[85vh] max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
        {/* 헤더 */}
        <div className="shrink-0 border-b border-slate-100 px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{food.name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {food.group} · 1회 제공량 {food.serving.label} ({food.serving.g} g)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {food.cuisine && food.cuisine !== '무관' && (
                  <span className="chip bg-slate-100 text-slate-500">{food.cuisine}</span>
                )}
                {food.season && food.season.length > 0 && (
                  <span className="chip bg-emerald-100 text-emerald-700">제철 {food.season.join('·')}</span>
                )}
                {food.form === 'ingredient' && (
                  <span className="chip bg-amber-100 text-amber-700">식재료</span>
                )}
                {food.maker && <span className="chip bg-slate-100 text-slate-500">{food.maker}</span>}
              </div>
            </div>
            {verdict.level && <LevelBadge level={verdict.level} />}
          </div>
          {food.auto && (
            <p className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              식품의약품안전처 공공데이터에서 자동으로 들여온 항목입니다.
              <strong className="text-slate-700"> 영양성분 값은 식약처 자료</strong>라 신뢰할 수 있지만,
              임상 판정은 성분으로 확인할 수 있는 것(나트륨·당·지방 등)만 붙어 있습니다.
              조리법이나 가공 방식에 따른 판단은 빠져 있을 수 있습니다.
            </p>
          )}
          {food.note && (
            <p className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              {food.note}
            </p>
          )}
        </div>

        {/* 담기 조작 — 스크롤과 상관없이 늘 보이도록 헤더 바로 아래 둔다 */}
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-medium text-slate-500">양</span>
            <div className="flex items-center gap-1">
              <button
                className="h-8 w-8 rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 disabled:opacity-30"
                disabled={servings <= 0.5}
                onClick={() => setServings((v) => Math.max(0.5, Math.round((v - 0.5) * 10) / 10))}
              >−</button>
              <span className="w-16 text-center text-sm font-semibold tabular-nums text-slate-900">
                {servings}인분
              </span>
              <button
                className="h-8 w-8 rounded-lg bg-white text-slate-600 ring-1 ring-slate-200"
                onClick={() => setServings((v) => Math.round((v + 0.5) * 10) / 10)}
              >＋</button>
            </div>
            <span className="ml-auto text-right text-[11px] leading-tight text-slate-500">
              {Math.round(food.serving.g * servings)} g<br />
              <span className="font-medium text-slate-700">{Math.round(per.kcal ?? 0)} kcal</span>
            </span>
          </div>

          <div className="mt-2 flex gap-1.5">
            {MEAL_SLOTS.map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                  meal === m
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-300 bg-white text-slate-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 이 암종에서의 판단 */}
          {(verdict.hits.length > 0 || verdict.interactions.length > 0) && (
            <div className="mb-5">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                이 환자에게 해당되는 내용
              </h4>
              <div className="space-y-2">
                {verdict.hits.map((h) => (
                  <div key={h.rule.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <LevelBadge level={h.rule.level} />
                      <EvidenceBadge level={h.rule.evidence} />
                      <span className="chip bg-slate-100 text-slate-500">
                        {h.source === '증상' ? h.sourceLabel : h.source}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{h.rule.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{h.rule.reason}</p>
                    <RefList ids={h.rule.refIds} />
                  </div>
                ))}
                {verdict.interactions.map((h) => (
                  <div key={h.interaction.id} className="rounded-xl border border-sky-200 bg-sky-50/50 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <LevelBadge level={h.interaction.level} />
                      <EvidenceBadge level={h.interaction.evidence} />
                      <span className="chip bg-sky-100 text-sky-700">약물 상호작용</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{h.interaction.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{h.interaction.reason}</p>
                    <RefList ids={h.interaction.refIds} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 성분표 */}
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
{servings}인분 ({Math.round(food.serving.g * servings)} g) 기준 영양성분
          </h4>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <tbody>
                {shown.map((m, i) => (
                  <tr key={m.key} className={i % 2 ? 'bg-slate-50/60' : ''}>
                    <td className="px-3 py-1.5 text-slate-600">{m.label}</td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums text-slate-900">
                      {fmt(per[m.key]!, m.digits)}
                      <span className="ml-1 text-xs font-normal text-slate-400">{m.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {food.gi && (
            <p className="mt-2 text-xs text-slate-500">혈당지수(GI) {food.gi} — 포도당 100 기준</p>
          )}

          {food.tags.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">특성</h4>
              <div className="flex flex-wrap gap-1.5">
                {food.tags.map((t) => (
                  <span key={t} className="chip bg-slate-100 text-slate-600">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="safe-bottom shrink-0 border-t border-slate-100 bg-white px-5 py-3">
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>닫기</button>
            <button className="btn-primary flex-[2]" onClick={() => onAdd(servings, meal)}>
              {meal}에 {servings}인분 담기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RefList({ ids }: { ids: string[] }) {
  const refs = ids.map((id) => REF_BY_ID[id]).filter(Boolean)
  if (refs.length === 0) return null
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
        근거 {refs.length}건 보기
      </summary>
      <ul className="mt-1.5 space-y-1">
        {refs.map((r) => (
          <li key={r.id} className="text-[11px] leading-relaxed text-slate-500">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-slate-300 hover:text-brand-600">
                {r.citation}
              </a>
            ) : (
              r.citation
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
