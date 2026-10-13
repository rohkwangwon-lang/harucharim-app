/**
 * 몸 수치를 받는 칸의 잣대.
 *
 * 2026-10-13 의 무작위 입력 시험이 찾았다. 체중·키·나이 칸은 친 값을 그대로 저장했다 —
 * 키에 0 을 넣으면 BMI 가 "Infinity" 로 뜨고, 나이에 1000 을 넣으면 1000세로 목표 열량을 셈했다.
 * "60" 을 치는 도중의 "6" 도 그대로 저장되어, 한 글자 칠 때마다 6 kg 짜리 환자의 식단이 그려졌다.
 * 앱을 다시 열 때는 걸러 읽지만(lib/store.ts 의 restoreState), 쓰는 동안에는 아무것도 막지 않았다.
 *
 * 범위는 한 군데에만 적는다. 저장 자료를 읽을 때와 손으로 칠 때의 잣대가 다르면,
 * 친 값이 저장됐다가 다음에 열 때 "잘못된 값" 으로 버려진다.
 */
export const BODY_LIMITS = {
  weightKg: { min: 20, max: 300 },
  heightCm: { min: 100, max: 230 },
  age: { min: 1, max: 120 }
} as const

export type BodyField = keyof typeof BODY_LIMITS

/**
 * 칸에 친 글자를 숫자로 읽는다. 범위 밖이거나 숫자가 아니면 null — 저장하지 않는다는 뜻이다.
 *
 * 전각 숫자("６０")는 반각으로 바꿔 읽는다(한글 자판에서 실제로 들어온다). "60kg" 처럼 단위가 붙은 것,
 * "1e3" 같은 지수 표기는 받지 않는다 — 무엇을 뜻하는지 짐작해서 저장하지 않는다.
 */
export function parseInRange(text: string, limit: { min: number; max: number }, integer = false): number | null {
  const t = text.trim().replace(/[０-９．]/g, (c) => (c === '．' ? '.' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)))
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < limit.min || n > limit.max) return null
  if (integer && !Number.isInteger(n)) return null
  /* 소수 둘째 자리부터는 버린다 — 체중계가 그보다 자세하지 않다 */
  return Math.round(n * 10) / 10
}

/** 범위를 벗어났을 때 칸 아래에 보여 줄 말 */
export function rangeHint(limit: { min: number; max: number }, unit: string): string {
  return `${limit.min}~${limit.max} ${unit} 사이로 적어 주세요`
}
