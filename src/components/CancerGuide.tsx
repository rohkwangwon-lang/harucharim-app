import type { PatientContext, Phase } from '../data/types'
import { CANCER_BY_ID } from '../data/cancers'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, LevelBadge, Section } from './ui'

const PHASE_LABEL: Record<Exclude<Phase, 'all'>, string> = {
  during_rt: '방사선치료 중',
  during_chemo: '항암치료 중',
  neutropenia: '호중구감소증',
  post_op: '수술 후 회복기',
  survivorship: '치료 종료 후'
}

export function CancerGuide({ patient }: { patient: PatientContext }) {
  const p = CANCER_BY_ID[patient.cancer]

  return (
    <div>
      <Section title={p.name}>
        <div className="card p-4">
          <p className="text-sm leading-relaxed text-stone-700">{p.summary}</p>
        </div>
      </Section>

      <Section title="이 암종에서 특히 문제가 되는 것">
        <ul className="card divide-y divide-stone-100">
          {p.keyIssues.map((k, i) => (
            <li key={i} className="flex gap-2.5 px-3.5 py-2.5 text-sm text-stone-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {k}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="영양 목표" desc="ESPEN 종양환자 권고를 기준으로 한 값입니다.">
        <div className="card divide-y divide-stone-100 text-sm">
          <Row label="에너지" value={`체중 1 kg 당 ${p.target.kcalPerKg[0]}~${p.target.kcalPerKg[1]} kcal`} />
          <Row label="단백질" value={`체중 1 kg 당 ${p.target.proteinPerKg[0]}~${p.target.proteinPerKg[1]} g`} />
          {p.target.naLimit && <Row label="나트륨" value={`하루 ${p.target.naLimit.toLocaleString()} mg 이하`} />}
          {p.target.fiberTarget && (
            <Row label="식이섬유" value={`하루 ${p.target.fiberTarget[0]}~${p.target.fiberTarget[1]} g`} />
          )}
          {p.target.fluidPerKg && <Row label="수분" value={`체중 1 kg 당 ${p.target.fluidPerKg} mL`} />}
        </div>
        {p.target.notes.length > 0 && (
          <ul className="mt-2 space-y-1 px-1">
            {p.target.notes.map((n, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-stone-500">· {n}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="권고 목록" desc={`${p.rules.length}개 항목 — 현재 선택하신 시기와 무관하게 전부 보여 드립니다.`}>
        <div className="space-y-2">
          {[...p.rules]
            .sort((a, b) => {
              const rank = { avoid: 0, caution: 1, prefer: 2, info: 3 } as const
              return rank[a.level] - rank[b.level]
            })
            .map((r) => (
              <div key={r.id} className="card p-3.5">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <LevelBadge level={r.level} />
                  <EvidenceBadge level={r.evidence} />
                  {r.phases && !r.phases.includes('all') && (
                    <span className="chip bg-stone-100 text-stone-500">
                      {r.phases.map((ph) => (ph === 'all' ? '' : PHASE_LABEL[ph])).filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-stone-900">{r.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">{r.reason}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-stone-400">
                    근거 {r.refIds.length}건
                  </summary>
                  <ul className="mt-1.5 space-y-1">
                    {r.refIds.map((id) => {
                      const ref = REF_BY_ID[id]
                      if (!ref) return null
                      return (
                        <li key={id} className="text-[11px] leading-relaxed text-stone-500">
                          {ref.url ? (
                            <a href={ref.url} target="_blank" rel="noreferrer" className="underline decoration-stone-300">
                              {ref.citation}
                            </a>
                          ) : ref.citation}
                        </li>
                      )
                    })}
                  </ul>
                </details>
              </div>
            ))}
        </div>
      </Section>

      <Section title="시기별 실무 지침">
        <div className="space-y-2">
          {(Object.entries(p.phaseNotes) as [Exclude<Phase, 'all'>, string][]).map(([ph, note]) => (
            <div key={ph} className={`card p-3.5 ${patient.phase === ph ? 'border-brand-300 bg-brand-50/40' : ''}`}>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-sm font-bold text-stone-800">{PHASE_LABEL[ph]}</span>
                {patient.phase === ph && <span className="chip bg-brand-500 text-white">현재</span>}
              </div>
              <p className="text-xs leading-relaxed text-stone-600">{note}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-900">{value}</span>
    </div>
  )
}
