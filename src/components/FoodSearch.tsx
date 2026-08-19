import { useMemo, useState } from 'react'
import type { Food, FoodGroup, PatientContext } from '../data/types'
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
  onAdd: (foodId: string, servings: number) => void
  selectedIds: Set<string>
}) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<FoodGroup | '전체'>('전체')
  const [detail, setDetail] = useState<Food | null>(null)

  const cached = useMemo(
    () => ({ rules: activeRules(patient), interactions: activeInteractions(patient) }),
    [patient]
  )

  const results = useMemo(() => {
    const list = FOODS.filter((f) => (group === '전체' || f.group === group) && matches(f, q.trim()))
    // 검색어가 없으면 이 암종에서 권장되는 것을 먼저 보여준다
    return list
      .map((f) => ({ food: f, verdict: evaluateFood(f, patient, 1, cached) }))
      .sort((a, b) => {
        if (q.trim()) return 0
        const rank = (l: string | null) => (l === 'prefer' ? 0 : l === null ? 1 : l === 'info' ? 2 : l === 'caution' ? 3 : 4)
        return rank(a.verdict.level) - rank(b.verdict.level)
      })
      .slice(0, 200)
  }, [q, group, patient, cached])

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-slate-50/95 px-4 pb-2 pt-1 backdrop-blur">
        <input
          className="input"
          placeholder="음식 이름으로 검색 — 예: 된장찌개, 두부, 삼겹살"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
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
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
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
          onAdd={(s) => {
            onAdd(detail.id, s)
            setDetail(null)
          }}
        />
      )}
    </div>
  )
}
