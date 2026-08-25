import { useState } from 'react'
import type { ReactNode } from 'react'
import type { EvidenceLevel, RuleLevel } from '../data/types'

/* ── 권고 수준 배지 ─────────────────────────────────────────── */

const LEVEL_STYLE: Record<RuleLevel, { cls: string; label: string; icon: string }> = {
  avoid: { cls: 'bg-danger-100 text-danger-700', label: '피하세요', icon: '✕' },
  caution: { cls: 'bg-warn-100 text-warn-700', label: '주의', icon: '!' },
  prefer: { cls: 'bg-brand-100 text-brand-700', label: '권장', icon: '✓' },
  info: { cls: 'bg-stone-100 text-stone-600', label: '참고', icon: 'i' }
}

export function LevelBadge({ level, className = '' }: { level: RuleLevel; className?: string }) {
  const s = LEVEL_STYLE[level]
  return (
    <span className={`chip ${s.cls} ${className}`}>
      <span aria-hidden className="font-bold">{s.icon}</span>
      {s.label}
    </span>
  )
}

/** 목록에서 쓰는 작은 점 표시 */
export function LevelDot({ level }: { level: RuleLevel | null }) {
  if (!level) return <span className="h-2 w-2 rounded-full bg-stone-200" />
  const color =
    level === 'avoid' ? 'bg-danger-500'
    : level === 'caution' ? 'bg-warn-500'
    : level === 'prefer' ? 'bg-brand-500'
    : 'bg-stone-300'
  return <span className={`h-2 w-2 rounded-full ${color}`} />
}

/* ── 근거 수준 배지 ─────────────────────────────────────────── */

/**
 * 근거 등급 설명.
 *
 * 이 앱의 모든 판정에는 등급이 붙는다. 그런데 그 뜻을 알 수 있는 곳이
 * 마우스를 올렸을 때 뜨는 풍선말뿐이었다 — 휴대폰에서는 볼 방법이 없다.
 * 뜻과 '그래서 어떻게 받아들이면 되는지' 를 함께 둔다.
 */
export const EVIDENCE_INFO: Record<
  EvidenceLevel,
  { what: string; how: string; chip: string; dot: string }
> = {
  A: {
    what: '무작위배정 임상시험, 또는 그런 시험들을 모은 메타분석',
    how: '사람을 무작위로 나눠 직접 비교한 결과입니다. 이 앱에서 가장 단단한 근거이며, 웬만하면 따르시는 편이 좋습니다.',
    chip: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500'
  },
  B: {
    what: '많은 사람을 오래 따라간 관찰 연구 (코호트·환자대조군)',
    how: '무작위로 나누지 않았기 때문에 "이것 때문"이라고 단정하기는 어렵지만, 규모가 크고 방향이 일관됩니다. 참고하실 만합니다.',
    chip: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500'
  },
  C: {
    what: '규모가 작거나 되돌아본 연구, 또는 세포·동물 수준의 기전 연구',
    how: '아직 사람에서 확인되지 않았거나 결과가 엇갈립니다. 참고만 하시고, 이것만 보고 식습관을 크게 바꾸지는 마세요.',
    chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500'
  },
  G: {
    what: '주요 학회 가이드라인의 합의 권고 (WCRF/AICR · ASCO · ESPEN · NCCN 등)',
    how: '연구 하나를 가리키는 것이 아니라, 전문가들이 근거를 모아 합의한 내용입니다. 실제 진료에서 쓰는 기준입니다.',
    chip: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500'
  }
}

/**
 * 근거 배지. 누르면 그 자리에서 뜻을 펼친다.
 *
 * 풍선말은 손가락으로 쓰는 기기에서 뜨지 않는다.
 * 환자분이 "근거 C" 를 보고 그게 센 말인지 약한 말인지 알 수 있어야 한다.
 */
export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const [open, setOpen] = useState(false)
  const info = EVIDENCE_INFO[level]
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className={`chip ${info.chip} ring-1 ring-inset ring-black/5`}
        aria-expanded={open}
        aria-label={`근거 ${level} — 뜻 ${open ? '접기' : '보기'}`}
      >
        근거 {level}
        {/*
          * 물음표를 쓰지 않는다.
          * "근거 B ?" 는 눌러 보라는 뜻으로 읽히기도 하지만,
          * "근거가 불확실한가?" 로도 읽힌다. 임상 정보를 다루는 화면에서
          * 그런 두 갈래는 두면 안 된다.
          * 펼침은 아래를 가리키는 꺾쇠로만 말한다 — 뜻이 하나뿐이다.
          */}
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
          className={`ml-1 inline-block h-2.5 w-2.5 opacity-55 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5 9l7 7 7-7" />
        </svg>
      </button>
      {open && (
        <span className="mt-1 block w-full rounded-lg bg-stone-50 px-2.5 py-2 text-[11px] leading-relaxed text-stone-600">
          <strong className="text-stone-800">{info.what}</strong>
          <br />
          {info.how}
        </span>
      )}
    </>
  )
}

/* ── 레이아웃 ───────────────────────────────────────────────── */

export function Section({
  title,
  desc,
  right,
  children
}: {
  title: string
  desc?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-5">
      <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-bold text-stone-900">{title}</h2>
          {desc && <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

/** 값 하나를 크게 보여주는 통계 타일 */
export function Stat({
  label,
  value,
  unit,
  hint,
  tone = 'neutral'
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}) {
  const toneCls =
    tone === 'good' ? 'text-brand-700'
    : tone === 'warn' ? 'text-warn-700'
    : tone === 'bad' ? 'text-danger-700'
    : 'text-stone-900'
  return (
    <div className="card px-3.5 py-3">
      <div className="text-[11px] font-medium text-stone-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${toneCls}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-stone-400">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] leading-tight text-stone-400">{hint}</div>}
    </div>
  )
}

/* ────────────────── 영양 상태 한눈에 보기 ────────────────── */

/**
 * 한 영양소가 지금 어느 상태인가.
 *
 * 숫자만 보여 주면 그것이 좋은 상태인지 아닌지 읽는 사람이 판단해야 한다.
 * 1,723 kcal 이 충분한지 아닌지는 목표를 외우고 있어야 알 수 있다.
 * 그래서 판정을 앱이 먼저 내고, 색과 글자로 함께 말한다.
 */
export type NutrientState = 'none' | 'low' | 'ok' | 'high' | 'over'

export const NUTRIENT_STATE: Record<
  NutrientState,
  { label: string; chip: string; fill: string; text: string }
> = {
  none: { label: '기록 없음', chip: 'bg-stone-100 text-stone-500', fill: 'bg-stone-300', text: 'text-stone-400' },
  low:  { label: '부족',     chip: 'bg-warn-100 text-warn-800',    fill: 'bg-warn-500',  text: 'text-warn-800' },
  ok:   { label: '적정',     chip: 'bg-brand-100 text-brand-800',  fill: 'bg-brand-500', text: 'text-stone-900' },
  high: { label: '주의',     chip: 'bg-warn-100 text-warn-800',    fill: 'bg-warn-500',  text: 'text-warn-800' },
  over: { label: '넘음',     chip: 'bg-danger-100 text-danger-800', fill: 'bg-danger-500', text: 'text-danger-800' }
}

/** 값과 목표 범위로 상태를 정한다. limit 이 있으면 그 위는 '넘음'이다. */
export function nutrientState(
  value: number,
  min: number,
  max: number,
  opts?: { limit?: number; empty?: boolean; overOk?: boolean }
): NutrientState {
  if (opts?.empty) return 'none'
  if (opts?.limit !== undefined) {
    if (value > opts.limit) return 'over'
    // 상한의 85 % 를 넘었으면 '적정'이라고 말하면 안 된다.
    // 1,750/2,000 을 초록으로 칠하면 안심하고 국물을 마시게 된다.
    return value > opts.limit * 0.85 ? 'high' : 'ok'
  }
  if (value < min) return 'low'
  /*
   * 넘어도 괜찮은 것이 있다. 단백질이 그렇다 —
   * 치료 중에는 더 드시는 편이 낫고, 목표 상단은 "이만큼은 드세요" 의 위쪽 눈금일 뿐이다.
   * 88 g 을 '주의'로 칠하면 잘 드신 날에 경고를 보게 된다.
   * 다만 신장 기능이 떨어진 분에게는 반대이므로, 그때는 이 예외를 끈다.
   */
  /*
   * 넘어도 괜찮다는 것과 얼마가 됐든 괜찮다는 것은 다르다.
   *
   * 예전에는 overOk 면 무조건 '적정' 으로 칠했다. 그래서 목표 62~78 g 인 분께
   * 92 g 을 내놓고도 초록으로 표시했는데, 같은 화면 아래 평가는
   * "목표보다 많습니다" 라고 적혀 있었다. 앱이 제 말과 어긋난 셈이다.
   * 겁을 줄 일은 아니니 빨강까지 가지 않고, 아래 평가와 같은 눈금에서
   * 노랑으로만 바꾼다.
   */
  if (opts?.overOk) return value > max * 1.25 ? 'high' : 'ok'
  if (value > max * 1.15) return 'over'
  if (value > max) return 'high'
  return 'ok'
}

/**
 * 영양소 한 줄.
 *
 * 목표 구간을 띠로 깔고 그 위에 지금 값을 채운다.
 * 목표에 못 미치면 띠가 비어 보이고, 넘으면 띠 밖으로 삐져나온다 — 눈으로 바로 읽힌다.
 */
export function NutrientRow({
  label, value, unit, min, max, limit, state, hint
}: {
  label: string
  value: number
  unit: string
  /** 목표 하단 */ min: number
  /** 목표 상단 */ max: number
  /** 상한 (나트륨처럼 넘으면 안 되는 것) */ limit?: number
  state: NutrientState
  hint?: string
}) {
  const st = NUTRIENT_STATE[state]
  // 눈금의 끝. 목표보다 많이 먹은 날도 막대가 화면 안에 들어와야 한다.
  const scale = Math.max((limit ?? max) * 1.3, value * 1.08, 1)
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / scale) * 100))}%`

  return (
    <div className="px-3.5 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
          {label}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${st.chip}`}>{st.label}</span>
        </span>
        <span className={`text-sm font-bold tabular-nums ${st.text}`}>
          {Math.round(value).toLocaleString('ko-KR')}
          <span className="ml-0.5 text-[10px] font-medium text-stone-400">{unit}</span>
        </span>
      </div>

      <div className="relative mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
        {/* 목표 구간 */}
        <div
          className="absolute top-0 h-full bg-brand-100"
          style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }}
          aria-hidden
        />
        {/* 지금 값 */}
        <div className={`absolute top-0 h-full rounded-full ${st.fill}`} style={{ width: pct(value) }} />
        {/* 상한선 */}
        {limit !== undefined && (
          <div className="absolute top-0 h-full w-0.5 bg-danger-500" style={{ left: pct(limit) }} aria-hidden />
        )}
      </div>

      <div className="mt-1 text-[10px] text-stone-400">
        {limit !== undefined ? `상한 ${limit.toLocaleString('ko-KR')} ${unit}` : `목표 ${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')} ${unit}`}
        {hint && ` · ${hint}`}
      </div>
    </div>
  )
}

/**
 * 여러 줄을 묶고, 맨 위에 한 문장으로 결론을 낸다.
 * 화면을 열자마자 "오늘 뭐가 문제인지"가 먼저 보여야 한다.
 */
export function NutrientPanel({
  states, children
}: { states: NutrientState[]; children: React.ReactNode }) {
  const bad = states.filter((s) => s === 'over').length
  const low = states.filter((s) => s === 'low').length
  const high = states.filter((s) => s === 'high').length
  const none = states.every((s) => s === 'none')

  const headline = none
    ? { text: '아직 담으신 것이 없습니다', cls: 'bg-stone-100 text-stone-600' }
    : bad > 0
      ? { text: `${bad}가지가 기준을 넘었습니다`, cls: 'bg-danger-100 text-danger-800' }
      : low + high > 0
        ? { text: `${low > 0 ? `${low}가지 부족` : ''}${low > 0 && high > 0 ? ' · ' : ''}${high > 0 ? `${high}가지 주의` : ''}`, cls: 'bg-warn-100 text-warn-800' }
        : { text: '모두 적정 범위입니다', cls: 'bg-brand-100 text-brand-800' }

  return (
    <div className="card mb-3 overflow-hidden">
      <div className={`px-3.5 py-2 text-xs font-bold ${headline.cls}`}>{headline.text}</div>
      <div className="divide-y divide-stone-100">{children}</div>
    </div>
  )
}

/**
 * 평가 한 줄을 성격에 맞게 보여 준다.
 *
 * 예전에는 모두 같은 회색 문단이라, "충족합니다" 와 "상한을 넘습니다" 가
 * 나란히 같은 무게로 보였다. 여러 줄이 늘어서면 무엇이 문제인지 다 읽어야 알 수 있었다.
 * 왼쪽 색띠와 제목으로 성격을 먼저 드러내고, 문제부터 위로 올린다.
 */
export function DayNoteList({
  notes
}: {
  notes: { tone: 'good' | 'low' | 'over' | 'info'; topic: string; text: string }[]
}) {
  const STYLE = {
    over: { bar: 'bg-danger-500', chip: 'bg-danger-100 text-danger-800', label: '넘음' },
    low:  { bar: 'bg-warn-500',   chip: 'bg-warn-100 text-warn-800',     label: '부족' },
    info: { bar: 'bg-stone-300',  chip: 'bg-stone-100 text-stone-600',   label: '참고' },
    good: { bar: 'bg-brand-400',  chip: 'bg-brand-100 text-brand-800',   label: '좋음' }
  } as const
  // 문제부터 위로. 잘된 것은 아래에 모아 둔다.
  const order = { over: 0, low: 1, info: 2, good: 3 }
  const sorted = [...notes].sort((a, b) => order[a.tone] - order[b.tone])

  return (
    <div className="card divide-y divide-stone-100">
      {sorted.map((n, i) => {
        const st = STYLE[n.tone]
        return (
          <div key={i} className="flex gap-2.5 px-3 py-2.5">
            <div className={`mt-0.5 w-1 shrink-0 rounded-full ${st.bar}`} aria-hidden />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-800">{n.topic}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${st.chip}`}>{st.label}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">{n.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ────────────────── 오늘의 몸 상태를 그 자리에서 ────────────────── */

/**
 * 치료 시기·증상·복용 약을 내 식단 화면에서 바로 고친다.
 *
 * 이 셋은 다른 설정과 성격이 다르다. 키와 이름은 좀처럼 바뀌지 않지만,
 * 설사는 어제 없다가 오늘 있고, 방사선치료는 어느 날 끝난다.
 * 그런데 고치려면 내 정보 탭까지 들어가야 했다 —
 * 매일 여는 화면에서 매일 바뀌는 것을 못 고치고 있었던 셈이다.
 *
 * 게다가 이 셋은 추천을 가장 크게 바꾼다. 설사 하나로 식이섬유 목표가
 * 25~35 g 에서 8~15 g 으로 뒤집히고, 와파린 하나로 시금치가 주의가 된다.
 * 오늘 상태가 어제와 다르면 오늘 식단도 달라야 한다.
 *
 * 접어 두는 것이 기본이다 — 평소에는 자리만 차지하고,
 * 달라진 날에만 펴서 고치시면 된다.
 */
export function TodayStatus({
  phaseLabel, conditions, medications, children
}: {
  phaseLabel: string
  conditions: string[]
  medications: string[]
  children: ReactNode
}) {
  const bits = [
    phaseLabel,
    conditions.length > 0 ? `증상 ${conditions.length}가지` : '증상 없음',
    medications.length > 0 ? `약 ${medications.length}가지` : '약 없음'
  ]
  return (
    <details className="card mb-3 overflow-hidden">
      <summary className="flex cursor-pointer items-center gap-2 px-3.5 py-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700">
          {bits.join(' · ')}
        </span>
        <span className="shrink-0 text-[11px] font-medium text-brand-700">달라졌나요?</span>
      </summary>
      <div className="border-t border-stone-100 px-3.5 py-3">
        <p className="mb-2.5 text-[11px] leading-relaxed text-stone-500">
          오늘 상태가 어제와 다르면 여기서 바로 고치세요. 고치는 즉시 아래 목표와 추천이 함께 바뀝니다.
        </p>
        {children}
      </div>
    </details>
  )
}

/** 눌러서 켜고 끄는 알약 단추 묶음 */
export function ChipGroup<T extends string>({
  label, options, value, onToggle, single = false
}: {
  label: string
  options: readonly { id: T; name: string }[]
  value: T[]
  onToggle: (id: T) => void
  /** 하나만 고를 수 있는가 (치료 시기) */
  single?: boolean
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[11px] font-semibold text-stone-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.id)
          return (
            <button
              key={o.id}
              onClick={() => onToggle(o.id)}
              aria-pressed={on}
              className={`chip border ${
                on
                  ? single
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-warn-500 bg-warn-500 text-white'
                  : 'border-stone-300 bg-white text-stone-600'
              }`}
            >
              {o.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 누가 만들고 누가 보았는지.
 *
 * 이 앱은 판정마다 근거 등급과 출처를 달아 두었지만, 그 판단을 누가 했는지는
 * 어디에도 적지 않았다. 암 환자에게 "이건 드셔도 됩니다" 라고 말하는 앱이라면
 * 그 말의 출처가 문헌만이어서는 부족하다 — 문헌을 고르고 이 환자에게
 * 무엇이 해당하는지 정한 사람이 누구인지가 함께 있어야 한다.
 *
 * 다만 이것이 진료를 대신한다는 뜻으로 읽히면 안 되므로, 같은 자리에서
 * 담당 의료진과 상의하시라는 말을 함께 둔다.
 */
export function Credentials({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] leading-relaxed text-stone-500">
        암 환자를 25년간 치료해 온 <strong className="text-stone-700">방사선종양학과 전문의</strong>가
        내용을 감수하고 검토했습니다.
      </p>
    )
  }
  return (
    <div className="card border-brand-200 bg-brand-50/50 p-4">
      <h3 className="text-sm font-bold text-brand-900">누가 만들고 누가 보았나</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-stone-700">
        암 환자를 <strong>25년간 치료해 온 방사선종양학과 전문의</strong>가 이 앱의 모든 권고를
        직접 감수하고 검토했습니다. 어떤 문헌을 근거로 삼을지, 그 근거가 이 암종·이 시기·이 증상에
        해당하는지는 진료 경험을 바탕으로 판단했습니다.
      </p>
      <ul className="mt-2.5 space-y-1 text-[11px] leading-relaxed text-stone-600">
        <li>· 권고마다 근거 수준(A·B·C·G)과 출처를 함께 밝혔습니다.</li>
        <li>· 근거가 엇갈리는 주제는 한쪽으로 몰지 않고 그 사실을 적었습니다.</li>
        <li>· 판단이 바뀌면 규칙을 고칩니다 — 근거가 먼저이고 일관성은 그다음입니다.</li>
      </ul>
      <p className="mt-2.5 border-t border-brand-200/70 pt-2 text-[11px] leading-relaxed text-stone-500">
        그래도 이 앱은 <strong>진료를 대신하지 않습니다.</strong> 여기 적힌 것은 담당 선생님과
        이야기하실 거리이지 결론이 아닙니다.
      </p>
    </div>
  )
}
