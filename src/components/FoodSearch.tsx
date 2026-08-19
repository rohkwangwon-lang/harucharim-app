import { useMemo, useState } from 'react'
import type { Cuisine, Food, FoodGroup, MealSlot, PatientContext } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { FOODS } from '../data/foods'
import { activeInteractions, activeRules, evaluateFood } from '../engine/rules'
import { foodContribution } from '../engine/nutrition'
import { FoodDetail } from './FoodDetail'
import { LevelDot, Empty } from './ui'

const GROUPS: (FoodGroup | '전체')[] = [
  '전체', '밥·면·죽 요리', '국·탕·찌개', '반찬·조림·볶음', '육류', '어패류',
  '가금류·난류', '채소', '과일', '두류·대두가공', '곡류·전분', '우유·유제품',
  '해조·버섯', '견과·종실', '외식·프랜차이즈', '음료', '간식·디저트',
  '가공식품', '유지·당류', '경장영양·환자식'
]

function matches(food: Food, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  if (food.name.toLowerCase().includes(needle)) return true
  if (food.aliases?.some((a) => a.toLowerCase().includes(needle))) return true
  if (food.group.includes(q)) return true
  if (food.tags.some((t) => t.includes(q))) return true
  return false
}

export function FoodSearch({
  patient,
  onAdd,
  selectedIds
}: {
  patient: PatientContext
  onAdd: (foodId: string, servings: number, meal: MealSlot) => void
  selectedIds: Set<string>
}) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<FoodGroup | '전체'>('전체')
  const [detail, setDetail] = useState<Food | null>(null)
  /** 담을 끼니 — 여기서 미리 정해 두면 매번 고르지 않아도 된다 */
  const [meal, setMeal] = useState<MealSlot>('점심')
  /** 식재료만 보기 — 조리된 메뉴가 아니라 재료 단위로 짜고 싶을 때 */
  const [onlyIngredient, setOnlyIngredient] = useState(false)
  const [cuisine, setCuisine] = useState<Cuisine | '전체'>('전체')

  const cached = useMemo(
    () => ({ rules: activeRules(patient), interactions: activeInteractions(patient) }),
    [patient]
  )

  const results = useMemo(() => {
    const list = FOODS.filter(
      (f) =>
        (group === '전체' || f.group === group) &&
        (!onlyIngredient || f.form === 'ingredient') &&
        (cuisine === '전체' || (f.cuisine ?? '한식') === cuisine || f.cuisine === '무관') &&
        matches(f, q.trim())
    )
    // 임상 규칙 평가는 한 건당 비용이 있다. 1만 8천 건 전부에 돌리면 입력이 버벅이므로
    // 먼저 잘라 낸 다음 평가한다. 자를 때는 손으로 검토한 항목을 앞세운다.
    const needle = q.trim().toLowerCase()

    /**
     * 검색 순위.
     * 식품군 이름도 검색 대상이라 "우유"로 찾으면 유제품이 통째로 걸린다.
     * 그래서 이름이 맞은 것을 먼저, 그중에서도 앞쪽에서 맞은 것을 먼저 보여 준다.
     */
    const score = (f: Food): number => {
      if (!needle) return f.auto ? 1 : 0
      const name = f.name.toLowerCase()
      const alias = f.aliases?.some((a) => a.toLowerCase().includes(needle)) ?? false
      let s: number
      if (name === needle) s = 0
      else if (name.startsWith(needle)) s = 1
      else if (name.includes(needle)) s = 2
      else if (alias) s = 3
      else s = 6                       // 식품군·태그만 맞은 경우
      if (f.auto) s += 0.5             // 같은 조건이면 손으로 검토한 항목을 앞에
      return s
    }

    const ordered = list.sort((a, b) => {
      const d = score(a) - score(b)
      if (d !== 0) return d
      return a.name.length - b.name.length
    })

    const page = ordered.slice(0, 120)
    const scored = page.map((f) => ({ food: f, verdict: evaluateFood(f, patient, 1, cached) }))

    // 검색어가 없을 때만 권장 우선으로 다시 세운다
    if (!q.trim()) {
      const rank = (l: string | null) =>
        l === 'prefer' ? 0 : l === null ? 1 : l === 'info' ? 2 : l === 'caution' ? 3 : 4
      scored.sort((a, b) => rank(a.verdict.level) - rank(b.verdict.level))
    }
    return scored
  }, [q, group, onlyIngredient, cuisine, patient, cached])

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-slate-50/95 px-4 pb-2 pt-1 backdrop-blur">
        <input
          className="input"
          placeholder="음식 이름으로 검색 — 예: 된장찌개, 두부, 삼겹살"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {/* 담을 끼니를 먼저 정해 두면 음식을 고를 때마다 다시 묻지 않는다 */}
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium text-slate-500">담을 끼니</span>
          <div className="flex flex-1 gap-1">
            {MEAL_SLOTS.map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`flex-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
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

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setOnlyIngredient((v) => !v)}
            className={`chip shrink-0 border ${
              onlyIngredient
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            식재료만
          </button>
          {(['전체', '한식', '양식', '중식', '일식', '동남아'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`chip shrink-0 border ${
                cuisine === c
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`chip shrink-0 border ${
                group === g
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <Empty>검색 결과가 없습니다. 다른 이름으로 찾아보세요.</Empty>
      ) : (
        <ul className="card divide-y divide-slate-100 overflow-hidden">
          {results.map(({ food, verdict }) => {
            const per = foodContribution(food, 1)
            return (
              <li key={food.id}>
                <button
                  onClick={() => setDetail(food)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50"
                >
                  <LevelDot level={verdict.level} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-slate-900">{food.name}</span>
                      {selectedIds.has(food.id) && (
                        <span className="chip shrink-0 bg-brand-100 text-brand-700">담김</span>
                      )}
                      {food.auto && (
                        <span
                          className="chip shrink-0 bg-slate-100 text-slate-500"
                          title="식약처 공공데이터에서 자동으로 들여온 항목입니다. 성분값은 정확하지만 임상 태그는 성분으로 판정 가능한 것만 붙어 있습니다."
                        >
                          식약처
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {food.maker ? `${food.maker} · ` : ''}
                      {food.serving.label} · {Math.round(per.kcal ?? 0)} kcal · 단백질{' '}
                      {(per.protein ?? 0).toFixed(1)} g · 나트륨 {Math.round(per.na ?? 0)} mg
                    </div>
                  </div>
                  <span className="shrink-0 text-slate-300">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {detail && (
        <FoodDetail
          food={detail}
          patient={patient}
          onClose={() => setDetail(null)}
          defaultMeal={meal}
          onAdd={(s, m) => {
            onAdd(detail.id, s, m)
            setDetail(null)
          }}
        />
      )}
    </div>
  )
}
