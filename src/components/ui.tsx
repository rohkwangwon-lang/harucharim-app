import type { ReactNode } from 'react'
import type { EvidenceLevel, RuleLevel } from '../data/types'

/* ── 권고 수준 배지 ─────────────────────────────────────────── */

const LEVEL_STYLE: Record<RuleLevel, { cls: string; label: string; icon: string }> = {
  avoid: { cls: 'bg-danger-100 text-danger-700', label: '피하세요', icon: '✕' },
  caution: { cls: 'bg-warn-100 text-warn-700', label: '주의', icon: '!' },
  prefer: { cls: 'bg-brand-100 text-brand-700', label: '권장', icon: '✓' },
  info: { cls: 'bg-slate-100 text-slate-600', label: '참고', icon: 'i' }
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
  if (!level) return <span className="h-2 w-2 rounded-full bg-slate-200" />
  const color =
    level === 'avoid' ? 'bg-danger-500'
    : level === 'caution' ? 'bg-warn-500'
    : level === 'prefer' ? 'bg-brand-500'
    : 'bg-slate-300'
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
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {desc && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="card px-4 py-10 text-center text-sm text-slate-400">{children}</div>
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
    : 'text-slate-900'
  return (
    <div className="card px-3.5 py-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${toneCls}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-slate-400">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] leading-tight text-slate-400">{hint}</div>}
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
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      <div
        className="absolute top-0 h-full w-px bg-slate-400/70"
        style={{ left: `${minPct}%` }}
        aria-hidden
      />
    </div>
  )
}
