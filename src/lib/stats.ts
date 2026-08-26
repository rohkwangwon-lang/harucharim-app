import { supabase } from './supabase'
import type { PatientContext } from '../data/types'
import { CANCER_BY_ID } from '../data/cancers'

/**
 * 이용 통계.
 *
 * 이 앱이 다루는 것은 암종·치료 시기·체중이다. 개인정보보호법 제23조가 말하는
 * 민감정보(건강에 관한 정보)라서, 다른 개인정보와 달리 '별도의 동의' 없이는
 * 처리 자체가 금지된다. 동의를 뭉뚱그려 받는 것도 안 된다.
 *
 * 그래서 이렇게 짓는다.
 *
 *  · 기본은 꺼져 있다. 켜기 전에는 한 줄도 나가지 않는다.
 *  · 계정과 잇지 않는다. 기기에서 만든 무작위 번호만 쓴다 —
 *    카카오·구글 계정과 이어지지 않으므로 누구인지 되짚을 수 없다.
 *  · 원본을 보내지 않는다. 55세는 '50대' 로, 60 kg 는 '정상' 으로 뭉갠다.
 *    식단 내용·체중 수치·증상 이름은 아예 보내지 않는다.
 *
 * 통계가 없으면 무엇을 고쳐야 할지 모른 채 짐작으로 만들게 된다.
 * 다만 그 필요가 환자분의 건강 정보를 원본으로 쌓을 이유는 되지 못한다.
 */

const PID_KEY = 'harucharim.stats.pid'
const SOURCE_KEY = 'harucharim.stats.source'
const CONSENT_KEY = 'harucharim.stats.consent'
const QUEUE_KEY = 'harucharim.stats.queue'
const SENT_KEY = 'harucharim.stats.sentOn'

/** 앱이 세는 것들 — 여기 없는 이름은 보내지 않는다 */
export const EVENTS = [
  'open',            // 앱을 여심
  'onboard_done',    // 처음 설정을 마치심
  'menu_build',      // 하루치 추천을 받으심
  'menu_retry',      // 다시 구성
  'menu_take',       // 추천을 식단에 담으심
  'food_add',        // 음식을 담으심
  'food_search',     // 찾기를 쓰심
  'diary_write',     // 기록을 남기심
  'report_view',     // 주간·월간 보고를 보심
  'supp_filter',     // 영양제를 걸러 보심
  'supp_take',       // 드시는 영양제로 표시하심
  'howto_view',      // 사용법을 보심
  'guide_view',      // 가이드를 보심
  'inquiry'          // 문의를 남기심
] as const

export type EventName = (typeof EVENTS)[number]

export function hasConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === 'yes' } catch { return false }
}

export function setConsent(on: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, on ? 'yes' : 'no')
    if (!on) {
      /* 거두시면 이미 올라간 것도 지운다 — 개인정보보호법 제37조 */
      const pid = localStorage.getItem(PID_KEY)
      if (pid && supabase) void supabase.rpc('of_forget', { p_pid: pid })
      localStorage.removeItem(PID_KEY)
      localStorage.removeItem(QUEUE_KEY)
      localStorage.removeItem(SENT_KEY)
      localStorage.removeItem(SOURCE_KEY)
    }
  } catch { /* 저장이 막힌 브라우저 — 통계만 안 될 뿐 앱은 그대로 쓰신다 */ }
}

function pid(): string | null {
  if (!hasConsent()) return null
  try {
    let v = localStorage.getItem(PID_KEY)
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(PID_KEY, v) }
    return v
  } catch { return null }
}

/* ── 어떻게 알게 되셨는지 ────────────────────────────────
 *
 * 처음에는 링크 뒤 ?from=... 으로 받으려 했는데, 카페마다 링크를 따로 만들어
 * 관리하는 일이 번거롭고, 무엇보다 주소창 글자를 그대로 받으면
 * 누가 ?from=010-1234-5678 을 붙이는 순간 신원 단서가 된다.
 *
 * 처음 설정에서 직접 여쭙는 편이 낫다. 고르는 항목이 정해져 있으니
 * 아예 다른 값이 들어올 수 없고, 링크를 따로 만들지 않아도 된다.
 * 카페 이름까지는 모르지만 '어느 갈래에서 오시는가' 는 알 수 있고,
 * 홍보처를 정하는 데는 그 정도면 충분하다.
 */
export const SOURCES = [
  { id: 'cafe',   label: '암 환우 카페·커뮤니티' },
  { id: 'search', label: '인터넷 검색' },
  { id: 'sns',    label: '블로그·SNS' },
  { id: 'video',  label: '유튜브·영상' },
  { id: 'person', label: '아는 분 소개' },
  { id: 'clinic', label: '병원·의료진' },
  { id: 'etc',    label: '그 밖에' }
] as const

export type SourceId = (typeof SOURCES)[number]['id']

const SOURCE_IDS: readonly string[] = SOURCES.map((s) => s.id)

/** 정해진 항목이 아니면 버린다 — 앱이 잘못 보내도 서버에 이상한 값이 남지 않게 */
export function cleanSource(raw: string | null): SourceId | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  return SOURCE_IDS.includes(v) ? (v as SourceId) : null
}

export function setSource(id: string) {
  try {
    const v = cleanSource(id)
    if (v) localStorage.setItem(SOURCE_KEY, v)
    else localStorage.removeItem(SOURCE_KEY)
  } catch { /* 저장이 막힌 브라우저 */ }
}

export function getSource(): SourceId | null {
  try { return cleanSource(localStorage.getItem(SOURCE_KEY)) } catch { return null }
}

/* ── 뭉개기 ──────────────────────────────────────────────
 *
 * 나이와 체중을 그대로 두면 암종·성별과 맞물려 사람이 특정된다.
 * "1965년생 여성 담도암" 은 한 병원에 한 분일 수 있다.
 */

export function ageBand(age: number): string {
  if (!Number.isFinite(age) || age <= 0) return '40대'
  if (age >= 80) return '80대 이상'
  const d = Math.floor(age / 10) * 10
  return `${Math.max(10, Math.min(80, d))}대`
}

export function bmiBand(weightKg: number, heightCm: number): string {
  const m = heightCm / 100
  if (!m || !weightKg) return '정상'
  const b = weightKg / (m * m)
  /* 대한비만학회 기준 — 아시아인은 서구 기준보다 낮은 값에서 위험이 오른다 */
  if (b < 18.5) return '저체중'
  if (b < 23) return '정상'
  if (b < 25) return '과체중'
  return '비만'
}

/* ── 모았다 보내기 ───────────────────────────────────────
 *
 * 누를 때마다 보내면 서버 왕복이 잦고, 무엇보다 시각까지 남아
 * 그 자체가 사람을 따라다니는 기록이 된다. 하루에 한 번, 세어서 보낸다.
 */

type Queue = { [K in EventName]?: number }
type Demand = { category: string; level: 'recommend' | 'consider' | 'shortfall'; n: number }

function readQueue(): Queue {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}') } catch { return {} }
}

export function track(name: EventName, n = 1) {
  if (!hasConsent()) return
  try {
    const q = readQueue()
    q[name] = (q[name] ?? 0) + n
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch { /* 저장이 막혔으면 세지 못할 뿐이다 */ }
}

let pendingDemand: Demand[] = []

/** 어떤 영양제 분류가 권고되었는지 — 사람에 붙이지 않는 집계 */
export function trackDemand(rows: Demand[]) {
  if (!hasConsent() || !rows.length) return
  pendingDemand = rows
}

function sentToday(): boolean {
  const d = new Date().toISOString().slice(0, 10)
  try { return localStorage.getItem(SENT_KEY) === d } catch { return false }
}

/**
 * 하루에 한 번 올린다.
 *
 * 실패해도 조용히 넘어간다. 통계가 안 올라가는 것은 사용자의 문제가 아니므로
 * 화면에 오류를 띄우지 않는다.
 */
export async function flush(patient: PatientContext, signedIn: boolean, provider: string | null) {
  const id = pid()
  if (!id || !supabase || sentToday()) return

  const q = readQueue()
  const events = Object.keys(q).length ? q : null
  const demand = pendingDemand.length ? pendingDemand : null
  const cancer = CANCER_BY_ID[patient.cancer]?.name ?? null

  try {
    const { error } = await supabase.rpc('of_track', {
      p_pid: id,
      p_cancer: cancer,
      p_phase: patient.phase ?? null,
      p_sex: patient.sex ?? null,
      p_age_band: ageBand(patient.age),
      p_bmi_band: bmiBand(patient.weightKg, patient.heightCm),
      p_subtypes: patient.subtypes ?? [],
      p_cond_n: (patient.conditions ?? []).length,
      p_med_n: (patient.medications ?? []).length,
      p_signed_in: signedIn,
      p_provider: provider,
      p_source: getSource(),
      p_version: __APP_VERSION__,
      p_events: events,
      p_demand: demand
    })
    if (error) return
    localStorage.setItem(SENT_KEY, new Date().toISOString().slice(0, 10))
    localStorage.removeItem(QUEUE_KEY)
    pendingDemand = []
  } catch { /* 인터넷이 없거나 서버가 자는 중 — 내일 다시 보낸다 */ }
}

/* ── 관리자가 보는 쪽 ───────────────────────────────────── */

export interface Overview {
  total: number; signed_in: number; new_7: number; new_30: number
  dau: number; wau: number; mau: number; open_inq: number
}
export interface DailyRow { day: string; active: number; new: number }
export interface Bucket { k: string; n: number }
export interface UseRow { k: string; n: number; users: number }
export interface DemandRow { k: string; rec: number; short: number }
export interface SourceRow { k: string; n: number; kept7: number; base7: number }
export interface WhoStat {
  cancer: Bucket[]; phase: Bucket[]; age: Bucket[]
  sex: Bucket[]; bmi: Bucket[]; hidden: number
}
export interface ReturnStat {
  d1: { base: number; kept: number }
  d7: { base: number; kept: number }
  d30: { base: number; kept: number }
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return (data ?? null) as T | null
}

export const statOverview = () => rpc<Overview>('of_stat_overview')
export const statDaily = (days = 30) => rpc<DailyRow[]>('of_stat_daily', { p_days: days })
export const statWho = () => rpc<WhoStat>('of_stat_who')
export const statUse = (days = 30) => rpc<UseRow[]>('of_stat_use', { p_days: days })
export const statReturn = () => rpc<ReturnStat>('of_stat_return')
export const statDemand = (days = 30) => rpc<DemandRow[]>('of_stat_demand', { p_days: days })
export const statSource = () => rpc<SourceRow[]>('of_stat_source')
