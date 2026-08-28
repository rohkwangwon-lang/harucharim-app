import { useMemo } from 'react'
import { portionLabel } from '../lib/portion'
import { IconEvening, IconMorning, IconNoon, IconSnack, IconSuggest } from './icons'
import type { MealSlot, PatientContext, SelectedItem } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { FOOD_BY_ID } from '../data/foods'
import { SUPPLEMENT_BY_ID } from '../data/supplements'
import { CANCER_BY_ID } from '../data/cancers'
import { buildDayMenu, currentSeason, dayNotes, fiberGoal, ideasFromIngredients, intakeTrend, microUnknownNames, naUnknownNames, planNotes, recentFoods } from '../engine/menu'
import { evaluateSelection } from '../engine/rules'
import { foodContribution, observedWeightGain, personalTarget, sumIntake, targetNotes } from '../engine/nutrition'
import { BASE_EXERCISE, CONDITION_EXERCISE_NOTES, EXERCISE_BY_CANCER } from '../data/exercise'
import { REF_BY_ID } from '../data/references'
import { ChipGroup, DayNoteList, EvidenceBadge, LevelBadge, NutrientPanel, NutrientRow, nutrientState, Section, TodayStatus } from './ui'
import { MEDICATIONS } from '../data/interactions'
import type { Phase, PatientCondition } from '../data/types'

/* 화면에 보여 줄 이름. 저장은 id 로 한다 — 약을 이름으로 견주면 규칙이 비켜 간다. */
const PHASE_LABELS: { id: Phase; name: string }[] = [
  { id: 'during_rt', name: '방사선치료 중' },
  { id: 'during_chemo', name: '항암치료 중' },
  { id: 'neutropenia', name: '호중구감소증' },
  { id: 'post_op', name: '수술 후 회복기' },
  { id: 'survivorship', name: '치료를 마쳤습니다' }
]

const CONDITION_LABELS: { id: PatientCondition; name: string }[] = ([
  '식욕부진', '체중감소', '체중증가', '오심·구토', '구강점막염', '설사', '변비',
  '연하곤란', '위절제후', '장루보유', '호중구감소증', '복수', '신기능저하', '당뇨', '고혈압'
] as PatientCondition[]).map((c) => ({ id: c, name: c }))
import { label as dayLabel, today as todayKey } from '../lib/day'

const SLOT_ICON: Record<MealSlot, typeof IconMorning> = {
  아침: IconMorning, 오전간식: IconSnack, 점심: IconNoon, 오후간식: IconSnack, 저녁: IconEvening
}

/**
 * 오늘 식단.
 *
 * 이 앱을 여는 가장 흔한 이유는 "오늘 뭘 먹을까" 또는 "지금 먹은 게 괜찮을까" 이다.
 * 그래서 첫 화면을 끼니 단위로 두고, 담고·평가받고·운동까지 한 자리에서 끝낸다.
 */
export function TodayMeals({
  patient,
  selected,
  supplements,
  onAddTo,
  onSetServings,
  onSetMeal,
  onRemove,
  onClear,
  onApplySuggestion,
  onSeeSuggestions,
  day,
  onBackToToday,
  diary,
  shown,
  weights,
  weight,
  onSetWeight,
  onPatch
}: {
  patient: PatientContext
  /** 치료 시기·증상·약을 이 화면에서 바로 고칠 때 쓴다 */
  onPatch: (patch: Partial<PatientContext>) => void
  selected: SelectedItem[]
  supplements: string[]
  /** 해당 끼니로 음식을 담으러 간다 */
  onAddTo: (meal: MealSlot) => void
  onSetServings: (foodId: string, servings: number, meal?: MealSlot) => void
  /** 담은 항목의 끼니를 옮긴다 */
  onSetMeal: (foodId: string, from: MealSlot | undefined, to: MealSlot) => void
  onRemove: (foodId: string, meal?: MealSlot) => void
  onClear: () => void
  /** 추천 항목을 실제로 담는다 */
  onApplySuggestion: (foodId: string, meal: MealSlot) => void
  /** 추천 식단 화면으로 넘어간다 */
  onSeeSuggestions: () => void
  /** 지금 보고 있는 날짜 */
  day: string
  /** 오늘로 되돌아간다 */
  onBackToToday: () => void
  /** 날짜별 기록 — 최근에 드신 것을 피하는 데 쓴다 */
  diary: Record<string, SelectedItem[]>
  /** 날짜별로 보여 드린 추천 — 적어 두지 않으셔도 되풀이를 막기 위한 것 */
  shown?: Record<string, string[]>
  /** 날짜별 체중 — 몇 주에 걸친 방향을 보는 데 쓴다 */
  weights: Record<string, number>
  /** 그날 체중 */
  weight?: number
  onSetWeight: (kg: number) => void
}) {
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const supps = supplements.map((id) => SUPPLEMENT_BY_ID[id]).filter(Boolean)

  const totals = useMemo(() => sumIntake(selected, supps), [selected, supplements])
  const evalResult = useMemo(() => evaluateSelection(selected, patient), [selected, patient])
  /*
   * 여기서도 '보여 드린 것' 을 함께 본다.
   *
   * 추천 탭에만 붙여 놓았더니, 이 화면의 '이렇게 채워 보세요' 는 그대로
   * 적어 두신 기록만 보고 있었다. 적지 않으시는 분께는 잣대가 늘 비어 있어
   * 같은 것이 날마다 올라온다 — 고친 자리 옆에 고치지 않은 자리가 남은 셈이다.
   *
   * 적어 두는 것은 추천 탭 한 곳에서만 한다. 두 화면이 서로 덮어쓰면
   * 나중에 연 쪽이 이겨서 무엇이 남을지 알 수 없게 된다.
   */
  const recent = useMemo(() => recentFoods(diary, day, undefined, shown), [diary, day, shown])
  /*
   * 며칠에 걸친 흐름.
   *
   * 하루 넘친 것은 흔한 일이라 조언할 거리가 아니다.
   * 몇 주째 넘치면서 체중까지 오르고 있다면 그때는 말씀드릴 만하다.
   */
  const trend = useMemo(() => {
    const intake = intakeTrend(diary, patient, day)
    if (!intake) return null
    const gain = observedWeightGain(weights ?? {}, day)
    return { ...intake, gain }
  }, [diary, patient, day, weights])
  const menu = useMemo(
    () => buildDayMenu(selected, patient, { supplements: supps, day, recent }),
    [selected, patient, supplements, day, recent]
  )
  /*
   * 평가는 '추천으로 채워진 하루'가 아니라 '실제로 담으신 것'을 대상으로 한다.
   * 위쪽 숫자는 담은 것을 세고 아래쪽 평가는 추천까지 센다면, 같은 화면에서
   * 나트륨이 두 개 나온다. 실제로 그렇게 나와 있었다.
   */
  const suppTotals = useMemo(
    () => supps.reduce((t, x) => ({ ...t, na: (t.na ?? 0) + ((x.perDay as { na?: number }).na ?? 0) }), {} as { na?: number }),
    [supplements]
  )
  const notes = useMemo(() => dayNotes(totals, suppTotals, patient, naUnknownNames(selected), microUnknownNames(selected, patient)), [totals, suppTotals, patient, selected])
  /** 담아 두신 식재료로 만들 수 있는 요리 */
  const ideas = useMemo(() => ideasFromIngredients(selected, patient), [selected, patient])

  const kcal = Math.round(totals.kcal ?? 0)
  const protein = Math.round(totals.protein ?? 0)
  const na = Math.round(totals.na ?? 0)
  const fiber = Math.round((totals.fiber ?? 0) * 10) / 10
  const naLimit = profile.target.naLimit ?? 2000
  // 신장 기능이 떨어진 분에게는 단백질 과다가 문제가 된다
  const renalCare = patient.conditions.some((c) => c === '신기능저하' || c === '간성뇌증위험')
  const fiber_ = fiberGoal(patient, profile)
  /** 기본값과 다르게 잡은 것들 — 목표를 왜 그 값으로 두었는지 */
  const adjustments = useMemo(
    () => [...targetNotes(patient), ...planNotes(patient)],
    [patient]
  )
  const empty = selected.length === 0
  const kcalState = nutrientState(kcal, target.kcal[0], target.kcal[1], { empty })
  const proteinState = nutrientState(protein, target.protein[0], target.protein[1], { empty, overOk: !renalCare })
  const fiberState = nutrientState(fiber, fiber_.range[0], fiber_.range[1], { empty })
  const naState = nutrientState(na, 0, naLimit, { empty, limit: naLimit })

  /*
   * 어느 끼니에도 걸리지 않는 항목.
   * 불러올 때 끼니를 채워 넣으므로 보통은 없지만, 없다고 단정하지 않는다.
   * 예전에 이런 항목이 화면에서만 사라진 채 합계와 추천에는 남아,
   * 담지도 않은 음식이 아침에 들어가 있는 것처럼 보였다.
   */
  const unassigned = selected.filter((i) => !i.meal || !MEAL_SLOTS.includes(i.meal))

  const filledSlots = MEAL_SLOTS.filter((m) => selected.some((i) => i.meal === m))
  const emptySlots = MEAL_SLOTS.filter((m) => !selected.some((i) => i.meal === m))

  const warnings = evalResult.grouped.filter(
    (g) => g.hit.rule.level === 'avoid' || g.hit.rule.level === 'caution'
  )

  return (
    <div>
      {day !== todayKey() && (
        <button
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-warn-300 bg-warn-50 px-3.5 py-2.5 text-left"
          onClick={onBackToToday}
        >
          <span className="text-xs leading-relaxed text-warn-800">
            <strong>{dayLabel(day)}</strong> 기록을 보고 계십니다. 여기서 담으면 그날 기록에 들어갑니다.
          </span>
          <span className="shrink-0 text-xs font-semibold text-warn-800">오늘로 →</span>
        </button>
      )}

      {/*
        * 오늘의 몸 상태.
        *
        * 치료 시기·증상·약은 다른 설정과 성격이 다르다 — 자주 바뀌고,
        * 바뀌면 추천이 크게 달라진다. 그런데 고치려면 내 정보 탭까지
        * 들어가야 했다. 매일 여는 화면에서 매일 바뀌는 것을 못 고치고 있었다.
        */}
      <TodayStatus
        phaseLabel={PHASE_LABELS.find((p) => p.id === patient.phase)?.name ?? '치료 시기'}
        conditions={patient.conditions}
        medications={patient.medications}
      >
        <ChipGroup
          label="지금 어느 단계인가요"
          options={PHASE_LABELS}
          value={[patient.phase]}
          single
          onToggle={(id) => onPatch({ phase: id })}
        />
        <ChipGroup
          label="지금 겪고 계신 증상"
          options={CONDITION_LABELS}
          value={patient.conditions}
          onToggle={(id) =>
            onPatch({
              conditions: patient.conditions.includes(id)
                ? patient.conditions.filter((c) => c !== id)
                : [...patient.conditions, id]
            })
          }
        />
        <ChipGroup
          label="복용 중인 약"
          options={MEDICATIONS.map((m) => ({ id: m.id, name: m.name }))}
          value={patient.medications}
          onToggle={(id) =>
            onPatch({
              medications: patient.medications.includes(id)
                ? patient.medications.filter((m) => m !== id)
                : [...patient.medications, id]
            })
          }
        />
      </TodayStatus>

      {/* ── 오늘 요약 ─────────────────────────────────── */}
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">나만의 식단 구성</p>
        <p className="mt-1 text-sm font-semibold text-stone-900">
          {profile.name} · {currentSeason()}철 · {patient.weightKg} kg 기준
        </p>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">
          아침·점심·저녁·간식을 <strong>모두 합한 것이 하루치</strong>입니다. 한 끼 분량이 아닙니다.
        </p>

        {/*
          * 기본값과 다르게 잡은 것이 있으면 그 자리에서 밝힌다.
          * 앱이 조용히 목표를 낮추면, 화면의 숫자가 왜 그 값인지 알 수 없다.
          * 특히 낮춘 경우는 모르고 보면 앱이 덜 먹으라고 하는 것처럼 읽힌다.
          */}
        {adjustments.length > 0 && (
          <ul className="mt-2.5 space-y-1.5 border-t border-brand-200/70 pt-2.5">
            {adjustments.map((a) => (
              <li key={a.label}>
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-brand-800">
                    {a.label}
                    <span className="ml-1 text-[10px] font-medium text-brand-600/70">이유 보기</span>
                  </summary>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-600">{a.reason}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        * 숫자 카드와 막대가 같은 내용을 두 번 보여 주고 있었다.
        * 그런데 정작 "이게 충분한 건가" 는 목표를 외우고 있어야 알 수 있었다.
        * 판정을 앱이 먼저 내려 글자와 색으로 함께 말한다.
        */}
      <NutrientPanel states={[kcalState, proteinState, fiberState, naState]}>
        <NutrientRow
          label="에너지" value={kcal} unit="kcal"
          min={target.kcal[0]} max={target.kcal[1]} state={kcalState}
        />
        <NutrientRow
          label="단백질" value={protein} unit="g"
          min={target.protein[0]} max={target.protein[1]} state={proteinState}
        />
        <NutrientRow
          label="식이섬유" value={fiber} unit="g"
          min={fiber_.range[0]} max={fiber_.range[1]} state={fiberState}
          hint={fiber_.lowResidue ? '지금은 잔사를 줄이는 시기입니다' : undefined}
        />
        <NutrientRow
          label="나트륨" value={na} unit="mg"
          min={0} max={naLimit} limit={naLimit} state={naState}
        />
      </NutrientPanel>

      {/* 체중 기록 — 매일 같은 조건에서 재는 것이 중요하다 */}
      <div className="card mb-4 flex items-center gap-2 p-3.5">
        <span className="shrink-0 text-xs font-medium text-stone-600">
          {day === todayKey() ? '오늘' : dayLabel(day)} 체중
        </span>
        <input
          type="number" inputMode="decimal"
          className="input flex-1 text-right"
          placeholder="기록 안 함"
          defaultValue={weight ?? ''}
          onBlur={(e) => {
            const v = Number(e.target.value)
            if (v !== (weight ?? 0)) onSetWeight(v || 0)
          }}
        />
        <span className="shrink-0 text-sm text-stone-500">kg</span>
      </div>

      {/* ── 일부만 넣어도 된다는 안내 ─────────────────── */}
      {emptySlots.length > 0 && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white px-3.5 py-3">
          <p className="text-xs leading-relaxed text-stone-600">
            {filledSlots.length === 0 ? (
              <>
                <strong className="text-stone-800">나만의 식단을 구성해 보세요.</strong> 아침·점심·저녁·간식 중
                드시고 싶은 메뉴를 찾아 채우시면 <strong>검증하고 평가해 드립니다.</strong>
                <br />
                전부 채우지 않으셔도 됩니다. 필요한 끼니만 채우시면 나머지는{' '}
                <strong>영양을 따져 {profile.name}에 맞는 식단으로 추천</strong>해 드립니다.
              </>
            ) : (
              <>
                <strong className="text-stone-800">{emptySlots.join('·')}이 비어 있습니다.</strong> 채우지 않으셔도
                괜찮습니다. 아래 각 끼니의 <strong>이렇게 채워 보세요</strong>에서 하나씩 담으시거나,
                <strong> 추천 식단</strong> 탭에서 하루치를 한 번에 받아보실 수 있습니다.
              </>
            )}
          </p>
        </div>
      )}

      {/* 담은 식재료로 만들 수 있는 요리 */}
      {ideas.length > 0 && (
        <Section
          title="담으신 재료로 이런 메뉴는 어떠세요"
          desc={
            '재료만으로는 한 끼가 되지 않아, 그것을 쓰는 요리를 찾아 드렸습니다. ' +
            '싱거운 것과 이 암종에 맞는 것을 먼저 보여 드립니다. ' +
            '담으시면 재료 대신 그 요리로 셈합니다.'
          }
        >
          <div className="space-y-2.5">
            {ideas.map((idea) => (
              <div key={idea.source.id} className="card overflow-hidden">
                <div className="border-b border-stone-100 bg-stone-50/60 px-3.5 py-2">
                  <span className="text-sm font-bold text-stone-800">{idea.source.name}</span>
                  <span className="ml-1.5 text-[11px] text-stone-400">으로 만들 수 있는 요리</span>
                </div>
                <ul className="divide-y divide-stone-100">
                  {idea.dishes.map((d) => {
                    const per = foodContribution(d, 1)
                    return (
                      <li key={d.id} className="flex items-center gap-2 px-3.5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-900">{d.name}</p>
                          <p className="truncate text-[11px] text-stone-400">
                            {d.serving.label} · {Math.round(per.kcal ?? 0)} kcal · 나트륨 {per.na === undefined ? '정보 없음' : `${Math.round(per.na)} mg`}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {MEAL_SLOTS.slice(0, 3).map((m) => (
                            <button
                              key={m}
                              className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-brand-100 hover:text-brand-700"
                              onClick={() => onApplySuggestion(d.id, m)}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 추천 식단으로 건너가는 길 */}
      <button
        className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-brand-600 px-4 py-4 text-left text-white shadow-md transition-colors hover:bg-brand-700 active:bg-brand-800"
        onClick={onSeeSuggestions}
      >
        <IconSuggest className="h-6 w-6 shrink-0 text-white/90" strokeWidth={1.8} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">하루치를 한 번에 추천받기</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-white/85">
            {filledSlots.length > 0
              ? '담으신 것에 맞춰 나머지 끼니를 채워 드립니다'
              : '담은 것이 없어도 됩니다. 처음부터 구성해 드립니다'}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-xl text-white/70">›</span>
      </button>

      {/* ── 끼니별 구성 ───────────────────────────────── */}
      <Section
        title="끼니별 구성"
        right={
          selected.length > 0 ? (
            <button className="text-xs font-medium text-stone-400 hover:text-danger-600" onClick={onClear}>
              전체 비우기
            </button>
          ) : undefined
        }
      >
        <div className="space-y-2.5">
          {MEAL_SLOTS.map((slot) => {
            const items = selected.filter((i) => i.meal === slot)
            const slotKcal = items.reduce((sum, i) => {
              const f = FOOD_BY_ID[i.foodId]
              return sum + (f ? ((f.per100.kcal * f.serving.g) / 100) * i.servings : 0)
            }, 0)
            // 이 끼니에 앱이 채워 넣은 추천
            const suggested = menu.meals[slot].filter((e) => e.origin === 'added')

            return (
              <div key={slot} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-3.5 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-stone-800">
                    {(() => { const I = SLOT_ICON[slot]; return <I className="h-4 w-4 text-stone-500" /> })()}
                    {slot}
                  </span>
                  <span className="text-xs tabular-nums text-stone-400">
                    {items.length > 0 ? `${Math.round(slotKcal)} kcal` : '비어 있음'}
                  </span>
                </div>

                {items.length > 0 && (
                  <ul className="divide-y divide-stone-100">
                    {items.map((item) => {
                      const food = FOOD_BY_ID[item.foodId]
                      if (!food) return null
                      const v = evalResult.verdicts.find((x) => x.food.id === food.id)
                      const per = foodContribution(food, item.servings)
                      return (
                        <li key={item.foodId + slot} className="flex items-center gap-2 px-3.5 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-stone-900">{food.name}</span>
                              {v?.level === 'avoid' && <LevelBadge level="avoid" />}
                              {v?.level === 'caution' && <LevelBadge level="caution" />}
                            </div>
                            <div className="mt-0.5 text-[11px] text-stone-400">
                              {portionLabel(food.serving.label, item.servings)} · {Math.round(per.kcal ?? 0)} kcal ·
                              나트륨 {per.na === undefined ? '정보 없음' : `${Math.round(per.na)} mg`}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              className="h-7 w-7 rounded-lg bg-stone-100 text-stone-600"
                              onClick={() => onSetServings(item.foodId, Math.round((item.servings - 0.5) * 10) / 10, slot)}
                            >−</button>
                            <span className="w-7 text-center text-sm font-medium tabular-nums">{item.servings}</span>
                            <button
                              className="h-7 w-7 rounded-lg bg-stone-100 text-stone-600"
                              onClick={() => onSetServings(item.foodId, Math.round((item.servings + 0.5) * 10) / 10, slot)}
                            >＋</button>
                            <button
                              className="ml-0.5 h-7 w-7 rounded-lg text-stone-300 hover:bg-danger-50 hover:text-danger-600"
                              onClick={() => onRemove(item.foodId, slot)}
                            >✕</button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* 추천 채우기 */}
                {suggested.length > 0 && (
                  <div className="border-t border-stone-100 bg-brand-50/40 px-3.5 py-2.5">
                    <p className="mb-1.5 text-[11px] font-bold text-brand-700">이렇게 채워 보세요</p>
                    <div className="space-y-1.5">
                      {suggested.map((e) => (
                        <div key={e.food.id} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-stone-800">
                              {e.food.name}
                              {e.seasonal && <span className="ml-1 text-[10px] text-brand-600">제철</span>}
                            </p>
                            <p className="truncate text-[11px] text-stone-500">{e.contribution}</p>
                          </div>
                          <button
                            className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white"
                            onClick={() => onApplySuggestion(e.food.id, slot)}
                          >
                            담기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="w-full border-t border-stone-100 px-3.5 py-2.5 text-xs font-medium text-brand-700 hover:bg-stone-50"
                  onClick={() => onAddTo(slot)}
                >
                  ＋ {slot}에 음식 추가
                </button>
              </div>
            )
          })}

          {unassigned.length > 0 && (
            <div className="card overflow-hidden border-warn-200">
              <div className="border-b border-warn-200 bg-warn-50/70 px-3.5 py-2">
                <p className="text-sm font-bold text-stone-800">끼니를 정하지 않은 것</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                  예전 판에서 담으신 기록입니다. 합계에는 들어가 있으니 끼니를 정해 주세요.
                </p>
              </div>
              <ul className="divide-y divide-stone-100">
                {unassigned.map((item) => {
                  const food = FOOD_BY_ID[item.foodId]
                  if (!food) return null
                  return (
                    <li key={item.foodId} className="px-3.5 py-2.5">
                      <p className="text-sm font-medium text-stone-900">{food.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {MEAL_SLOTS.map((m) => (
                          <button
                            key={m}
                            className="chip border border-stone-200 bg-white text-stone-600 hover:border-brand-500 hover:text-brand-700"
                            onClick={() => onSetMeal(item.foodId, item.meal, m)}
                          >
                            {m}으로
                          </button>
                        ))}
                        <button
                          className="chip border border-stone-200 bg-white text-stone-400 hover:border-danger-300 hover:text-danger-600"
                          onClick={() => onRemove(item.foodId, item.meal)}
                        >
                          빼기
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* ── 평가 ──────────────────────────────────────── */}
      {selected.length > 0 && (
        <Section title="오늘 식단 평가" desc="담으신 것을 기준으로 계산한 결과입니다.">
<DayNoteList notes={notes} />

          {warnings.length > 0 && (
            <div className="mt-2 space-y-2">
              {warnings.slice(0, 4).map((g) => (
                <div
                  key={g.hit.rule.id}
                  className={`card p-3.5 ${
                    g.hit.rule.level === 'avoid' ? 'border-danger-200 bg-danger-50/40' : 'border-warn-200 bg-warn-50/40'
                  }`}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <LevelBadge level={g.hit.rule.level} />
                    <EvidenceBadge level={g.hit.rule.evidence} />
                  </div>
                  <p className="text-sm font-semibold text-stone-900">{g.hit.rule.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">{g.hit.rule.reason}</p>
                  <p className="mt-2 text-[11px] text-stone-500">
                    해당 음식: {g.foods.map((f) => f.name).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── 운동 조언 ─────────────────────────────────── */}
      {selected.length > 0 && (
        <ExerciseAdvice patient={patient} kcal={kcal} target={target.kcal} trend={trend} />
      )}

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-stone-400">
        이 화면은 <strong>하루(24시간)</strong> 기준입니다. 담으신 음식과 입력하신 정보만으로 계산한 참고값이며,
        실제 처방·영양 상담을 대체하지 않습니다.
      </p>
    </div>
  )
}


/**
 * 오늘 먹은 양에 맞춘 운동 조언.
 *
 * "몇 kcal 먹었으니 몇 분 뛰세요" 식의 계산은 하지 않는다.
 *
 * 그렇게 하고 싶어지는 마음은 이해가 간다. 그런데 셈이 맞지 않는다 —
 * 65 kg 인 분이 시속 5 km 로 한 시간을 걸으면 230 kcal 남짓이다.
 * 하루 500 kcal 을 넘긴 것을 걷기로 지우려면 두 시간을 넘게 걸어야 한다.
 * 게다가 음식을 갚아야 할 빚으로 만들면 식사가 벌이 된다.
 *
 * 운동을 권할 근거가 없다는 뜻이 아니다. 오히려 매우 강하다 —
 * CHALLENGE 무작위배정 시험에서 대장암 보조항암 후 3 년 운동 프로그램이
 * 5 년 무병생존을 73.9 % 에서 80.3 % 로 올렸다. 다만 그 개입은 3 년짜리 프로그램이었지
 * 하루치 상쇄가 아니었다. 운동은 그 자체의 이익으로 권해야 한다.
 *
 * 그래서 하루가 아니라 흐름을 본다. 몇 주째 넘치고 체중도 오르고 있다면
 * 그때는 섭취를 조정하면서 활동량도 함께 올리시라고 말씀드린다.
 */
function ExerciseAdvice({
  patient, kcal, target, trend
}: {
  patient: PatientContext
  kcal: number
  target: [number, number]
  trend: { recordedDays: number; avgKcal: number; overDays: number; gain: { pct: number; days: number } | null } | null
}) {
  const plan = EXERCISE_BY_CANCER[patient.cancer]
  const main = plan.items[0] ?? BASE_EXERCISE[0]
  const walk = BASE_EXERCISE[0]
  const strength = BASE_EXERCISE[1]

  const under = kcal < target[0]
  const over = kcal > target[1] * 1.15

  const conditionNote = patient.conditions
    .map((c) => CONDITION_EXERCISE_NOTES[c])
    .find(Boolean)

  /*
   * 흐름으로 말할 수 있는 때만 말한다.
   * 치료를 마치신 분이고, 기록한 날의 절반 넘게 목표를 넘었으며,
   * 체중이 오르고 있거나 이미 과체중일 때다.
   */
  const h = patient.heightCm / 100
  const bmi = h > 0 ? patient.weightKg / (h * h) : 22
  const sustained =
    patient.phase === 'survivorship' &&
    trend !== null &&
    trend.overDays >= Math.ceil(trend.recordedDays / 2) &&
    (trend.gain !== null || bmi >= 23)

  return (
    <Section title="오늘 운동" desc="식단과 함께 봐야 의미가 있는 부분입니다.">
      <div className="card p-4">
        <p className="text-sm leading-relaxed text-stone-700">
          {under ? (
            <>
              오늘 열량이 목표보다 적습니다. <strong>운동량을 늘리기보다 먼저 채우시는 편</strong>이 좋습니다.
              부족한 상태에서 운동을 늘리면 근육부터 빠집니다. 가벼운 걷기 정도로 유지하세요.
            </>
          ) : over ? (
            <>
              오늘 열량이 목표를 넘었습니다. 다만 <strong>한 끼로 만회하려 굶지 마세요.</strong>{' '}
              내일 채소와 단백질 비중을 올리고, 오늘은 식후 걷기를 더하는 편이 낫습니다.
            </>
          ) : (
            <>
              오늘 열량은 목표 범위 안에 있습니다. 이 상태를 유지하면서{' '}
              <strong>근육을 지키는 운동</strong>을 더하시면 됩니다.
            </>
          )}
        </p>

        {sustained && (
          <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5">
            <p className="text-xs font-bold text-brand-800">
              최근 {trend!.recordedDays}일 가운데 {trend!.overDays}일이 목표를 넘었습니다
              {trend!.gain ? ` · 체중도 ${trend!.gain.pct} % 늘었습니다` : ''}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
              하루 넘친 것은 흔한 일이라 따로 말씀드리지 않지만, 몇 주째 이어지고 있습니다.
              치료를 마친 뒤에는 체중 관리가 재발 위험과 연결되는 암종이 있습니다.
              <strong className="text-stone-800"> 먹은 만큼 걸어서 지우는 방식은 권하지 않습니다</strong> —
              시속 5 km 로 한 시간을 걸어도 230 kcal 남짓이라 셈이 맞지 않고, 식사가 갚아야 할 빚이 됩니다.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-600">
              대신 두 가지를 함께 하시는 편이 낫습니다. 섭취는 조금씩 줄이시고,
              <strong className="text-stone-800"> 활동은 주 150분에서 300분 쪽으로 늘리세요</strong>.
              운동은 상쇄가 아니라 그 자체로 이득이 있습니다 — 대장암에서는 보조항암 후
              3년 운동 프로그램이 5년 무병생존을 73.9 %에서 80.3 %로 올렸습니다.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] font-medium text-brand-700/70">근거 2건</summary>
              <ul className="mt-1 space-y-0.5">
                {['challenge2025', 'acs2022'].map((id) => REF_BY_ID[id]).filter(Boolean).map((r) => (
                  <li key={r.id} className="text-[10px] leading-relaxed text-stone-500">
                    {r.url
                      ? <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-stone-300">{r.citation}</a>
                      : r.citation}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div className="mt-3 space-y-2">
          <ExerciseLine label="유산소" name={walk.name} dose={walk.dose} />
          <ExerciseLine label="근력" name={strength.name} dose={strength.dose} />
          {main !== walk && <ExerciseLine label={`${CANCER_BY_ID[patient.cancer].name} 특이`} name={main.name} dose={main.dose} highlight />}
        </div>

        {conditionNote && (
          <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2 text-[11px] leading-relaxed text-warn-700">
            {conditionNote}
          </p>
        )}

        {main.refIds.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] font-medium text-stone-400">
              근거 {main.refIds.length}건
            </summary>
            <ul className="mt-1.5 space-y-1">
              {main.refIds.map((id) => {
                const r = REF_BY_ID[id]
                if (!r) return null
                return (
                  <li key={id} className="text-[11px] leading-relaxed text-stone-500">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-stone-300">
                        {r.citation}
                      </a>
                    ) : r.citation}
                  </li>
                )
              })}
            </ul>
          </details>
        )}
      </div>
    </Section>
  )
}

function ExerciseLine({
  label, name, dose, highlight
}: { label: string; name: string; dose: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${highlight ? 'bg-brand-50' : 'bg-stone-50'}`}>
      <div className="flex items-center gap-1.5">
        <span className={`chip ${highlight ? 'bg-brand-600 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`}>
          {label}
        </span>
        <span className="text-xs font-semibold text-stone-800">{name}</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed tabular-nums text-stone-600">{dose}</p>
    </div>
  )
}
