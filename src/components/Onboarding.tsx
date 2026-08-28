import { useState } from 'react'
import { SOURCES, setSource } from '../lib/stats'
import { track } from '../lib/stats'
import { isSupabaseConfigured } from '../lib/supabase'
import { displayName, lastProvider, PROVIDER_LABEL, signIn, useSession, type Provider } from '../lib/auth'
import type { CancerId, Cuisine, PatientCondition, PatientContext, Phase, TreatmentHistory } from '../data/types'
import { SUBTYPE_OPTIONS } from '../data/types'
import { Credentials } from './ui'
import { CANCERS, CANCER_BY_ID } from '../data/cancers'
import { nutritionRisk, personalTarget } from '../engine/nutrition'

/**
 * 첫 실행 안내.
 *
 * 암종과 치료 시기를 모르면 이 앱은 아무 말도 정확하게 할 수 없다.
 * 그래서 설정 화면에 숨겨 두지 않고, 처음 열었을 때 네 단계로 나눠 받는다.
 * 한 화면에 하나씩만 물어 부담을 줄이고, 마지막에 무엇이 달라지는지 보여 준다.
 */

const PHASES: { id: Phase; label: string; desc: string }[] = [
  { id: 'during_rt', label: '방사선치료 중', desc: '점막염·설사 같은 급성 부작용 시기' },
  { id: 'during_chemo', label: '항암치료 중', desc: '오심·미각변화·골수억제 시기' },
  { id: 'neutropenia', label: '호중구감소증', desc: '식품 안전 규칙이 강화됩니다' },
  { id: 'post_op', label: '수술 후 회복기', desc: '식이 단계를 올려가는 시기' },
  { id: 'survivorship', label: '치료를 마쳤습니다', desc: '재발 예방과 체중 관리 중심' }
]

const HISTORIES: TreatmentHistory[] = [
  '수술', '방사선치료', '항암화학요법', '항호르몬치료', '표적치료', '면역항암제', '조혈모세포이식'
]

const COMMON_CONDITIONS: PatientCondition[] = [
  '식욕부진', '체중감소', '체중증가', '오심·구토', '구강점막염', '설사', '변비',
  '연하곤란', '위절제후', '당뇨', '고혈압'
]

const CUISINES: Cuisine[] = ['한식', '양식', '중식', '일식', '동남아']

export function Onboarding({
  patient,
  onChange,
  onDone,
  loginOnly = false
}: {
  patient: PatientContext
  onChange: (patch: Partial<PatientContext>) => void
  onDone: (patch: Partial<PatientContext>) => void
  /**
   * 설정은 이미 마치셨고 로그인만 다시 하시는 경우.
   *
   * 로그아웃하신 뒤 돌아오실 때 암종부터 다시 고르시게 하면,
   * 이미 적어 두신 것을 처음부터 되묻는 셈이 된다.
   */
  loginOnly?: boolean
}) {
  const [step, setStep] = useState(0)
  const { user } = useSession()
  /* 지난번에 쓰신 로그인 방법 — 아이디·비밀번호는 이 앱이 받지 않는다 */
  const last = lastProvider()
  const steps = loginOnly
    ? ['로그인']
    : ['로그인', '암종', '치료 시기', '몸 상태', '식성', '알게 된 경로']
  /*
   * 첫 화면은 로그인을 거쳐야 넘어간다.
   * 다만 로그인 서버가 설정되지 않은 환경(로컬 개발·미리보기)에서까지 막으면
   * 앱을 아예 쓸 수 없게 되므로, 그때는 그대로 통과시킨다.
   */
  const needsLogin = isSupabaseConfigured && !user
  const [pickedSource, setPickedSource] = useState<string | null>(null)
  const canNext = step === 0 ? !needsLogin : step === 1 ? !!patient.cancer : true

  /* 넣으신 숫자를 그 자리에서 되비춰 준다 */
  const risk = nutritionRisk(patient)
  const cancerTarget = CANCER_BY_ID[patient.cancer].target
  const preview = personalTarget(patient, cancerTarget.kcalPerKg, cancerTarget.proteinPerKg)

  const toggle = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      {/* 진행 표시 */}
      <div className="safe-top shrink-0 border-b border-stone-200 bg-white px-5 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-stone-900">하루차림 시작하기</h1>
          <span className="text-xs tabular-nums text-stone-400">{step + 1} / {steps.length}</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-stone-200'}`} />
              <div className={`mt-1 text-[10px] ${i === step ? 'font-semibold text-brand-700' : 'text-stone-400'}`}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {step === 0 && (
          <Step
            title={loginOnly ? '다시 로그인해 주세요' : '하루차림을 시작합니다'}
            desc={loginOnly
              ? '로그아웃하셨습니다. 다시 로그인하시면 적어 두신 기록이 그대로 있습니다.'
              : '먼저 로그인해 주세요. 기기를 바꾸셔도 설정이 유지되고, 문의하신 내용의 답변을 앱에서 바로 확인하실 수 있습니다.'}
          >
            {user ? (
              <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
                <p className="text-sm font-semibold text-brand-800">
                  {displayName(user)} 님, 반갑습니다
                </p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  로그인되었습니다. 다음 단계에서 몇 가지만 알려주시면 준비가 끝납니다.
                </p>
              </div>
            ) : isSupabaseConfigured ? (
              <>
                {/*
                  * 지난번에 쓰신 쪽을 위로 올리고 표시해 둔다.
                  *
                  * 로그인은 기기에 남아 자동으로 이어지지만, 오래 열지 않아 만료되면
                  * 다시 고르셔야 한다. 그때 "내가 카카오였나 구글이었나" 를 떠올리는 일은
                  * 사용자 몫으로 둘 것이 아니다 — 다른 쪽으로 들어가면 아예 다른 계정이 되어
                  * 적어 두신 것과 문의 내역이 사라진 것처럼 보인다.
                  */}
                <div className="flex flex-col gap-2">
                  {([...(['kakao', 'google'] as Provider[])]
                    .sort((a, b) => (a === last ? -1 : b === last ? 1 : 0))
                  ).map((p) => (
                    <button
                      key={p}
                      className={`btn relative py-3 text-sm ${
                        p === 'kakao'
                          ? 'bg-[#FEE500] text-[#191600] hover:bg-[#f5dc00]'
                          : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                      } ${p === last ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
                      onClick={() => signIn(p).catch(() => undefined)}
                    >
                      {PROVIDER_LABEL[p]}
                      {p === last && (
                        <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          지난번에 쓰신 방법
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {last && (
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-stone-500">
                    같은 방법으로 들어오셔야 적어 두신 기록과 문의 내역이 그대로 이어집니다.
                  </p>
                )}
                <p className="mt-4 text-center text-xs text-stone-400">
                  처음이시면 위 버튼으로 바로 가입됩니다. 따로 아이디를 만들지 않으셔도 됩니다.
                </p>
                <p className="mt-2 text-center text-[11px] text-stone-400">
                  로그인하시면 다음 단계로 넘어갑니다.
                </p>
              </>
            ) : (
              <div className="rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
                로그인 기능을 준비하고 있습니다. 지금은 그대로 진행하셔도 됩니다.
              </div>
            )}

            {/* 누가 만든 앱인지 처음 화면에서 밝힌다 */}
            <div className="mt-5 rounded-xl bg-brand-50/60 px-4 py-3 ring-1 ring-brand-200">
              <Credentials compact />
            </div>

            <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3">
              <p className="text-[11px] leading-relaxed text-stone-500">
                암종·체중·식단 같은 <strong className="text-stone-700">건강 정보는 이 기기 안에만</strong> 저장되며
                서버로 전송되지 않습니다. 로그인은 문의 답변을 확인하기 위한 것입니다.{' '}
                <a
                  href={`${import.meta.env.BASE_URL}privacy.html`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-stone-300"
                >
                  개인정보처리방침
                </a>{' · '}<a
                  href={`${import.meta.env.BASE_URL}terms.html`}
                  target="_blank" rel="noreferrer"
                  className="underline underline-offset-2"
                >이용약관</a>
              </p>
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step
            title="어떤 암으로 치료받고 계신가요?"
            desc="선택하신 암종에 따라 권고 내용이 완전히 달라집니다. 같은 음식이 어떤 암에서는 권장이고 다른 암에서는 주의 대상입니다."
          >
            <div className="grid grid-cols-2 gap-2">
              {CANCERS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onChange({ cancer: c.id as CancerId })}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                    patient.cancer === c.id
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/*
              * 세부 사항도 여기서 묻는다.
              *
              * 내 정보 화면에는 있었는데 처음 설정에는 없었다. 그래서 위암을 고르신 분이
              * 전절제인지 부분절제인지 묻지 않은 채로 넘어갔다 —
              * 그게 B12 를 평생 맞으셔야 하는지를 가르는 변수인데도.
              * 알아서 내 정보에 들어가 고치실 분은 많지 않다.
              */}
            {(SUBTYPE_OPTIONS[patient.cancer] ?? []).length > 0 && (
              <div className="mt-5 rounded-xl bg-white p-3.5 ring-1 ring-stone-200">
                <p className="text-sm font-bold text-stone-900">아시는 것이 있으면 알려 주세요</p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                  고르지 않으셔도 됩니다. 알려 주시면 해당되지 않는 안내는 빼 드립니다.
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {(SUBTYPE_OPTIONS[patient.cancer] ?? []).map((o) => {
                    const on = (patient.subtypes ?? []).includes(o.id)
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          /* 위 전절제와 부분절제처럼 함께 고를 수 없는 것은 하나만 남긴다 */
                          const others = (SUBTYPE_OPTIONS[patient.cancer] ?? [])
                            .map((x) => x.id)
                            .filter((x) => x !== o.id)
                          const kept = (patient.subtypes ?? []).filter((x) => !others.includes(x))
                          onChange({ subtypes: on ? kept.filter((x) => x !== o.id) : [...kept, o.id] })
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          on ? 'border-brand-500 bg-brand-50' : 'border-stone-200 bg-white'
                        }`}
                      >
                        <span className={`block text-sm font-medium ${on ? 'text-brand-800' : 'text-stone-700'}`}>
                          {o.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500">{o.hint}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </Step>
        )}

        {step === 2 && (
          <Step
            title="지금 어느 단계에 계신가요?"
            desc="시기에 따라 권고가 뒤집히기도 합니다. 예를 들어 대장암에서 식이섬유는 회복 후에는 권장이지만 수술 직후에는 제한해야 합니다."
          >
            <div className="space-y-2">
              {PHASES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange({ phase: p.id })}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    patient.phase === p.id ? 'border-brand-500 bg-brand-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                    patient.phase === p.id ? 'border-brand-600 bg-brand-600' : 'border-stone-300'
                  }`} />
                  <span>
                    <span className="block text-sm font-semibold text-stone-900">{p.label}</span>
                    <span className="block text-xs text-stone-500">{p.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-stone-800">지금까지 받으신 치료</p>
              <p className="mb-2.5 text-xs text-stone-500">복수 선택할 수 있습니다. 영양제와 운동 추천에 반영됩니다.</p>
              <div className="flex flex-wrap gap-1.5">
                {HISTORIES.map((h) => (
                  <button
                    key={h}
                    onClick={() => onChange({ history: toggle(patient.history ?? [], h) })}
                    className={`chip border ${
                      (patient.history ?? []).includes(h)
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-stone-300 bg-white text-stone-600'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            title="몸 상태를 알려주세요"
            desc="열량과 단백질 목표는 체중을 기준으로 계산합니다. 정확하지 않아도 대략 넣으시면 됩니다."
          >
            <div className="card grid grid-cols-2 gap-3 p-4">
              <Field label="체중 (kg)" value={patient.weightKg} onChange={(v) => onChange({ weightKg: v })} />
              <Field label="신장 (cm)" value={patient.heightCm} onChange={(v) => onChange({ heightCm: v })} />
              <Field label="나이" value={patient.age} onChange={(v) => onChange({ age: v })} />
              <div>
                <label className="label">성별</label>
                <div className="flex gap-1.5">
                  {(['M', 'F'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onChange({ sex: s })}
                      className={`flex-1 rounded-xl border px-2 py-2 text-sm font-medium ${
                        patient.sex === s ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-stone-300 bg-white text-stone-600'
                      }`}
                    >
                      {s === 'M' ? '남' : '여'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Field
                  label="최근 6개월 체중 감소율 (%)"
                  value={patient.weightLossPct ?? 0}
                  onChange={(v) => onChange({ weightLossPct: v })}
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  없으면 0. 예: 60 kg 에서 57 kg 이 되었다면 5 %
                </p>
              </div>
            </div>

            {/*
              * 넣으신 숫자가 무슨 뜻인지 그 자리에서 보여 준다.
              *
              * 예전에는 체중·신장·감소율을 받아 놓고 화면이 아무 반응도 하지 않았다.
              * 52 kg · 163 cm · 8 % 를 넣어도 BMI 도, 목표도, 위험 신호도 없이
              * '다음' 만 있었다. 마지막 화면에 가서야 요약이 나왔는데,
              * 그때는 이미 되돌아가 고치기 번거로운 자리다.
              * 무엇보다 잘못 넣은 숫자(163 을 16 으로)를 알아챌 방법이 없었다.
              */}
            <div className="mt-4 rounded-xl bg-white p-3.5 ring-1 ring-stone-200">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-stone-500">지금 값으로 보면</span>
                <span className="text-sm font-bold tabular-nums text-stone-900">
                  BMI {risk.bmi} · {risk.bmiLabel}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-stone-50 px-2.5 py-2">
                  <div className="text-stone-500">하루 열량</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums text-stone-900">
                    {preview.kcal[0].toLocaleString()}~{preview.kcal[1].toLocaleString()} kcal
                  </div>
                </div>
                <div className="rounded-lg bg-stone-50 px-2.5 py-2">
                  <div className="text-stone-500">하루 단백질</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums text-stone-900">
                    {preview.protein[0]}~{preview.protein[1]} g
                  </div>
                </div>
              </div>
              {(patient.weightLossPct ?? 0) >= 5 && (
                <p className="mt-2 rounded-lg bg-warn-50 px-2.5 py-2 text-[11px] leading-relaxed text-warn-800">
                  6개월간 5 % 이상 줄었습니다. 영양 개입 기준에 해당하며, 이 시점부터 손대는 것이 효과가 좋습니다.
                </p>
              )}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-stone-800">지금 겪고 계신 증상</p>
              <p className="mb-2.5 text-xs text-stone-500">해당하는 것만 고르세요. 나중에 언제든 바꿀 수 있습니다.</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ conditions: toggle(patient.conditions, c) })}
                    className={`chip border ${
                      patient.conditions.includes(c)
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-stone-300 bg-white text-stone-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step
            title="어떤 음식으로 식단을 짤까요?"
            desc="기본은 제철 한식입니다. 드시고 싶은 계통을 추가하면 식단에 함께 섞습니다."
          >
            <div className="flex flex-wrap gap-1.5">
              {CUISINES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    const next = toggle<Cuisine>(patient.cuisines ?? ['한식'], c)
                    onChange({ cuisines: next.length ? next : (['한식'] as Cuisine[]) })
                  }}
                  className={`chip border ${
                    (patient.cuisines ?? ['한식']).includes(c)
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-stone-300 bg-white text-stone-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <Preview patient={patient} />
          </Step>
        )}

        {/*
          * 어떻게 알게 되셨는지.
          *
          * 홍보를 어디에 할지 정하려면 이게 있어야 한다.
          * 처음에는 링크 뒤 ?from=... 으로 받으려 했는데, 카페마다 링크를 따로
          * 만들어 관리하는 일이 번거롭고 주소창 글자가 그대로 들어오면 위험하다.
          * 여쭙는 편이 낫다 — 고르는 항목이 정해져 있으니 이상한 값이 들어올 수 없다.
          *
          * 답하지 않고 넘어가실 수 있어야 한다. 이건 선생님이 궁금한 것이지
          * 환자분께 필요한 것이 아니기 때문이다.
          */}
        {step === 5 && (
          <Step
            title="하루차림을 어떻게 알게 되셨어요?"
            desc="어디에 힘을 쏟을지 정하는 데만 씁니다. 답하지 않으셔도 됩니다."
          >
            <div className="flex flex-col gap-1.5">
              {SOURCES.map((s) => {
                const on = pickedSource === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setPickedSource(on ? null : s.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                      on
                        ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      on ? 'border-brand-500 bg-brand-500' : 'border-stone-300'
                    }`} />
                    {s.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-stone-400">
              고르신 항목은 이용 통계에 동의하신 경우에만 전해지고, 그때도 어느 갈래인지만 남습니다.
            </p>
          </Step>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="safe-bottom shrink-0 border-t border-stone-200 bg-white px-5 py-3">
        <div className="flex gap-2">
          {step > 0 && (
            <button className="btn-ghost flex-1" onClick={() => setStep(step - 1)}>이전</button>
          )}
          {step < steps.length - 1 ? (
            <button className="btn-primary flex-[2]" disabled={!canNext} onClick={() => setStep(step + 1)}>
              {step === 0 && needsLogin ? '로그인이 필요합니다' : '다음'}
            </button>
          ) : loginOnly ? (
            <button className="btn-primary flex-[2]" disabled>
              {needsLogin ? '로그인이 필요합니다' : '들어가는 중…'}
            </button>
          ) : (
            <button className="btn-primary flex-[2]" onClick={() => { if (pickedSource) setSource(pickedSource); track('onboard_done'); onDone({}) }}>시작하기</button>
          )}
        </div>
        {step === 1 && (
          <button
            className="mt-2 w-full text-center text-xs text-stone-400 hover:text-stone-600"
            onClick={() => onDone({})}
          >
            나중에 설정하기
          </button>
        )}
      </div>
    </div>
  )
}

function Step({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold leading-snug text-stone-900">{title}</h2>
      <p className="mb-5 mt-1.5 text-sm leading-relaxed text-stone-500">{desc}</p>
      {children}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        aria-label={label}
        type="number" inputMode="decimal" className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}

/** 마지막 단계에서 "그래서 뭐가 달라지는데?"에 답한다 */
function Preview({ patient }: { patient: PatientContext }) {
  const profile = CANCER_BY_ID[patient.cancer]
  const target = personalTarget(patient, profile.target.kcalPerKg, profile.target.proteinPerKg)
  const risk = nutritionRisk(patient)

  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">설정 결과</p>
      <p className="mt-1.5 text-sm font-semibold text-stone-900">{profile.name} · {patient.weightKg} kg 기준</p>
      <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
        <li>· 하루 열량 목표 <strong>{target.kcal[0]}~{target.kcal[1]} kcal</strong></li>
        <li>· 하루 단백질 목표 <strong>{target.protein[0]}~{target.protein[1]} g</strong></li>
        {profile.target.naLimit && <li>· 나트륨 상한 <strong>{profile.target.naLimit.toLocaleString()} mg</strong></li>}
        <li>· 적용되는 {profile.name} 권고 <strong>{profile.rules.length}개</strong></li>
      </ul>
      <p className="mt-3 border-t border-brand-200 pt-3 text-xs leading-relaxed text-stone-600">{risk.message}</p>
    </div>
  )
}
