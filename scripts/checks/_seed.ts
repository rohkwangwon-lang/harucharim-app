/**
 * 난수 씨앗을 환경변수에서 읽는다.
 *
 * 씨앗 네 개를 따로 넘겨 네 개를 동시에 돌리려다, 셸이 변수를 쪼개지 않아
 * "183735980 877291417 1256061865 1961053458" 이 통째로 한 씨앗으로 넘어간 적이 있다.
 * Number() 는 그것을 NaN 으로 만들고, 비트 연산이 NaN 을 0 으로 바꿔서 **아무 말 없이 돌았다.**
 * 네 번 돌린 줄 알았는데 한 번이었다. 숫자가 아니면 여기서 멈춘다.
 */
export function envSeed(fallback: number): number {
  const raw = process.env.SEED
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`SEED 가 0 이상의 정수가 아닙니다: "${raw}" — 씨앗은 한 번에 하나씩 넘기십시오`)
  }
  return n
}
