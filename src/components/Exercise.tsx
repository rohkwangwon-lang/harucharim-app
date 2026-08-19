import type { PatientContext } from '../data/types'
import {
  BASE_EXERCISE, CONDITION_EXERCISE_NOTES, EXERCISE_BY_CANCER,
  HISTORY_EXERCISE_NOTES, STOP_SIGNS, type ExerciseItem
} from '../data/exercise'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, Section } from './ui'

const KIND_STYLE: Record<ExerciseItem['kind'], string> = {
  유산소: 'bg-sky-100 text-sky-800',
  저항: 'bg-violet-100 text-violet-800',
  '유연성·균형': 'bg-amber-100 text-amber-800',
  재활: 'bg-emerald-100 text-emerald-800'
}

export function Exercise({ patient }: { patient: PatientContext }) {
  const plan = EXERCISE_BY_CANCER[patient.cancer]
  const conditionNotes = patient.conditions
    .map((c) => ({ c, note: CONDITION_EXERCISE_NOTES[c] }))
    .filter((x): x is { c: typeof patient.conditions[number]; note: string } => !!x.note)
  const historyNotes = (patient.history ?? [])
    .map((h) => ({ h, note: HISTORY_EXERCISE_NOTES[h] }))
    .filter((x): x is { h: NonNullable<typeof patient.history>[number]; note: string } => !!x.note)

  return (
    <div>
      <Section title="운동이 이 암종에서 갖는 의미">
        <div className="card p-4">
          <p className="text-sm leading-relaxed text-slate-700">{plan.summary}</p>
        </div>
      </Section>

      <Section
        title={`${plan.items.length > 0 ? '이 암종에 특히 권하는 운동' : '권장 운동'}`}
        desc="기준선은 ACSM 국제 원탁회의(2019)와 ASCO 2022 권고입니다. 여기에 암종별로 달라지는 부분을 더했습니다."
      >
        <div className="space-y-2">
          {plan.items.map((it) => <ExerciseCard key={it.name} item={it} highlight />)}
        </div>
      </Section>

      <Section
        title="모든 암종 공통"
        desc="유산소 주 150분, 저항운동 주 2회가 기본 골격입니다."
      >
        <div className="space-y-2">
          {BASE_EXERCISE.map((it) => <ExerciseCard key={it.name} item={it} />)}
        </div>
      </Section>

      {(conditionNotes.length > 0 || historyNotes.length > 0) && (
        <Section title="선생님 상태에 맞춘 조정" desc="입력하신 증상과 치료 이력에 따라 덧붙는 지침입니다.">
          <div className="space-y-2">
            {conditionNotes.map(({ c, note }) => (
              <div key={c} className="card border-brand-200 bg-brand-50/40 p-3.5">
                <span className="chip bg-brand-500 text-white">{c}</span>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">{note}</p>
              </div>
            ))}
            {historyNotes.map(({ h, note }) => (
              <div key={h} className="card border-sky-200 bg-sky-50/40 p-3.5">
                <span className="chip bg-sky-500 text-white">{h}</span>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">{note}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`${plan.cautions.length}가지 주의사항`} desc="이 암종에서 특히 조심할 것들입니다.">
        <ul className="card divide-y divide-slate-100">
          {plan.cautions.map((c, i) => (
            <li key={i} className="flex gap-2.5 px-3.5 py-2.5 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn-500" />
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="이럴 때는 멈추세요" desc="안전이 먼저입니다. 아래 상황에서는 운동을 미루고 확인부터 받으세요.">
        <ul className="card divide-y divide-slate-100 border-danger-200">
          {STOP_SIGNS.map((s, i) => (
            <li key={i} className="flex gap-2.5 px-3.5 py-2.5 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-500" />
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-slate-400">
        여기 적힌 운동량은 일반적인 권고입니다. 심장·폐 질환이 있거나 골전이가 있는 경우에는
        시작 전에 담당 의료진과 상의하세요.
      </p>
    </div>
  )
}

function ExerciseCard({ item, highlight }: { item: ExerciseItem; highlight?: boolean }) {
  const refs = item.refIds.map((id) => REF_BY_ID[id]).filter(Boolean)
  return (
    <div className={`card p-3.5 ${highlight ? 'border-brand-200' : ''}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className={`chip ${KIND_STYLE[item.kind]}`}>{item.kind}</span>
        <EvidenceBadge level={item.evidence} />
      </div>
      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
      <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium tabular-nums text-slate-700">
        {item.dose}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.why}</p>
      {refs.length > 0 && (
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
      )}
    </div>
  )
}
