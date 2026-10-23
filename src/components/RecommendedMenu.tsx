import { useEffect, useMemo, useRef, useState } from 'react'
import { portionLabel } from '../lib/portion'
import { menuConditionKey } from '../lib/menuIdentity'
import { track } from '../lib/stats'
import { IconEvening, IconMorning, IconNoon, IconShuffle, IconSnack } from './icons'
import type { Cuisine, MealSlot, PatientContext, SelectedItem } from '../data/types'
import { CUISINE_CHOICES, MEAL_SLOTS } from '../data/types'
import { buildDayMenu, fiberGoal, recentFoods, type DayMenu } from '../engine/menu'
import { foodContribution, personalTarget, refeedingRisk, refeedingStage, renalProteinCap } from '../engine/nutrition'
import { CANCER_BY_ID } from '../data/cancers'
import { emergencySigns } from '../data/emergencySigns'
import { MealPlan } from './MealPlan'
import { PLAN_MAX_DAYS } from '../engine/plan'
import { SUPPLEMENT_BY_ID } from '../data/supplements'
import { REF_BY_ID } from '../data/references'
import { DayNoteList, EvidenceBadge, HowTo, NutrientPanel, NutrientRow, nutrientState, Section } from './ui'
import { activeInteractions, activeRules, evaluateFood, howToLines } from '../engine/rules'

const SLOT_ICON: Record<MealSlot, typeof IconMorning> = {
  아침: IconMorning, 오전간식: IconSnack, 점심: IconNoon, 오후간식: IconSnack, 저녁: IconEvening
}

/** 탭을 옮겨도 보던 안을 이어 보이기 위한 기억 — 조건(conditionKey)이 같을 때만 쓴다 */
let DRAFT_MEMORY: { key: string; drafts: DayMenu[]; cursor: number } = { key: '', drafts: [], cursor: 0 }

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
  onGoCompose,
  onPatch,
  onApplyDays,
  onOpenDay
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
  /** 추천에 적힌 양 그대로 담는다 — 반 공기를 한 공기로 담으면 하루 합계가 화면과 달라진다 */
  onApply: (foodId: string, meal: MealSlot, servings?: number) => void
  onApplyAll: (items: { foodId: string; meal: MealSlot; servings: number }[]) => void
  onGoCompose: () => void
  /** 여러 날 식단을 날짜별로 담는다(2026-10-23) */
  onApplyDays?: (byDay: { day: string; items: { foodId: string; servings: number; meal: MealSlot }[] }[]) => void
  /** 여러 날 가운데 한 날을 하루치 화면으로 본다 — 그 날로 옮긴다 */
  onOpenDay?: (day: string) => void
  /** 요리 계통을 이 화면에서 바로 고치실 수 있게 한다 */
  onPatch?: (patch: { cuisines: Cuisine[] }) => void
}) {
  const profile = CANCER_BY_ID[patient.cancer]
  const naLimit = profile.target.naLimit ?? 2000
  // 신장 기능이 떨어진 분에게는 단백질 과다가 문제가 된다
  /* 투석 중이면 단백질이 넘쳐도 문제 삼지 않는다(renalProteinCap) */
  const renalCare = renalProteinCap(patient) || patient.conditions.includes('간성뇌증위험')
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg, day)
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
  /* 음식마다 "어떻게 드시면 되는가" 를 붙이려면 그 음식을 다시 판정해야 한다 — 규칙 목록은 한 번만 모은다 */
  const ruleCache = useMemo(
    () => ({ rules: activeRules(patient), interactions: activeInteractions(patient) }),
    [patient]
  )

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
  /*
   * 다른 탭에 다녀와도 보던 안을 잃지 않는다(2026-10-15).
   * 화면이 내려갔다 다시 올라오면 상태가 처음으로 돌아가, 다섯 번째 안을 보고 '찾기' 에 다녀오면
   * 첫 안으로 돌아와 있었다 — 다시 구성이 저장되지 않는 것처럼 보였다. 조건이 같을 때만 이어 간다.
   */
  const conditionKeyEarly = menuConditionKey(patient, selected, supplements, day,
    recentFoods(diary, day, undefined, shown))
  const kept = DRAFT_MEMORY.key === conditionKeyEarly ? DRAFT_MEMORY : null
  const [drafts, setDrafts] = useState<DayMenu[]>(kept?.drafts ?? [])
  const [cursor, setCursor] = useState(kept?.cursor ?? 0)
  /*
   * 눌렀는데 바꿀 것이 없었는가.
   *
   * 담으신 것은 그대로 두고 빈자리만 채우므로, 하루를 다 담아 두신 뒤에는
   * 다시 구성을 눌러도 같은 상이 나온다. 예전에는 그래도 "2번째 안입니다" 라고 적어,
   * 단추가 고장 난 것처럼 보였다(2026-10-15 사용자 보고). 이제는 바꿀 것이 없다고 밝힌다.
   */
  const [stuck, setStuck] = useState(false)

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
  const firstKey = useRef(conditionKey)
  useEffect(() => {
    /* 처음 그릴 때는 기억해 둔 안을 그대로 쓴다 — 조건이 정말 바뀌었을 때만 버린다 */
    if (firstKey.current === conditionKey) return
    firstKey.current = conditionKey
    setDrafts([]); setCursor(0); setStuck(false)
  }, [conditionKey])
  useEffect(() => { DRAFT_MEMORY = { key: conditionKey, drafts, cursor } }, [conditionKey, drafts, cursor])
  useEffect(() => { track('menu_build') }, [])

  const menu = cursor === 0 ? first : (drafts[cursor - 1] ?? first)
  const signs = useMemo(() => emergencySigns(patient), [patient])
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
    const plate = (m: DayMenu) =>
      MEAL_SLOTS.flatMap((slot) => m.meals[slot].map((e) => `${slot}:${e.food.id}:${e.servings}`)).sort().join(',')
    if (plate(next) === plate(menu)) { setStuck(true); return }
    setStuck(false)
    setDrafts((d) => [...d, next])
    setCursor(cursor + 1)
  }

  const added = MEAL_SLOTS.flatMap((slot) =>
    /*
     * 양까지 함께 넘긴다.
     *
     * 예전에는 음식과 끼니만 넘겨 무엇이든 1인분으로 담겼다. 추천에서 반 공기였던 밥이
     * 내 식단에서는 한 공기가 되어, 목표 안이던 하루가 담는 순간 넘쳤다(2026-10-15 사용자 보고).
     */
    menu.meals[slot].filter((e) => e.origin === 'added').map((e) => ({ foodId: e.food.id, meal: slot, servings: e.servings }))
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
  /*
   * 섬유는 저잔사 시기가 아니면 넘어도 괜찮은 쪽이다 — 아래 점검도 "채우고 넘었습니다" 로 적는다.
   * 위 막대만 '넘음' 으로 칠하면 같은 화면이 두 말을 한다(2026-10-15 사용자 보고).
   */
  const fiberState = nutrientState(fiber, fg.range[0], fg.range[1], { overOk: !fg.lowResidue })
  const naState = nutrientState(na, 0, naLimit, { limit: naLimit })

  /*
   * 재영양 위험이 극단적인 분(BMI 14 미만이거나 15일 넘게 거의 못 드심)의 처음 일주일.
   * NICE 는 하루 5 kcal/kg 에서 시작하고 심전도를 계속 보라고 한다 — 집에서 앱 식단을 따를 단계가 아니다.
   * 식단을 보여 드리지 않고 병원에 연락하시도록 한다(2026-10-15).
   */
  /*
   * 며칠치를 한꺼번에(2026-10-23). 1일이면 지금까지의 하루치 화면, 2~5일이면 여러 날 화면(MealPlan).
   * 5일까지인 까닭은 engine/plan.ts 에 적었다. 고른 값은 이 기기에만 남는다.
   */
  const [days, setDays] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('harucharim.plan.days')); return v >= 1 && v <= PLAN_MAX_DAYS ? v : 1 } catch { return 1 }
  })
  const pickDays = (n: number) => { setDays(n); try { localStorage.setItem('harucharim.plan.days', String(n)) } catch { /* 없어도 된다 */ } }
  const daysPicker = (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-xs font-semibold text-stone-600">며칠치</span>
      <div className="flex gap-1" role="radiogroup" aria-label="며칠치 식단을 받을지">
        {Array.from({ length: PLAN_MAX_DAYS }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={days === n}
            onClick={() => { track('plan_days'); pickDays(n) }}
            className={`chip border transition-colors ${days === n ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'}`}
          >
            {n}일
          </button>
        ))}
      </div>
      <span className="ml-auto text-[10.5px] text-stone-400">장보기 목록은 2일부터</span>
    </div>
  )

  const stage = refeedingStage(patient, day)
  if (stage && refeedingRisk(patient).extreme) {
    return (
      <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-4 text-sm leading-relaxed text-stone-800" role="alert">
        <p className="font-bold text-danger-800">지금은 식단을 짜 드리지 않습니다 — 먼저 병원에 연락해 주세요</p>
        <p className="mt-2">
          체중이 매우 적거나 오래 거의 못 드신 상태에서는, 다시 드시기 시작할 때 혈중 칼륨·인·마그네슘이 떨어지는
          재영양증후군 위험이 큽니다. 이런 경우 영국 국립보건임상연구원(NICE) 지침은 아주 적은 양(체중 1 kg 당 5 kcal)에서
          시작해 심장 감시를 하며 올리도록 합니다 — 의료진이 함께 해야 하는 단계입니다.
        </p>
        <p className="mt-2">오늘이 {stage.day}일째입니다. 담당 의료진과 시작 열량·채혈·비타민 B1 보충을 정하신 뒤에는 내 정보에서 '거의 못 드셨나요' 답을 바꿔 주세요.</p>
      </div>
    )
  }

  if (days > 1) {
    return (
      <div>
        {daysPicker}
        <MealPlan
          patient={patient} selected={selected} supps={supps} startDay={day} days={days}
          diary={diary} shown={shown} onShown={onShown}
          onApplyDays={(byDay) => onApplyDays?.(byDay)}
          onOpenDay={(d) => { pickDays(1); onOpenDay?.(d) }}
        />
      </div>
    )
  }

  return (
    <div>
      {daysPicker}
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
                onClick={() => { setStuck(false); setCursor((c) => Math.max(0, c - 1)) }}
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
        {/*
          * 오늘을 정한 까닭을 한 번 말한다.
          *
          * 삼킴이 어려우신 분께는 같은 권고가 열여섯 가지 중 아홉에 걸리는데,
          * 그것을 항목마다 흩어 적기만 하면 환자분은 '이유' 를 여러 번 펴 보고 나서야
          * 오늘 식단이 왜 이런지 짐작하시게 된다. 흩어 적기 전에 한 번 말한다.
          */}
        {menu.leadRule && (
          <p className="mt-2.5 rounded-lg bg-white/70 px-3 py-2 text-[11.5px] leading-relaxed text-brand-900">
            오늘은 <strong>{menu.leadRule.title}</strong> 를 가장 크게 반영했습니다
            <span className="text-brand-800/60"> — {menu.leadRule.total}가지 중 {menu.leadRule.count}가지가 이 까닭입니다.</span>
          </p>
        )}

        {stuck && (
          <div className="mt-2.5 rounded-lg border border-warn-200 bg-warn-50 px-3 py-2.5 text-[12px] leading-relaxed text-stone-700" role="status">
            <p>
              <strong>바꿀 수 있는 것이 없습니다.</strong> 다시 구성은 담으신 음식({selected.length}가지)은 그대로 두고
              빈자리만 새로 채웁니다. 지금은 하루가 담으신 것으로 채워져 있어 같은 상이 나옵니다.
            </p>
            <p className="mt-1">다른 조합을 보시려면 내 식단에서 바꾸고 싶은 음식을 빼신 뒤 다시 눌러 주세요.</p>
            <button className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700" onClick={onGoCompose}>
              내 식단으로 가기
            </button>
          </div>
        )}

        <p className="mt-2.5 text-[11px] leading-relaxed text-brand-800/70">
          {seed === 0 ? (
            <>마음에 드는 것이 없으면 <strong>다시 구성</strong>을 눌러 보세요. 같은 영양 목표로 다른 조합을 짜 드립니다.
              {selected.length > 0 && <> 담으신 {selected.length}가지는 그대로 두고 나머지만 바꿉니다.</>}</>
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

      {/*
        * 식단보다 병원이 먼저인 신호, 그리고 알레르기(2026-10-15 안전 검토).
        * 알레르기는 이름으로 거르므로 그 한계를 이 자리에서 함께 밝힌다.
        */}
      <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50/50 px-4 py-3 text-[12px] leading-relaxed text-stone-700">
        {signs.length > 0 && (
          <>
            <p className="font-bold text-danger-800">이럴 때는 식단보다 병원이 먼저입니다</p>
            <ul className="mt-1.5 space-y-1">
              {signs.map((s) => (
                <li key={s.id}><strong>{s.when}</strong> — {s.then}</li>
              ))}
            </ul>
          </>
        )}
        <p className={signs.length > 0 ? 'mt-2 border-t border-danger-100 pt-2' : ''}>
          {(patient.allergies ?? []).length > 0 ? (
            <><strong>알레르기({(patient.allergies ?? []).join('·')})</strong>가 이름에 보이는 음식은 빼고 짰습니다.
              이름에 드러나지 않는 재료는 놓칠 수 있으니, 가공식품은 포장의 알레르기 표시를 확인하세요.</>
          ) : (
            <>알레르기가 있으시면 <strong>내 정보 → 알레르기</strong>에서 골라 주세요. 그 음식을 식단에서 빼고 짭니다.</>
          )}
        </p>
      </div>

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

      {/*
        * 요리 계통을 여기서 바로 고르신다.
        *
        * 첫 설정에서 한 번 고르고 나면 바꿀 자리가 없었다. 그런데 무엇을 드실지는
        * 그날그날 다르고, 바꾸신 결과는 바로 이 화면에 나온다 — 고르는 자리도 여기 있어야 한다.
        */}
      {onPatch && (
        <div className="card mb-3 px-3.5 py-3">
          <p className="mb-1.5 text-[11px] font-semibold text-stone-500">
            드시고 싶은 요리 계통 <span className="font-normal text-stone-400">· 한식은 늘 나옵니다</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CUISINE_CHOICES.map((c) => {
              const on = (patient.cuisines ?? ['한식']).includes(c)
              return (
                <button
                  key={c}
                  onClick={() => {
                    const now = patient.cuisines ?? ['한식']
                    const next = now.includes(c) ? now.filter((x) => x !== c) : [...now, c]
                    onPatch({ cuisines: next.length > 0 ? next : ['한식'] })
                  }}
                  aria-pressed={on}
                  className={`chip border ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 bg-white text-stone-600'}`}
                >
                  {c === '동남아' ? '동남아식' : c}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Section title="끼니별 구성" desc="다섯 끼니를 모두 합한 것이 하루 목표량입니다.">
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
                              onClick={() => onApply(e.food.id, slot, e.servings)}
                            >
                              담기
                            </button>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-stone-400">
                          {portionLabel(e.food.serving.label, e.servings)} · {Math.round(per.kcal ?? 0)} kcal ·
                          단백질 {(per.protein ?? 0).toFixed(1)} g · 나트륨 {per.na === undefined ? '정보 없음' : `${Math.round(per.na)} mg`}
                        </div>
                        <HowTo lines={howToLines(evaluateFood(e.food, patient, e.servings, ruleCache))} />
                        {e.origin === 'added' && e.ruleTitle && (
                          <Why
                            contribution={e.contribution}
                            evidence={e.evidence}
                            title={e.ruleTitle}
                            refIds={e.refIds ?? []}
                          />
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

      {/*
        * 영양소 합계는 끼니 뒤에 둔다.
        *
        * 예전에는 이 넉 줄이 맨 위에 있어서, 첫 음식 이름이 두 화면 반 아래에 있었다.
        * 여쭙는 것은 "뭘 먹어요?" 인데 답이 열량·단백질·식이섬유·나트륨 막대였다.
        * 숫자는 드실 것을 보고 나서 확인하는 것이지 먼저 읽는 것이 아니다.
        */}
      <NutrientPanel states={[kcalState, proteinState, fiberState, naState]}>
        <NutrientRow label="에너지" value={kcal} unit="kcal"
          min={target.kcal[0]} max={target.kcal[1]} state={kcalState} />
        <NutrientRow label="단백질" value={protein} unit="g"
          min={target.protein[0]} max={target.protein[1]} state={proteinState}
          /*
            * 목표를 넘었는데 '적정' 이라고 적혀 있으면 앱이 틀린 것처럼 보인다.
            * 실제로는 치료 중 단백질을 넉넉히 드시는 편이 낫다는 뜻인데,
            * 그 뜻이 화면 어디에도 없었다. 넘었을 때만 한 줄 적는다.
            */
          hint={protein > target.protein[1] && !renalCare
            ? '치료 중에는 목표를 조금 넘겨 드시는 편이 낫습니다'
            : undefined} />
        <NutrientRow label="식이섬유" value={fiber} unit="g"
          min={fg.range[0]} max={fg.range[1]} state={fiberState}
          hint={fg.lowResidue ? '지금은 잔사를 줄이는 시기입니다' : undefined} />
        <NutrientRow label="나트륨" value={na} unit="mg"
          min={0} max={naLimit} limit={naLimit} state={naState} />
      </NutrientPanel>

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

/**
 * 왜 이것을 올렸는지.
 *
 * 예전에는 음식 하나가 이름·담기·분량/열량/단백질/나트륨·보충문구·근거등급·
 * 근거문장·근거건수로 여섯 줄을 썼다. 열 가지면 예순 줄이다.
 * 항암 중 피로하신 분께 그것은 읽을거리가 아니라 벽이다.
 *
 * 게다가 근거 문장은 되풀이된다 — '채소 중심 식사는…' 이 배·단감·밤에
 * 나란히 세 번 적혀 있었다. 세 번 읽을 문장은 아니다.
 *
 * 그래서 한 줄로 접는다. **근거를 없애는 것이 아니라 원하실 때 펴시게 두는 것이다** —
 * 무엇을 채우려고 올렸는지(보충 문구)와 근거 등급은 접어도 늘 보인다.
 */
function Why({
  contribution, evidence, title, refIds
}: {
  contribution?: string
  evidence?: Parameters<typeof EvidenceBadge>[0]['level']
  title: string
  refIds: string[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1.5 rounded-lg bg-brand-50 px-2.5 py-2">
      {/*
        * 줄 전체를 단추로 감싸지 않는다.
        * 근거 등급 딱지가 이미 단추(눌러서 뜻을 본다)라, 감싸면 단추 안에 단추가 되어
        * HTML 이 어긋나고 한 번 눌렀을 때 두 가지가 함께 일어난다.
        */}
      <div className="flex items-center gap-1.5">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {contribution && <span className="chip bg-brand-600 text-white">{contribution}</span>}
          {evidence && <EvidenceBadge level={evidence} />}
        </span>
        <button
          type="button"
          /*
            * 누를 자리를 44 px 로 잡는다. 글씨는 작아도 손가락이 닿는 넓이는 따로다 —
            * 이 앱을 쓰시는 분 중에는 항암 중 손이 떨리시는 분이 있다.
            * 바깥 여백을 음수로 당겨 줄 높이는 늘리지 않는다.
            */
          className="-my-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center px-1 text-[11px] font-medium text-brand-700/80"
          aria-expanded={open}
          aria-label={open ? '이유 접기' : '이 음식을 올린 이유 보기'}
          onClick={() => setOpen((v) => !v)}
        >
          {/*
            * '왜요?' 라고 적었더니 앱이 되묻는 것처럼 읽혔다.
            * 단추에는 물음이 아니라 무엇이 열리는지를 적는다.
            * '근거' 는 바로 옆의 근거 등급·근거 N건(출처)과 겹치므로 '이유' 로 둔다.
            */}
          {open ? '접기' : '이유'}
        </button>
      </div>
      {open && (
        <>
          <p className="mt-1.5 text-[11px] leading-relaxed text-brand-900">{title}</p>
          <Refs ids={refIds} />
        </>
      )}
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
