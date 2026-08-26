import { Component, type ReactNode } from 'react'

/**
 * 오류가 나도 화면이 통째로 사라지지 않게 한다.
 *
 * 리액트는 그리는 중에 오류가 나면 화면 전체를 지운다. 아무 말도 없이 하얘진다.
 * 실제로 저장된 값 하나가 어긋났을 때 이 앱이 그랬다 —
 * 오류 문구도 없고, 되돌릴 단추도 없고, 무엇을 해야 하는지도 알 수 없었다.
 *
 * 심사자가 이 화면을 만나면 그 자리에서 반려다.
 * 그보다 중한 것은, 항암 중에 앱을 열었다가 흰 화면을 보신 분이
 * "내 기록이 다 날아갔나" 하고 생각하시는 일이다. 실제로는 그대로 있다.
 *
 * 그래서 두 가지를 한다 — 무슨 일이 있었는지 알리고, 나갈 길을 준다.
 */

interface Props { children: ReactNode }
interface State { err: Error | null }

export class Guard extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(err: Error): State {
    return { err }
  }

  componentDidCatch(err: Error) {
    /*
     * 콘솔에는 남긴다. 서버로 보내지는 않는다 —
     * 오류 내용에 무엇이 담겨 있을지 알 수 없고, 이 앱의 건강 정보는 기기 안에 있다.
     */
    console.error('[하루차림] 화면을 그리다 멈췄습니다', err)
  }

  render() {
    const { err } = this.state
    if (!err) return this.props.children

    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-lg font-bold text-stone-900">화면을 여는 중에 멈췄습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          적어 두신 <strong>식단·체중·설정은 그대로 있습니다.</strong> 이 기기 안에 저장되어 있어
          이 오류로 사라지지 않습니다.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button className="btn-primary w-full" onClick={() => location.reload()}>
            다시 열기
          </button>
          {/*
            * 다시 열어도 같은 자리에서 멈추는 경우가 있다.
            * 그때는 오늘 화면만 비우면 대개 지나간다 — 기록은 건드리지 않는다.
            */}
          <button
            className="btn-outline w-full text-sm"
            onClick={() => {
              try {
                sessionStorage.clear()
                localStorage.removeItem('harucharim.stats.queue')
              } catch { /* 저장이 막힌 브라우저 */ }
              location.reload()
            }}
          >
            그래도 안 되면 — 화면만 비우고 다시 열기
          </button>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-stone-400">
          같은 일이 되풀이되면 알려 주세요. 아래 내용을 함께 보내 주시면 찾기 쉽습니다.
        </p>
        <p className="mt-1.5 select-all break-all rounded-lg bg-stone-100 px-2.5 py-2 font-mono text-[10px] text-stone-600">
          {err.message || String(err)}
        </p>
      </div>
    )
  }
}
