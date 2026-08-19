import { useMemo } from 'react'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { FOOD_BY_ID } from '../data/foods'
import { SUPPLEMENT_BY_ID } from '../data/supplements'
import { CANCER_BY_ID } from '../data/cancers'
import { evaluateSelection } from '../engine/rules'
import {
  fmt, getDailyReference, NUTRIENT_META, personalTarget, sumIntake
} from '../engine/nutrition'
import { REF_BY_ID } from '../data/references'
import { Empty, EvidenceBadge, LevelBadge, Meter, Section, Stat } from './ui'

export function Analysis({
  patient,
  selected,
  supplements,
  onSetServings,
  onRemove,
  onClear
}: {
  patient: PatientContext
  selected: SelectedItem[]
  supplements: string[]
  onSetServings: (foodId: string, servings: number, meal?: MealSlot) => void
  onRemove: (foodId: string, meal?: MealSlot) => void
  onClear: () => void
}) {
  const supps = supplements.map((id) => SUPPLEMENT_BY_ID[id]).filter(Boolean)
  const totals = useMemo(() => sumIntake(selected, supps), [selected, supplements])
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const ref = getDailyReference(patient.sex, patient.age)
  const evalResult = useMemo(() => evaluateSelection(selected, patient), [selected, patient])

  if (selected.length === 0 && supps.length === 0) {
    return <Empty>아직 담은 음식이 없습니다. ‘음식 찾기’에서 먹고 싶은 것을 골라 보세요.</Empty>
  }

  const kcal = totals.kcal ?? 0
  const protein = totals.protein ?? 0
  const na = totals.na ?? 0
  const naLimit = profile.target.naLimit ?? 2000

  const warnings = evalResult.grouped.filter((g) => g.hit.rule.level === 'avoid' || g.hit.rule.level === 'caution')
  const goods = evalResult.grouped.filter((g) => g.hit.rule.level === 'prefer')
  const infos = evalResult.grouped.filter((g) => g.hit.rule.level === 'info')

  return (
    <div>
      <Section
        title="담은 음식"
        desc={`${selected.length}가지${supps.length ? ` · 영양제 ${supps.length}종` : ''}`}
        right={
          selected.length > 0 ? (
            <button className="text-xs font-medium text-slate-400 hover:text-danger-600" onClick={onClear}>
              전체 비우기
            </button>
          ) : undefined
        }
      >
        <div className="space-y-2">
        {([...MEAL_SLOTS, undefined] as (MealSlot | undefined)[]).map((slot) => {
          const items = selected.filter((i) => i.meal === slot)
          if (items.length === 0) return null
          const slotKcal = items.reduce((sum, i) => {
            const f = FOOD_BY_ID[i.foodId]
            return sum + (f ? ((f.per100.kcal * f.serving.g) / 100) * i.servings : 0)
          }, 0)
          return (
        <div key={slot ?? 'none'} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-2">
            <span className="text-sm font-bold text-slate-800">{slot ?? '끼니 미지정'}</span>
            <span className="text-xs tabular-nums text-slate-400">{Math.round(slotKcal)} kcal</span>
          </div>
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const food = FOOD_BY_ID[item.foodId]
            if (!food) return null
            const v = evalResult.verdicts.find((x) => x.food.id === food.id)
            return (
              <li key={item.foodId + '|' + (item.meal ?? '')} className="flex items-center gap-2 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-slate-900">{food.name}</span>
                    {v?.level && v.level !== 'prefer' && v.level !== 'info' && (
                      <LevelBadge level={v.level} />
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {food.serving.label} × {item.servings} ·{' '}
                    {Math.round(((food.per100.kcal * food.serving.g) / 100) * item.servings)} kcal
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    onClick={() => onSetServings(item.foodId, Math.round((item.servings - 0.5) * 10) / 10, item.meal)}
                  >−</button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">{item.servings}</span>
                  <button
                    className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    onClick={() => onSetServings(item.foodId, Math.round((item.servings + 0.5) * 10) / 10, item.meal)}
                  >＋</button>
                  <button
                    className="ml-1 h-7 w-7 rounded-lg text-slate-300 hover:bg-danger-50 hover:text-danger-600"
                    onClick={() => onRemove(item.foodId, item.meal)}
                  >✕</button>
                </div>
              </li>
            )
          })}
        </ul>
        </div>
          )
        })}
        </div>
      </Section>

      <Section
        title="하루 영양 요약"
        desc="아래 값은 담으신 모든 끼니와 영양제를 합한 하루치입니다. 한 끼 기준이 아닙니다."
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="에너지" value={String(Math.round(kcal))} unit="kcal"
            hint={`목표 ${target.kcal[0]}~${target.kcal[1]}`}
            tone={kcal < target.kcal[0] ? 'warn' : kcal > target.kcal[1] * 1.15 ? 'bad' : 'good'}
          />
          <Stat
            label="단백질" value={fmt(protein, 1)} unit="g"
            hint={`목표 ${target.protein[0]} g 이상`}
            tone={protein < target.protein[0] ? 'warn' : 'good'}
          />
          <Stat
            label="나트륨" value={String(Math.round(na))} unit="mg"
            hint={`상한 ${naLimit} mg`}
            tone={na > naLimit ? 'bad' : 'good'}
          />
        </div>

        <div className="card mt-3 space-y-3 p-3.5">
          <MeterRow label="에너지" value={kcal} min={target.kcal[0]} max={target.kcal[1]} unit="kcal" />
          <MeterRow label="단백질" value={protein} min={target.protein[0]} max={target.protein[1]} unit="g" />
          <MeterRow label="나트륨" value={na} min={0} max={naLimit} unit="mg" overLimit={na > naLimit} />
          {profile.target.fiberTarget && (
            <MeterRow
              label="식이섬유" value={totals.fiber ?? 0}
              min={profile.target.fiberTarget[0]} max={profile.target.fiberTarget[1]} unit="g"
            />
          )}
        </div>
      </Section>

      {warnings.length > 0 && (
        <Section title="확인이 필요한 항목" desc="선택한 음식 중 이 암종·시기에서 문제가 될 수 있는 것들입니다.">
          <div className="space-y-2">
            {warnings.map((g) => (
              <RuleCard key={g.hit.rule.id} g={g} />
            ))}
          </div>
        </Section>
      )}

      {evalResult.interactions.length > 0 && (
        <Section title="약물 상호작용" desc="복용 중이라고 선택하신 약과 관련된 내용입니다.">
          <div className="space-y-2">
            {evalResult.interactions.map(({ hit, foods }) => (
              <div key={hit.interaction.id} className="card border-sky-200 bg-sky-50/40 p-3.5">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <LevelBadge level={hit.interaction.level} />
                  <EvidenceBadge level={hit.interaction.evidence} />
                </div>
                <p className="text-sm font-semibold text-slate-900">{hit.interaction.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{hit.interaction.reason}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  해당 음식: {foods.map((f) => f.name).join(', ')}
                </p>
                <Refs ids={hit.interaction.refIds} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {goods.length > 0 && (
        <Section title="잘 고르신 항목" desc="근거상 이 암종에 도움이 되는 방향입니다.">
          <div className="space-y-2">
            {goods.map((g) => <RuleCard key={g.hit.rule.id} g={g} />)}
          </div>
        </Section>
      )}

      {infos.length > 0 && (
        <Section title="알아 두면 좋은 것">
          <div className="space-y-2">
            {infos.map((g) => <RuleCard key={g.hit.rule.id} g={g} />)}
          </div>
        </Section>
      )}

      <Section title="영양소 상세" desc="한국인 영양소 섭취기준(2020) 권장량 대비 비율입니다.">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {NUTRIENT_META.filter((m) => typeof totals[m.key] === 'number' && totals[m.key]! > 0).map((m) => {
                const v = totals[m.key]!
                const rec = ref.recommended[m.key]
                const up = ref.upper[m.key]
                const goal = ref.goal[m.key]
                const pct = rec ? Math.round((v / rec) * 100) : null
                const over = up ? v > up : goal ? v > goal : false
                return (
                  <tr key={m.key}>
                    <td className="px-3.5 py-2 text-slate-600">{m.label}</td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums text-slate-900">
                      {fmt(v, m.digits)}
                      <span className="ml-1 text-xs font-normal text-slate-400">{m.unit}</span>
                    </td>
                    <td className="w-24 px-3.5 py-2 text-right text-xs tabular-nums">
                      {over ? (
                        <span className="font-semibold text-danger-600">상한 초과</span>
                      ) : pct !== null ? (
                        <span className={pct < 60 ? 'text-warn-600' : 'text-slate-400'}>{pct}%</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-slate-400">
          비율은 성별·연령에 따른 권장섭취량(또는 충분섭취량) 대비 값입니다. 나트륨·당류·포화지방은 권장량이 아니라
          목표 상한과 비교합니다.
        </p>
      </Section>
    </div>
  )
}

function MeterRow({
  label, value, min, max, unit, overLimit
}: { label: string; value: number; min: number; max: number; unit: string; overLimit?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-400">
          {Math.round(value)} / {max} {unit}
        </span>
      </div>
      <Meter value={value} min={min} max={max} overLimit={overLimit} />
    </div>
  )
}

function RuleCard({ g }: { g: { hit: { rule: import('../data/types').NutritionRule; source: string; sourceLabel?: string }; foods: import('../data/types').Food[] } }) {
  const { rule, source, sourceLabel } = g.hit
  const tone =
    rule.level === 'avoid' ? 'border-danger-200 bg-danger-50/40'
    : rule.level === 'caution' ? 'border-warn-200 bg-warn-50/40'
    : rule.level === 'prefer' ? 'border-brand-200 bg-brand-50/40'
    : 'border-slate-200'
  return (
    <div className={`card p-3.5 ${tone}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <LevelBadge level={rule.level} />
        <EvidenceBadge level={rule.evidence} />
        <span className="chip bg-white/70 text-slate-500">{source === '증상' ? sourceLabel : source}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900">{rule.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{rule.reason}</p>
      <p className="mt-2 text-[11px] text-slate-500">해당 음식: {g.foods.map((f) => f.name).join(', ')}</p>
      <Refs ids={rule.refIds} />
    </div>
  )
}

function Refs({ ids }: { ids: string[] }) {
  const refs = ids.map((id) => REF_BY_ID[id]).filter(Boolean)
  if (refs.length === 0) return null
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
        근거 {refs.length}건
      </summary>
      <ul className="mt-1.5 space-y-1">
        {refs.map((r) => (
          <li key={r.id} className="text-[11px] leading-relaxed text-slate-500">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-slate-300">{r.citation}</a>
            ) : r.citation}
          </li>
        ))}
      </ul>
    </details>
  )
}
