/**
 * 예전 이름으로 저장된 것을 새 이름으로 옮긴다.
 *
 * 이 앱의 건강 정보는 전부 기기 안에만 있다. 서버에 사본이 없으므로,
 * 저장소 열쇠 이름을 바꾸는 순간 이미 쓰시던 분의 설정·식단·체중이
 * 통째로 사라진다. 화면에는 아무 오류도 뜨지 않고, 그냥 처음 설정부터 다시 나온다.
 * 무엇이 없어졌는지조차 모르신다.
 *
 * 그래서 이름을 바꾸기 전에 이것부터 만든다.
 * 앱이 저장소를 건드리기 전에 딱 한 번 돌아야 하므로 main.tsx 맨 앞에서 부른다.
 *
 * 옮긴 뒤에는 예전 열쇠를 지운다. 남겨 두면 다음에 이 파일을 보는 사람이
 * 둘 중 어느 쪽이 진짜인지 알 수 없게 된다.
 * 다만 옮기다 실패하면 지우지 않는다 — 반쯤 옮긴 채로 지우는 것이 가장 나쁘다.
 */

const OLD = 'oncofood.'
const NEW = 'harucharim.'

/** 옮긴 적이 있는지 — 두 번 돌아도 해가 없지만, 굳이 매번 훑지 않는다 */
const DONE = `${NEW}migrated`

export function migrateStorage(): void {
  try {
    if (localStorage.getItem(DONE)) return

    const olds = Object.keys(localStorage).filter((k) => k.startsWith(OLD))
    for (const k of olds) {
      const v = localStorage.getItem(k)
      if (v === null) continue
      const to = NEW + k.slice(OLD.length)
      /* 새 열쇠에 이미 값이 있으면 그쪽이 최신이다 — 덮어쓰지 않는다 */
      if (localStorage.getItem(to) === null) localStorage.setItem(to, v)
    }

    /* 전부 옮겨진 것을 확인한 뒤에만 지운다 */
    const moved = olds.every((k) => localStorage.getItem(NEW + k.slice(OLD.length)) !== null)
    if (moved) for (const k of olds) localStorage.removeItem(k)

    localStorage.setItem(DONE, '1')
  } catch {
    /*
     * 저장이 막힌 브라우저(사파리 프라이빗 등).
     * 옮기지 못했을 뿐이고, 앱은 새 열쇠로 처음부터 시작한다.
     */
  }
}
