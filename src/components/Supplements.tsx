import { useMemo, useState } from 'react'
import type { PatientContext, SupplementCategory } from '../data/types'
import { SUPPLEMENTS } from '../data/supplements'
import { activeInteractions, activeRules, evaluateSupplement } from '../engine/rules'
import { NUTRIENT_META_BY_KEY, fmt } from '../engine/nutrition'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, LevelBadge, LevelDot, Section } from './ui'
import { adviseSupplements, type AdviceLevel } from '../engine/supplementAdvice'
import { nutritionRisk } from '../engine/nutrition'

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

  const advice = useMemo(() => adviseSupplements(patient), [patient])
  const risk = nutritionRisk(patient)
  const rec = advice.filter((a) => a.level === 'recommend')
  const con = advice.filter((a) => a.level === 'consider')
  const avo = advice.filter((a) => a.level === 'avoid')

  return (
    <div>
      <Section
        title="선생님께 맞춘 추천"
        desc={`${CANCER_LABEL[patient.cancer] ?? ''} · BMI ${risk.bmi} · 치료 이력과 증상을 함께 반영한 결과입니다.`}
      >
        {advice.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            현재 입력하신 정보로는 특별히 권하거나 피할 영양제가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {rec.length > 0 && <AdviceGroup title="챙기시면 좋습니다" level="recommend" items={rec} />}
            {avo.length > 0 && <AdviceGroup title="피하시는 편이 좋습니다" level="avoid" items={avo} />}
            {con.length > 0 && <AdviceGroup title="상황에 따라 고려" level="consider" items={con} />}
          </div>
        )}
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-slate-400">
          제품이 아니라 <strong>분류</strong> 단위로 권합니다. 어떤 브랜드를 사야 한다는 뜻이 아니며,
          이미 식사로 충분한 성분이라면 보충제를 더할 이유가 없습니다.
        </p>
      </Section>

      <Section
        title="전체 영양제 목록"
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

const CANCER_LABEL: Record<string, string> = {
  breast: '유방암', prostate: '전립선암', lung: '폐암', stomach: '위암', colorectal: '대장암',
  liver: '간암', pancreas: '췌장암', esophagus: '식도암', headneck: '두경부암', gyn: '부인암'
}

const ADVICE_STYLE: Record<AdviceLevel, { cls: string; chip: string; label: string }> = {
  recommend: { cls: 'border-brand-200 bg-brand-50/40', chip: 'bg-brand-600 text-white', label: '권장' },
  consider: { cls: 'border-slate-200', chip: 'bg-slate-500 text-white', label: '고려' },
  avoid: { cls: 'border-danger-200 bg-danger-50/40', chip: 'bg-danger-600 text-white', label: '피하세요' }
}

function AdviceGroup({
  title, level, items
}: {
  title: string
  level: AdviceLevel
  items: ReturnType<typeof adviseSupplements>
}) {
  const st = ADVICE_STYLE[level]
  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-2">
        {items.map((a, i) => (
          <div key={a.category + i} className={`card p-3.5 ${st.cls}`}>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`chip ${st.chip}`}>{st.label}</span>
              <span className="chip bg-white text-slate-600 ring-1 ring-slate-200">{a.category}</span>
              <EvidenceBadge level={a.evidence} />
            </div>
            <p className="text-sm font-semibold text-slate-900">{a.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.reason}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              이 추천이 나온 이유: <span className="font-medium text-slate-700">{a.trigger}</span>
            </p>
            {a.products.length > 0 && level !== 'avoid' && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.products.slice(0, 4).map((p) => (
                  <span key={p.id} className="chip bg-white text-slate-500 ring-1 ring-slate-200">{p.name}</span>
                ))}
              </div>
            )}
            <Cites ids={a.refIds} />
          </div>
        ))}
      </div>
    </div>
  )
}
