import { useEffect, useState } from 'react'
import { Section } from './ui'
import {
  statOverview, statDaily, statWho, statUse, statReturn, statDemand,
  type Overview, type DailyRow, type WhoStat, type UseRow,
  type ReturnStat, type DemandRow, type Bucket
} from '../lib/stats'

/**
 * 관리자 화면.
 *
 * 짐작으로 만들지 않으려고 둔다. 어떤 암종이 실제로 들어오시는지,
 * 처음 설정에서 얼마나 나가시는지, 다시 오시는지 — 이런 것은 보지 않으면 알 수 없다.
 *
 * 다만 여기 나오는 것은 사람이 아니라 집계다. 다섯 명 미만인 칸은 서버가 아예
 * 내주지 않는다. "50대 여성 담도암 1명" 은 통계가 아니라 특정 개인이기 때문이다.
 * 개별 사용자를 들여다보는 화면은 만들지 않는다 — 만들 수 있는데 안 만드는 것이
 * 아니라, 그런 데이터를 서버에 두지 않았다.
 */

const EVENT_LABEL: Record<string, string> = {
  open: '앱 열기',
  onboard_done: '처음 설정 마침',
  menu_build: '하루치 추천',
  menu_retry: '다시 구성',
  menu_take: '추천 담기',
  food_add: '음식 담기',
  food_search: '음식 찾기',
  diary_write: '기록 남기기',
  report_view: '주간·월간 보고',
  supp_filter: '영양제 거르기',
  supp_take: '영양제 표시',
  howto_view: '사용법',
  guide_view: '가이드',
  inquiry: '문의'
}

function pct(kept: number, base: number): string {
  return base ? `${Math.round((kept / base) * 100)}%` : '—'
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] font-semibold text-stone-500">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums text-stone-900">{value}</p>
      {sub && <p className="text-[10px] text-stone-400">{sub}</p>}
    </div>
  )
}

/** 가로 막대 — 칸마다 몇인지 눈으로 견주게 한다 */
function Bars({ rows, unit = '명' }: { rows: { k: string; n: number }[]; unit?: string }) {
  if (!rows.length) return <p className="px-3.5 py-3 text-[11px] text-stone-400">아직 보여 드릴 만큼 모이지 않았습니다.</p>
  const max = Math.max(...rows.map((r) => r.n), 1)
  return (
    <ul className="space-y-1.5 px-3.5 py-3">
      {rows.map((r) => (
        <li key={r.k} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-[11px] text-stone-600">{r.k}</span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
            <span className="block h-full rounded-full bg-brand-500"
              style={{ width: `${Math.max(3, (r.n / max) * 100)}%` }} />
          </span>
          <span className="w-14 shrink-0 text-right text-[11px] font-bold tabular-nums text-stone-700">
            {r.n.toLocaleString()}{unit}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** 날짜별 접속 — 잔 막대로 흐름만 본다 */
function Spark({ rows }: { rows: DailyRow[] }) {
  if (!rows.length) return null
  const max = Math.max(...rows.map((r) => r.active), 1)
  return (
    <div className="px-3.5 py-3">
      <div className="flex h-20 items-end gap-[2px]">
        {rows.map((r) => (
          <div key={r.day} className="group relative flex-1" title={`${r.day} · 접속 ${r.active} · 신규 ${r.new}`}>
            <div className="w-full rounded-t bg-brand-500/80"
              style={{ height: `${Math.max(2, (r.active / max) * 80)}px` }} />
            {r.new > 0 && (
              <div className="w-full rounded-b bg-accent-500"
                style={{ height: `${Math.max(2, (r.new / max) * 80)}px` }} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
        <span>{rows[0]?.day.slice(5)}</span>
        <span className="flex gap-2.5">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-brand-500" />접속</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-accent-500" />신규</span>
        </span>
        <span>{rows.at(-1)?.day.slice(5)}</span>
      </div>
    </div>
  )
}

export function Admin() {
  const [ov, setOv] = useState<Overview | null>(null)
  const [daily, setDaily] = useState<DailyRow[]>([])
  const [who, setWho] = useState<WhoStat | null>(null)
  const [use, setUse] = useState<UseRow[]>([])
  const [ret, setRet] = useState<ReturnStat | null>(null)
  const [dem, setDem] = useState<DemandRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const [o, d, w, u, r, m] = await Promise.all([
          statOverview(), statDaily(30), statWho(), statUse(30), statReturn(), statDemand(30)
        ])
        if (!live) return
        setOv(o); setDaily(d ?? []); setWho(w); setUse(u ?? []); setRet(r); setDem(m ?? [])
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : '불러오지 못했습니다.')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => { live = false }
  }, [])

  if (loading) return <p className="card p-4 text-sm text-stone-500">불러오는 중…</p>

  if (err || !ov) {
    return (
      <div className="card p-4">
        <p className="text-sm font-semibold text-stone-800">통계를 불러오지 못했습니다.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
          {err ?? '관리자 권한이 없거나, supabase/stats.sql 을 아직 실행하지 않으셨습니다.'}
        </p>
      </div>
    )
  }

  const funnel = (n: string) => use.find((u) => u.k === n)?.users ?? 0
  const opened = funnel('open')

  return (
    <div>
      <Section title="한눈에" desc="동의하신 분들의 익명 집계입니다. 개인을 들여다보는 화면은 없습니다.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="전체" value={ov.total.toLocaleString()} sub={`계정 만드심 ${ov.signed_in}`} />
          <Stat label="30일 신규" value={ov.new_30.toLocaleString()} sub={`7일 ${ov.new_7}`} />
          <Stat label="오늘 접속" value={ov.dau.toLocaleString()} sub={`주 ${ov.wau} · 월 ${ov.mau}`} />
          <Stat label="답 못 드린 문의" value={ov.open_inq.toLocaleString()} />
        </div>
      </Section>

      <Section title="흐름" desc="최근 30일">
        <div className="card overflow-hidden"><Spark rows={daily} /></div>
      </Section>

      <Section
        title="다시 오시는지"
        desc="처음 오신 날로부터 그만큼 시간이 흐른 분들만 셉니다. 오늘 오신 분은 30일 칸에 들어가지 않습니다."
      >
        <div className="grid grid-cols-3 gap-2">
          {ret && ([['다음 날', ret.d1], ['일주일 뒤', ret.d7], ['한 달 뒤', ret.d30]] as const).map(([l, v]) => (
            <Stat key={l} label={l} value={pct(v.kept, v.base)} sub={`${v.kept} / ${v.base}명`} />
          ))}
        </div>
      </Section>

      <Section
        title="어떤 분들이 오시는지"
        desc="다섯 명 미만인 칸은 서버가 내주지 않습니다 — 그 정도로 잘게 쪼개면 통계가 아니라 특정 개인이 됩니다."
      >
        <div className="space-y-2.5">
          {([
            ['암종', who?.cancer], ['치료 시기', who?.phase],
            ['연령대', who?.age], ['성별', who?.sex], ['체격', who?.bmi]
          ] as [string, Bucket[] | undefined][]).map(([label, rows]) => (
            <div key={label} className="card overflow-hidden">
              <p className="border-b border-stone-100 px-3.5 py-2 text-[11px] font-bold text-stone-700">{label}</p>
              <Bars rows={rows ?? []} />
            </div>
          ))}
          {!!who?.hidden && (
            <p className="text-[10px] text-stone-400">
              사람 수가 적어 가려진 암종 {who.hidden}종이 더 있습니다.
            </p>
          )}
        </div>
      </Section>

      <Section
        title="어디서 멈추시는지"
        desc="처음 설정을 마치지 못하고 나가시면 그 뒤는 아예 일어나지 않습니다. 가장 먼저 볼 자리입니다."
      >
        <div className="card overflow-hidden">
          <Bars
            rows={[
              { k: '앱 열기', n: opened },
              { k: '설정 마침', n: funnel('onboard_done') },
              { k: '추천 받기', n: funnel('menu_build') },
              { k: '식단 담기', n: funnel('food_add') },
              { k: '기록 남기기', n: funnel('diary_write') }
            ]}
          />
          {opened > 0 && (
            <p className="border-t border-stone-100 px-3.5 py-2 text-[10px] leading-relaxed text-stone-500">
              앱을 여신 {opened}명 중 {funnel('onboard_done')}명이 설정을 마치셨습니다
              ({pct(funnel('onboard_done'), opened)}).
            </p>
          )}
        </div>
      </Section>

      <Section title="무엇을 쓰시는지" desc="최근 30일 · 사람 수 기준">
        <div className="card overflow-hidden">
          <Bars rows={use.map((u) => ({ k: EVENT_LABEL[u.k] ?? u.k, n: u.users }))} />
        </div>
      </Section>

      <Section
        title="어떤 영양제가 필요하신지"
        desc="근거 규칙이 실제로 권고한 횟수입니다. 무엇이 팔릴지가 아니라 무엇이 필요한지를 보는 자리입니다."
      >
        <div className="card overflow-hidden">
          <Bars rows={dem.map((d) => ({ k: d.k, n: (d.rec ?? 0) + (d.short ?? 0) }))} unit="건" />
          <p className="border-t border-stone-100 px-3.5 py-2 text-[10px] leading-relaxed text-stone-500">
            앞의 숫자는 상황을 보고 권고한 것이고, 여기에 기록에서 실제로 모자랐던 것이 더해져 있습니다.
            뒤쪽이 근거가 더 단단합니다 — 짐작이 아니라 이미 일어난 일이기 때문입니다.
          </p>
        </div>
      </Section>
    </div>
  )
}
