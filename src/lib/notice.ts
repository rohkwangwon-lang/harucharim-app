import { NOTICES, type Notice } from '../data/notices'
import { today } from './day'

/**
 * 읽음 표시.
 *
 * 공지마다 id 를 두고, 읽으신 id 만 기기에 적어 둔다.
 * "마지막으로 본 날짜" 같은 것으로 두면 공지를 하나 더 올릴 때 앞의 것이 함께 묻힌다.
 */
const READ_KEY = 'harucharim.notices.read'

export function readIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return []
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

export function markRead(id: string) {
  try {
    const next = Array.from(new Set([...readIds(), id]))
    localStorage.setItem(READ_KEY, JSON.stringify(next))
  } catch { /* 저장이 막힌 브라우저 */ }
}

/** 오늘 기준으로 이미 게시된 공지 — 새 것이 위 */
export function posted(day = today()): Notice[] {
  return NOTICES.filter((n) => n.postAt <= day)
    .slice()
    .sort((a, b) => (a.postAt < b.postAt ? 1 : a.postAt > b.postAt ? -1 : 0))
}

/** 아직 안 보신 공지 */
export function unread(day = today()): Notice[] {
  const seen = new Set(readIds())
  return posted(day).filter((n) => !seen.has(n.id))
}

/**
 * 처음 여신 분에게는 지난 공지를 들이밀지 않는다.
 *
 * 오늘 설치하신 분께 두 달 전 개정 안내를 보여 봐야 알 길이 없는 이야기다.
 * 이미 그 내용이 반영된 문서를 처음부터 보시는 것이므로, 지난 것은 읽은 것으로 접어 둔다.
 */
export function skipBacklog() {
  for (const n of posted()) markRead(n.id)
}
