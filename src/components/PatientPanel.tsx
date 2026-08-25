import type { PatientContext, PatientCondition, Phase, CancerSubtype } from '../data/types'
import { SUBTYPE_OPTIONS } from '../data/types'
import { CANCERS } from '../data/cancers'
import { MEDICATIONS } from '../data/interactions'
import { nutritionRisk, personalTarget } from '../engine/nutrition'
import { CANCER_BY_ID } from '../data/cancers'
import { Section, Stat } from './ui'

const PHASES: { id: Phase; label: string; desc: string }[] = [
  { id: 'during_rt', label: '방사선치료 중', desc: '점막염·설사 등 급성 부작용 시기' },
  { id: 'during_chemo', label: '항암치료 중', desc: '오심·미각변화·골수억제 시기' },
  { id: 'neutropenia', label: '호중구감소증', desc: '식품 안전 규칙이 강화됩니다' },
  { id: 'post_op', label: '수술 후 회복기', desc: '식이 단계 상향, 소량 분할식' },
  { id: 'survivorship', label: '치료 종료 후', desc: '재발 예방과 체중 관리 중심' }
]

const CONDITIONS: PatientCondition[] = [
  '연하곤란', '구강점막염', '설사', '변비', '오심·구토', '식욕부진', '체중감소', '체중증가',
  '호중구감소증', '위절제후', '장루보유', '복수', '간성뇌증위험', '신기능저하',
  '당뇨', '고혈압', '와파린복용'
]

export function PatientPanel({
  patient,
  onChange
}: {
  patient: PatientContext
  onChange: (patch: Partial<PatientContext>) => void
}) {
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const risk = nutritionRisk(patient)

  const toggleCondition = (c: PatientCondition) =>
    onChange({
      conditions: patient.conditions.includes(c)
        ? patient.conditions.filter((x) => x !== c)
        : [...patient.conditions, c]
    })

  /*
   * 세부 변수는 서로 배타적인 것이 섞여 있다 — 위 전절제와 부분절제를 동시에 고를 수는 없고,
   * 삼중음성은 호르몬 수용체 양성·HER2 양성과 같이 설 수 없다.
   * 고르실 때 앞뒤가 맞지 않는 조합이 남지 않도록 여기서 정리한다.
   */
  const EXCLUSIVE: CancerSubtype[][] = [
    ['위전절제', '위부분절제'],
    ['삼중음성', '호르몬수용체양성'],
    ['삼중음성', 'HER2양성']
  ]
  const toggleSubtype = (t: CancerSubtype) => {
    const mine = patient.subtypes ?? []
    if (mine.includes(t)) {
      onChange({ subtypes: mine.filter((x) => x !== t) })
      return
    }
    const conflicting = new Set(
      EXCLUSIVE.filter((pair) => pair.includes(t)).flatMap((pair) => pair.filter((x) => x !== t))
    )
    onChange({ subtypes: [...mine.filter((x) => !conflicting.has(x)), t] })
  }

  const subtypeOptions = SUBTYPE_OPTIONS[patient.cancer]

  const toggleMed = (id: string) =>
    onChange({
      medications: patient.medications.includes(id)
        ? patient.medications.filter((x) => x !== id)
        : [...patient.medications, id]
    })

  return (
    <div>
      <Section title="암종" desc="선택한 암종에 따라 권고와 경고가 완전히 달라집니다.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CANCERS.map((c) => (
            <button
              key={c.id}
              // 암종을 바꾸면 이전 암종의 세부 사항은 뜻을 잃는다 — 같이 비운다
              onClick={() => onChange({ cancer: c.id, subtypes: [] })}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                patient.cancer === c.id
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </Section>

      {subtypeOptions && (
        <Section
          title={`${profile.name}의 세부 사항`}
          desc="아시는 것만 고르셔도 됩니다. 고르지 않으면 해당 내용을 모두 보여 드립니다."
        >
          <div className="space-y-2">
            {subtypeOptions.map((o) => {
              const on = (patient.subtypes ?? []).includes(o.id)
              return (
                <button
                  key={o.id}
                  onClick={() => toggleSubtype(o.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    on ? 'border-brand-500 bg-brand-50' : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                      on ? 'border-brand-500 bg-brand-500' : 'border-stone-300 bg-white'
                    }`}
                  />
                  <span>
                    <span className={`block text-sm font-medium ${on ? 'text-brand-800' : 'text-stone-700'}`}>
                      {o.label}
                    </span>
                    <span className="block text-xs text-stone-500">{o.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            받으시는 치료가 달라지면 챙길 것도 달라집니다. 예를 들어 아로마타제 억제제는 호르몬 수용체
            양성에만 쓰기 때문에, 삼중음성이라고 알려 주시면 골밀도 관련 안내는 뜨지 않습니다.
          </p>
        </Section>
      )}

      <Section title="치료 시기" desc="같은 음식도 시기에 따라 권고가 반대로 바뀝니다.">
        <div className="space-y-2">
          {PHASES.map((p) => (
            <button
              key={p.id}
              onClick={() => onChange({ phase: p.id })}
              className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                patient.phase === p.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                  patient.phase === p.id ? 'border-brand-600 bg-brand-600' : 'border-stone-300'
                }`}
              />
              <span>
                <span className="block text-sm font-medium text-stone-900">{p.label}</span>
                <span className="block text-xs text-stone-500">{p.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="신체 정보" desc="열량·단백질 목표는 체중을 기준으로 계산됩니다.">
        <div className="card grid grid-cols-2 gap-3 p-3.5 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-4">
            <label className="label">어떻게 불러 드릴까요</label>
            <input
              className="input"
              placeholder="이름 또는 별칭"
              value={patient.name ?? ''}
              onChange={(e) => onChange({ name: e.target.value.trim() || undefined })}
              maxLength={20}
            />
          </div>
          <div>
            <label className="label">체중 (kg)</label>
            <input
              type="number" inputMode="decimal" className="input"
              value={patient.weightKg}
              onChange={(e) => onChange({ weightKg: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">신장 (cm)</label>
            <input
              type="number" inputMode="decimal" className="input"
              value={patient.heightCm}
              onChange={(e) => onChange({ heightCm: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">나이</label>
            <input
              type="number" inputMode="numeric" className="input"
              value={patient.age}
              onChange={(e) => onChange({ age: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">성별</label>
            <div className="flex gap-1.5">
              {(['M', 'F'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ sex: s })}
                  className={`flex-1 rounded-xl border px-2 py-2 text-sm font-medium ${
                    patient.sex === s
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-stone-300 bg-white text-stone-600'
                  }`}
                >
                  {s === 'M' ? '남' : '여'}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className="label">최근 6개월 체중 감소율 (%)</label>
            <input
              type="number" inputMode="decimal" className="input"
              value={patient.weightLossPct ?? 0}
              onChange={(e) => onChange({ weightLossPct: Number(e.target.value) || 0 })}
            />
            <p className="mt-1 text-[11px] text-stone-400">
              5 % 이상이면 영양 개입 기준에 해당합니다. 예: 60 kg → 57 kg 이면 5 %
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="BMI" value={String(risk.bmi)} hint={risk.bmiLabel}
            tone={risk.risk === 'high' ? 'bad' : risk.risk === 'moderate' ? 'warn' : 'good'} />
          <Stat label="하루 열량 목표" value={`${target.kcal[0]}~${target.kcal[1]}`} unit="kcal" />
          <Stat label="하루 단백질 목표" value={`${target.protein[0]}~${target.protein[1]}`} unit="g" />
        </div>

        <div
          className={`mt-3 rounded-xl px-3.5 py-3 text-xs leading-relaxed ${
            risk.risk === 'high'
              ? 'bg-danger-50 text-danger-700'
              : risk.risk === 'moderate'
                ? 'bg-warn-50 text-warn-700'
                : 'bg-brand-50 text-brand-800'
          }`}
        >
          {risk.message}
        </div>
      </Section>

      <Section title="지금 겪고 있는 증상" desc="증상 규칙이 암종 규칙보다 실제 식단을 더 크게 좌우하는 경우가 많습니다.">
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              onClick={() => toggleCondition(c)}
              className={`chip border transition-colors ${
                patient.conditions.includes(c)
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Section>

      <Section title="복용 중인 약" desc="선택한 약제와 관련된 식품·영양제 상호작용만 표시됩니다.">
        <div className="flex flex-wrap gap-1.5">
          {MEDICATIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleMed(m.id)}
              title={m.aliases.join(', ')}
              className={`chip border transition-colors ${
                patient.medications.includes(m.id)
                  ? 'border-accent-600 bg-accent-600 text-white'
                  : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="바코드 스캔"
        desc="공공 바코드 자료는 국내 제품을 다 담지 못합니다. 자주 빗나가 성가시면 꺼 두셔도 됩니다."
      >
        <button
          onClick={() => onChange({ useBarcode: patient.useBarcode === false })}
          className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-left"
        >
          <span className="min-w-0 pr-3">
            <span className="block text-sm font-medium text-stone-900">
              바코드로 찾기 {patient.useBarcode === false ? '꺼짐' : '켜짐'}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500">
              {patient.useBarcode === false
                ? '찾기·영양제 화면에서 바코드 단추가 보이지 않습니다. 이름으로 찾으시면 됩니다.'
                : '살아 있는 등록 148,155건에서 찾습니다. 못 찾으면 번호를 직접 넣거나 이름으로 찾아 이어 두실 수 있습니다.'}
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              patient.useBarcode === false ? 'bg-stone-300' : 'bg-brand-600'
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                patient.useBarcode === false ? 'left-0.5' : 'left-[22px]'
              }`}
            />
          </span>
        </button>
      </Section>
    </div>
  )
}
