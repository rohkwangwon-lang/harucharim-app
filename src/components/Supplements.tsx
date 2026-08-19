import { useMemo, useState } from 'react'
import type { PatientContext, SupplementCategory } from '../data/types'
import { SUPPLEMENTS } from '../data/supplements'
import { activeInteractions, activeRules, evaluateSupplement } from '../engine/rules'
import { NUTRIENT_META_BY_KEY, fmt } from '../engine/nutrition'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, LevelBadge, LevelDot, Section } from './ui'

const CATEGORIES: (SupplementCategory | '전체')[] = [
  '전체', '종합비타민', '비타민B군', '비타민C', '비타민D', '오메가3',
  '칼슘·마그네슘', '철분', '아연·미네랄', '유산균', '단백질보충',
  '경장영양(균형영양식)', '간건강', '홍삼·인삼', '항산화·기타', '식이섬유'
]

export function Supplements({
  patient,
  taking,
  onToggle
}: {
  patient: PatientContext
  taking: string[]
  onToggle: (id: string) => void
}) {
  const [cat, setCat] = useState<SupplementCategory | '전체'>('전체')
  const [open, setOpen] = useState<string | null>(null)

  const cached = useMemo(
    () => ({ rules: activeRules(patient), interactions: activeInteractions(patient) }),
    [patient]
  )

  const list = useMemo(
    () =>
      SUPPLEMENTS.filter((s) => cat === '전체' || s.category === cat).map((s) => ({
        s,
        v: evaluateSupplement(s, patient, cached)
      })),
    [cat, patient, cached]
  )

  return (
    <div>
      <Section
        title="영양제"
        desc="복용 중인 것을 선택하면 영양소 합계에 더해지고, 이 암종·약제와의 문제도 함께 검사합니다."
      >
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`chip shrink-0 border ${
                cat === c ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="card divide-y divide-slate-100 overflow-hidden">
          {list.map(({ s, v }) => {
            const isOpen = open === s.id
            const isTaking = taking.includes(s.id)
            return (
              <li key={s.id}>
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <LevelDot level={v.level} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-slate-900">{s.name}</span>
                      {v.level && v.level !== 'info' && <LevelBadge level={v.level} />}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {s.brand !== '-' ? `${s.brand} · ` : ''}{s.category} · {s.dosageLabel}
                    </div>
                  </button>
                  <button
                    onClick={() => onToggle(s.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      isTaking ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isTaking ? '복용 중' : '추가'}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-3.5 py-3">
                    {s.note && <p className="mb-3 text-xs leading-relaxed text-slate-600">{s.note}</p>}

                    {Object.keys(s.perDay).length > 0 && (
                      <>
                        <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          1일 섭취량 기준 영양성분
                        </h5>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {Object.entries(s.perDay).map(([k, val]) => {
                            const m = NUTRIENT_META_BY_KEY[k as keyof typeof NUTRIENT_META_BY_KEY]
                            if (!m || typeof val !== 'number') return null
                            return (
                              <span key={k} className="chip bg-white text-slate-600 ring-1 ring-slate-200">
                                {m.label} {fmt(val, m.digits)} {m.unit}
                              </span>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {s.actives && s.actives.length > 0 && (
                      <>
                        <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          기능성 원료
                        </h5>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {s.actives.map((a) => (
                            <span key={a.name} className="chip bg-white text-slate-600 ring-1 ring-slate-200">
                              {a.name} {a.amount}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {(v.hits.length > 0 || v.interactions.length > 0) && (
                      <div className="space-y-2">
                        {v.hits.map((h) => (
                          <div key={h.rule.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <LevelBadge level={h.rule.level} />
                              <EvidenceBadge level={h.rule.evidence} />
                            </div>
                            <p className="text-xs font-semibold text-slate-900">{h.rule.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{h.rule.reason}</p>
                            <Cites ids={h.rule.refIds} />
                          </div>
                        ))}
                        {v.interactions.map((h) => (
                          <div key={h.interaction.id} className="rounded-lg border border-sky-200 bg-white p-2.5">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <LevelBadge level={h.interaction.level} />
                              <span className="chip bg-sky-100 text-sky-700">약물 상호작용</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900">{h.interaction.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{h.interaction.reason}</p>
                            <Cites ids={h.interaction.refIds} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <p className="mt-3 px-1 text-[11px] leading-relaxed text-slate-400">
          함량은 제품의 1일 섭취량 표시값을 기준으로 정리했습니다. 제조사가 처방을 바꾸는 일이 잦으므로,
          실제로는 가지고 계신 제품의 라벨을 확인하는 것이 정확합니다.
        </p>
      </Section>
    </div>
  )
}

function Cites({ ids }: { ids: string[] }) {
  const refs = ids.map((id) => REF_BY_ID[id]).filter(Boolean)
  if (refs.length === 0) return null
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-[10px] font-medium text-slate-400">근거 {refs.length}건</summary>
      <ul className="mt-1 space-y-0.5">
        {refs.map((r) => (
          <li key={r.id} className="text-[10px] leading-relaxed text-slate-500">{r.citation}</li>
        ))}
      </ul>
    </details>
  )
}
