/**
 * 날짜 다루기.
 *
 * 기록은 'YYYY-MM-DD' 문자열을 열쇠로 쓴다. 시간대 문제로 날짜가 하루 밀리는 일을
 * 막기 위해 UTC 가 아니라 그 지역의 연·월·일을 그대로 쓴다.
 */

export type DayKey = string

export function toKey(d: Date = new Date()): DayKey {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export const today = () => toKey()

/** 오늘로부터 며칠 전인지 (오늘 0, 어제 1) */
export function daysAgo(k: DayKey): number {
  const a = fromKey(k).getTime()
  const b = fromKey(today()).getTime()
  return Math.round((b - a) / 86400000)
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** "8월 21일 (목)" 또는 "오늘" */
export function label(k: DayKey, short = false): string {
  const ago = daysAgo(k)
  if (ago === 0) return '오늘'
  if (ago === 1) return '어제'
  if (ago === 2) return '그저께'
  const d = fromKey(k)
  return short
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`
}

export function weekday(k: DayKey): string {
  return WEEKDAY[fromKey(k).getDay()]
}

/** 그 날이 속한 주의 일요일부터 7일 */
export function weekOf(k: DayKey): DayKey[] {
  const d = fromKey(k)
  d.setDate(d.getDate() - d.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d)
    x.setDate(d.getDate() + i)
    return toKey(x)
  })
}

/** 그 달의 모든 날 */
export function monthOf(k: DayKey): DayKey[] {
  const d = fromKey(k)
  const year = d.getFullYear()
  const month = d.getMonth()
  const last = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: last }, (_, i) => toKey(new Date(year, month, i + 1)))
}

/** 달력 격자용 — 앞뒤 빈칸을 포함한 6주치 */
export function calendarGrid(k: DayKey): (DayKey | null)[] {
  const days = monthOf(k)
  const firstDow = fromKey(days[0]).getDay()
  const cells: (DayKey | null)[] = Array(firstDow).fill(null)
  cells.push(...days)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function monthLabel(k: DayKey): string {
  const d = fromKey(k)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

export function addMonths(k: DayKey, n: number): DayKey {
  const d = fromKey(k)
  d.setMonth(d.getMonth() + n, 1)
  return toKey(d)
}
