import { useMemo, useState } from 'react'
import type { PatientContext, SelectedItem, Supplement } from '../data/types'
import { SUPPLEMENT_BY_ID } from '../data/supplements'
import type { DayKey } from '../lib/day'
import {
  addDays, addMonths, calendarGrid, fromKey, label, monthLabel, today, weekOf
} from '../lib/day'
import { FOOD_BY_ID } from '../data/foods'
import { GRADE_STYLE, summarizeDay, summarizePeriod } from '../engine/dayScore'
import { DayNoteList, Section, Stat } from './ui'

type View = 'day' | 'week' | 'month'

/**
 * 식단 기록.
 *
 * 하루하루의 숫자를 다 읽게 하면 아무도 보지 않는다.
 * 먼저 색으로 "충분/부족/초과"를 보여 주고, 궁금한 날을 눌렀을 때 숫자를 편다.
 */
export function Diary({
  patient,
  diary,
  weights,
  day,
  supplements,
  onPickDay,
  onSetWeight,
  onGoCompose
}: {
  patient: PatientContext
  diary: Record<DayKey, SelectedItem[]>
  weights: Record<DayKey, number>
  day: DayKey
  /** 복용 중인 영양제 id — 나트륨·열량 합계에 함께 넣는다 */
  supplements: string[]
  onPickDay: (d: DayKey) => void
  onSetWeight: (kg: number, forDay: DayKey) => void
  onGoCompose: () => void
}) {
  const [view, setView] = useState<View>('week')
  const [cursor, setCursor] = useState<DayKey>(day)
  const supps = useMemo(
    () => supplements.map((id) => SUPPLEMENT_BY_ID[id]).filter(Boolean),
    [supplements]
  )

  const summarize = useMemo(
    () => (d: DayKey) => summarizeDay(diary[d] ?? [], patient, supps),
    [diary, patient, supps]
  )

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1">
        {([['day', '하루'], ['week', '한 주'], ['month', '한 달']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              view === k ? 'bg-white text-brand-700 shadow-sm' : 'text-stone-500'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {view === 'day' && (
        <DayView
          d={cursor} patient={patient} items={diary[cursor] ?? []}
          weight={weights[cursor]} supps={supps}
          onMove={(n) => setCursor(addDays(cursor, n))}
          onToday={() => setCursor(today())}
          onSetWeight={(kg) => onSetWeight(kg, cursor)}
          onEdit={() => { onPickDay(cursor); onGoCompose() }}
        />
      )}

      {view === 'week' && (
        <WeekView
          anchor={cursor} patient={patient} summarize={summarize} weights={weights}
          onMove={(n) => setCursor(addDays(cursor, n * 7))}
          onToday={() => setCursor(today())}
          onPick={(d) => { setCursor(d); setView('day') }}
        />
      )}

      {view === 'month' && (
        <MonthView
          anchor={cursor} patient={patient} summarize={summarize}
          onMove={(n) => setCursor(addMonths(cursor, n))}
          onToday={() => setCursor(today())}
          onPick={(d) => { setCursor(d); setView('day') }}
        />
      )}

      <WeightTrend weights={weights} patient={patient} />
    </div>
  )
}

/* ────────────────────────── 하루 ────────────────────────── */

function DayView({
  d, patient, items, weight, supps, onMove, onToday, onSetWeight, onEdit
}: {
  d: DayKey
  patient: PatientContext
  items: SelectedItem[]
  weight?: number
  supps: Supplement[]
  onMove: (n: number) => void
  onToday: () => void
  onSetWeight: (kg: number) => void
  onEdit: () => void
}) {
  const s = summarizeDay(items, patient, supps)
  const st = GRADE_STYLE[s.grade]
  const [w, setW] = useState(weight ? String(weight) : '')

  const byMeal = (['아침', '점심', '저녁', '간식'] as const).map((m) => ({
    meal: m,
    list: items.filter((i) => i.meal === m)
  }))

  return (
    <>
      <Nav
        title={label(d)} onPrev={() => onMove(-1)} onNext={() => onMove(1)} canNext={d < today()}
        onToday={onToday} showToday={d !== today()}
      />

      <div className={`mb-4 rounded-2xl px-4 py-3.5 ${st.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
          <span className={`text-sm font-bold ${st.text}`}>{st.label}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-stone-700">{s.note}</p>
      </div>

      {!s.empty && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat label="에너지" value={String(s.kcal)} unit="kcal" hint={`목표 ${s.target.kcal[0]}~${s.target.kcal[1]}`} />
          <Stat label="단백질" value={String(s.protein)} unit="g" hint={`목표 ${s.target.protein[0]} 이상`} />
          <Stat label="나트륨" value={String(s.na)} unit="mg" />
        </div>
      )}

      <Section title="그날 체중">
        <div className="card flex items-center gap-2 p-3.5">
          <input
            type="number" inputMode="decimal" className="input flex-1"
            placeholder="예: 58.5"
            value={w}
            onChange={(e) => setW(e.target.value)}
          />
          <span className="text-sm text-stone-500">kg</span>
          <button className="btn-primary py-2 text-xs" onClick={() => onSetWeight(Number(w) || 0)}>
            기록
          </button>
        </div>
      </Section>

      <Section title="그날 식단" right={
        <button className="text-xs font-medium text-brand-700" onClick={onEdit}>
          이 날짜로 편집
        </button>
      }>
        {s.empty ? (
          <div className="card px-4 py-8 text-center text-sm text-stone-400">
            기록이 없습니다. ‘이 날짜로 편집’ 을 눌러 채워 넣으실 수 있습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {byMeal.filter((b) => b.list.length > 0).map((b) => (
              <div key={b.meal} className="card overflow-hidden">
                <div className="border-b border-stone-100 bg-stone-50/60 px-3.5 py-2 text-sm font-bold text-stone-800">
                  {b.meal}
                </div>
                <ul className="divide-y divide-stone-100">
                  {b.list.map((i) => {
                    const f = FOOD_BY_ID[i.foodId]
                    if (!f) return null
                    return (
                      <li key={i.foodId + b.meal} className="px-3.5 py-2 text-sm text-stone-700">
                        {f.name}
                        <span className="ml-1.5 text-[11px] text-stone-400">
                          {f.serving.label} × {i.servings}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}

/* ────────────────────────── 한 주 ────────────────────────── */

function WeekView({
  anchor, patient, summarize, weights, onMove, onToday, onPick
}: {
  anchor: DayKey
  patient: PatientContext
  summarize: (d: DayKey) => ReturnType<typeof summarizeDay>
  weights: Record<DayKey, number>
  onMove: (n: number) => void
  onToday: () => void
  onPick: (d: DayKey) => void
}) {
  const days = weekOf(anchor)
  const sum = summarizePeriod(days, summarize, patient, '주')
  const t = sum.target

  return (
    <>
      <Nav
        title={`${label(days[0], true)} ~ ${label(days[6], true)}`}
        onPrev={() => onMove(-1)} onNext={() => onMove(1)} canNext={days[6] < today()}
        onToday={onToday} showToday={!days.includes(today())}
      />

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="기록한 날" value={`${sum.recorded}`} unit="/ 7일" />
        <Stat label="하루 평균 열량" value={String(sum.avgKcal)} unit="kcal" hint={`목표 ${t.kcal[0]}~${t.kcal[1]}`} />
        <Stat label="하루 평균 단백질" value={String(sum.avgProtein)} unit="g" hint={`목표 ${t.protein[0]} 이상`} />
      </div>

      {/*
        * 숫자만으로는 그게 좋은 건지 알 수 없다.
        * "평균 1,640 kcal" 을 목표와 견주는 일을 사용자에게 시키지 않는다.
        */}
      <div className="mb-4">
        <DayNoteList notes={sum.notes} />
      </div>

      <div className="card divide-y divide-stone-100 overflow-hidden">
        {days.map((d) => {
          const s = summarize(d)
          const st = GRADE_STYLE[s.grade]
          const future = d > today()
          return (
            <button
              key={d}
              disabled={future}
              onClick={() => onPick(d)}
              className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${future ? 'opacity-30' : 'hover:bg-stone-50'}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
              <span className="w-20 shrink-0 text-sm font-medium text-stone-800">{label(d)}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-stone-500">
                {s.empty ? '기록 없음' : `${s.kcal} kcal · 단백질 ${s.protein} g`}
              </span>
              {weights[d] && (
                <span className="shrink-0 text-[11px] tabular-nums text-stone-400">{weights[d]} kg</span>
              )}
              <span className={`chip shrink-0 ${st.bg} ${st.text}`}>{st.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ────────────────────────── 한 달 ────────────────────────── */

function MonthView({
  anchor, patient, summarize, onMove, onToday, onPick
}: {
  anchor: DayKey
  patient: PatientContext
  summarize: (d: DayKey) => ReturnType<typeof summarizeDay>
  onMove: (n: number) => void
  onToday: () => void
  onPick: (d: DayKey) => void
}) {
  const cells = calendarGrid(anchor)
  const days = cells.filter((c): c is DayKey => c !== null)
  const sum = summarizePeriod(days, summarize, patient, '달')
  const counts = sum.counts

  return (
    <>
      <Nav
        title={monthLabel(anchor)}
        onPrev={() => onMove(-1)} onNext={() => onMove(1)}
        canNext={fromKey(anchor).getMonth() < fromKey(today()).getMonth() ||
                 fromKey(anchor).getFullYear() < fromKey(today()).getFullYear()}
        onToday={onToday} showToday={anchor.slice(0, 7) !== today().slice(0, 7)}
      />

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="충분했던 날" value={String(counts.good)} unit="일" tone="good" />
        <Stat label="부족했던 날" value={String(counts.low)} unit="일" tone="warn" />
        <Stat label="초과한 날" value={String(counts.high)} unit="일" tone="bad" />
      </div>

      <div className="mb-3">
        <DayNoteList notes={sum.notes} />
      </div>

      <div className="card p-3">
        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center">
          {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
            <span key={w} className="text-[10px] font-medium text-stone-400">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <span key={i} />
            const s = summarize(c)
            const st = GRADE_STYLE[s.grade]
            const future = c > today()
            return (
              <button
                key={c}
                disabled={future}
                onClick={() => onPick(c)}
                className={`aspect-square rounded-lg text-[11px] font-medium tabular-nums transition-colors ${
                  future ? 'text-stone-200' : `${st.bg} ${st.text} hover:ring-2 hover:ring-brand-300`
                } ${c === today() ? 'ring-2 ring-brand-500' : ''}`}
              >
                {fromKey(c).getDate()}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 px-1">
        {(['good', 'low', 'high', 'none'] as const).map((g) => (
          <span key={g} className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <span className={`h-2.5 w-2.5 rounded ${GRADE_STYLE[g].bg}`} />
            {GRADE_STYLE[g].label}
          </span>
        ))}
      </div>
    </>
  )
}

/* ────────────────────────── 체중 흐름 ────────────────────────── */

function WeightTrend({
  weights, patient
}: { weights: Record<DayKey, number>; patient: PatientContext }) {
  const entries = Object.entries(weights).sort(([a], [b]) => a.localeCompare(b)).slice(-30)
  if (entries.length < 2) {
    return (
      <Section title="체중 흐름" desc="이틀 이상 기록하시면 변화를 그려 드립니다.">
        <div className="card px-4 py-6 text-center text-sm text-stone-400">
          {entries.length === 0 ? '아직 기록이 없습니다.' : '하루 더 기록해 주세요.'}
        </div>
      </Section>
    )
  }

  const vals = entries.map(([, v]) => v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = Math.max(max - min, 1)
  const first = vals[0]
  const last = vals[vals.length - 1]
  const diff = Math.round((last - first) * 10) / 10
  // 6개월 5 % 감소가 영양 개입 기준이다. 짧은 기간이라도 방향은 알려 준다.
  const pct = Math.round(((last - first) / first) * 1000) / 10

  return (
    <Section title="체중 흐름" desc={`최근 ${entries.length}회 기록`}>
      <div className="card p-4">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-stone-900">{last}</span>
          <span className="text-sm text-stone-500">kg</span>
          <span className={`ml-auto text-sm font-semibold tabular-nums ${
            diff < 0 ? 'text-danger-600' : diff > 0 ? 'text-warn-600' : 'text-stone-400'
          }`}>
            {diff > 0 ? '+' : ''}{diff} kg ({pct > 0 ? '+' : ''}{pct} %)
          </span>
        </div>

        <svg viewBox="0 0 300 80" className="w-full" preserveAspectRatio="none" role="img" aria-label="체중 변화">
          <polyline
            fill="none" stroke="currentColor" strokeWidth="2"
            className="text-brand-500"
            points={entries.map(([, v], i) =>
              `${(i / (entries.length - 1)) * 296 + 2},${76 - ((v - min) / span) * 70}`
            ).join(' ')}
          />
          {entries.map(([, v], i) => (
            <circle
              key={i}
              cx={(i / (entries.length - 1)) * 296 + 2}
              cy={76 - ((v - min) / span) * 70}
              r="2.5" className="fill-brand-600"
            />
          ))}
        </svg>

        <div className="mt-1 flex justify-between text-[10px] text-stone-400">
          <span>{label(entries[0][0], true)}</span>
          <span>{label(entries[entries.length - 1][0], true)}</span>
        </div>

        {pct <= -5 && (
          <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-xs leading-relaxed text-danger-700">
            체중이 {Math.abs(pct)} % 줄었습니다. 6개월간 5 % 이상 감소는 영양 개입 기준에 해당합니다.
            담당 의료진께 알리시고, 경구영양보충을 고려하세요.
          </p>
        )}
        {patient.weightKg > 0 && Math.abs(last - patient.weightKg) > 2 && (
          <p className="mt-2 text-[11px] text-stone-500">
            설정에 적힌 체중({patient.weightKg} kg)과 차이가 있습니다. 오늘 체중을 기록하시면 목표 계산이 함께 갱신됩니다.
          </p>
        )}
      </div>
    </Section>
  )
}

/* ────────────────────────── 공통 ────────────────────────── */

/**
 * 날짜를 오가는 줄.
 *
 * '오늘' 단추가 나중에 붙었다. 지난달을 뒤적이다 보면 오늘로 돌아오는 길이
 * 화살표를 그만큼 다시 누르는 것뿐이었다. 석 달 전을 보고 있었다면 아흔 번이다.
 * 오늘을 보고 있을 때는 나오지 않는다 — 눌러도 아무 일이 없는 단추는 없느니만 못하다.
 */
function Nav({
  title, onPrev, onNext, canNext, onToday, showToday
}: {
  title: string
  onPrev: () => void
  onNext: () => void
  canNext: boolean
  onToday?: () => void
  showToday?: boolean
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button
        className="h-9 w-9 shrink-0 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"
        onClick={onPrev} aria-label="이전"
      >‹</button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-bold text-stone-900">{title}</span>
        {showToday && onToday && (
          <button
            className="shrink-0 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100"
            onClick={onToday}
          >
            오늘로
          </button>
        )}
      </div>

      <button
        className="h-9 w-9 shrink-0 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-30"
        disabled={!canNext} onClick={onNext} aria-label="다음"
      >›</button>
    </div>
  )
}
