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

const EVIDENCE_DESC: Record<EvidenceLevel, string> = {
  A: '무작위배정 임상시험 또는 그 메타분석',
  B: '대규모 전향적 코호트·환자대조군 연구',
  C: '소규모·후향적 연구 또는 기전 연구 — 결과가 일관되지 않음',
  G: '주요 학회 가이드라인의 합의 권고'
}

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const cls =
    level === 'A' ? 'bg-emerald-100 text-emerald-800'
    : level === 'B' ? 'bg-sky-100 text-sky-800'
    : level === 'C' ? 'bg-amber-100 text-amber-800'
    : 'bg-violet-100 text-violet-800'
  return (
    <span className={`chip ${cls}`} title={EVIDENCE_DESC[level]}>
      근거 {level}
    </span>
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

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="card px-4 py-10 text-center text-sm text-stone-400">{children}</div>
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

/** 목표 대비 진행 막대 */
export function Meter({
  value,
  min,
  max,
  overLimit
}: {
  value: number
  min: number
  max: number
  overLimit?: boolean
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const minPct = Math.min(100, (min / max) * 100)
  const color = overLimit ? 'bg-danger-500' : value < min ? 'bg-warn-500' : 'bg-brand-500'
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      <div
        className="absolute top-0 h-full w-px bg-stone-400/70"
        style={{ left: `${minPct}%` }}
        aria-hidden
      />
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
  if (opts?.overOk) return 'ok'
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
