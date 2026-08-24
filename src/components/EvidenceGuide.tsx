import { useMemo } from 'react'
import { COMMON_RULES } from '../data/commonRules'
import { CONDITION_RULES } from '../data/conditionRules'
import { CANCERS } from '../data/cancers'
import { REF_BY_ID } from '../data/references'
import { EVIDENCE_INFO, Section } from './ui'
import type { EvidenceLevel, NutritionRule, PatientContext } from '../data/types'

const ORDER: EvidenceLevel[] = ['A', 'B', 'C', 'G']

/**
 * 근거 등급 안내.
 *
 * 이 앱은 판정마다 'A·B·C·G' 를 붙여 놓고 그 뜻을 어디에도 적어 두지 않았다.
 * 마우스를 올리면 뜨는 풍선말이 있었지만 휴대폰에서는 보이지 않는다.
 *
 * 등급을 설명할 때 정의만 늘어놓으면 읽히지 않는다.
 * "그래서 이 말을 얼마나 믿으면 되는가" 와, 이 앱에 실제로 실려 있는 문장을
 * 함께 보여 준다. 예시가 있어야 등급이 손에 잡힌다.
 */
export function EvidenceGuide({ patient }: { patient: PatientContext }) {
  const rules = useMemo(() => {
    const profile = CANCERS.find((c) => c.id === patient.cancer)
    return [
      ...COMMON_RULES,
      ...Object.values(CONDITION_RULES).flat(),
      ...(profile?.rules ?? [])
    ] as NutritionRule[]
  }, [patient.cancer])

  const byLevel = useMemo(() => {
    const m = new Map<EvidenceLevel, NutritionRule[]>()
    for (const lv of ORDER) m.set(lv, [])
    for (const r of rules) m.get(r.evidence)?.push(r)
    return m
  }, [rules])

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">근거 등급</p>
        <p className="mt-1 text-sm font-semibold text-stone-900">이 앱의 모든 말에는 출처가 붙습니다</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">
          권하거나 피하라는 문장 옆의 <strong>근거 A·B·C·G</strong>는 그 말이
          <strong> 무엇을 바탕으로 하는지</strong>를 나타냅니다.
          배지를 누르시면 그 자리에서도 뜻이 펼쳐집니다.
        </p>
      </div>

      <Section title="등급이 뜻하는 것" desc="위로 갈수록 단단한 근거입니다.">
        <div className="space-y-2.5">
          {ORDER.map((lv) => {
            const info = EVIDENCE_INFO[lv]
            const list = byLevel.get(lv) ?? []
            const sample = list[0]
            return (
              <div key={lv} className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50/60 px-3.5 py-2.5">
                  <span className={`chip ${info.chip}`}>근거 {lv}</span>
                  <span className="text-xs font-semibold text-stone-800">{info.what}</span>
                </div>
                <div className="px-3.5 py-2.5">
                  <p className="text-xs leading-relaxed text-stone-600">{info.how}</p>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} aria-hidden />
                    <span className="text-[11px] text-stone-500">
                      지금 선택하신 조건에서 <strong className="text-stone-700">{list.length}가지</strong> 권고가 이 등급입니다
                    </span>
                  </div>

                  {sample && (
                    <div className="mt-2 rounded-lg bg-stone-50 px-2.5 py-2">
                      <p className="text-[10px] font-medium text-stone-400">이 앱에 실려 있는 예</p>
                      <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-stone-700">{sample.title}</p>
                      {sample.refIds[0] && REF_BY_ID[sample.refIds[0]] && (
                        <p className="mt-1 text-[10px] leading-relaxed text-stone-400">
                          {REF_BY_ID[sample.refIds[0]].citation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="등급을 어떻게 읽으면 될까요">
        <div className="card divide-y divide-stone-100">
          <p className="px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">
            <strong className="text-stone-800">낮은 등급이 틀린 말은 아닙니다.</strong> 아직 사람에서
            충분히 확인되지 않았다는 뜻입니다. 특히 식이 연구는 사람을 무작위로 나눠 몇 년씩
            다른 음식을 먹이기 어려워, 애초에 A 등급이 나오기 힘든 분야입니다.
          </p>
          <p className="px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">
            <strong className="text-stone-800">그래서 G가 가장 많습니다.</strong> 학회 가이드라인은
            연구 하나가 아니라 전문가들이 근거를 모아 합의한 것이라, 실제 진료에서 쓰는 기준에
            가장 가깝습니다. 이 앱도 그것을 바탕으로 삼습니다.
          </p>
          <p className="px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">
            <strong className="text-stone-800">C 등급 하나만 보고 식습관을 바꾸지 마세요.</strong>{' '}
            특히 &lsquo;무엇이 암에 좋다&rsquo;는 이야기는 대개 세포·동물 실험에서 나옵니다.
            사람이 먹는 양으로는 그만큼의 농도가 되지 않는 경우가 많습니다.
          </p>
          <p className="px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">
            <strong className="text-stone-800">등급과 별개로, 치료는 담당 의료진과 상의하세요.</strong>{' '}
            이 앱은 식사를 돕는 도구이고, 같은 근거라도 환자분의 상태에 따라 다르게 적용됩니다.
          </p>
        </div>
      </Section>

      <Section title="출처" desc={`이 앱이 인용하는 문헌·지침 ${Object.keys(REF_BY_ID).length}건입니다.`}>
        <ul className="card divide-y divide-stone-100">
          {Object.values(REF_BY_ID).map((r) => (
            <li key={r.id} className="px-3.5 py-2.5 text-[11px] leading-relaxed text-stone-600">
              {r.url ? (
                <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-stone-300">
                  {r.citation}
                </a>
              ) : r.citation}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
