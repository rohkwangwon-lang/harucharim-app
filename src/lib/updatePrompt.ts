import { registerSW } from 'virtual:pwa-register'

/**
 * 새 버전 안내.
 *
 * 서비스워커는 새 버전을 받아 두고도 이미 열려 있는 화면은 건드리지 않는다.
 * 그래서 앱을 설치해 둔 분에게는 갱신이 한참 뒤에야 보인다.
 * 자동으로 새로고침하면 입력 중이던 내용이 날아갈 수 있으니, 알리고 선택하게 한다.
 */
export function setupUpdatePrompt() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showBanner(() => updateSW(true))
    }
  })
}

function showBanner(onUpdate: () => void) {
  if (document.getElementById('harucharim-update')) return

  const bar = document.createElement('div')
  bar.id = 'harucharim-update'
  bar.style.cssText = [
    'position:fixed', 'left:12px', 'right:12px', 'bottom:80px', 'z-index:60',
    'max-width:640px', 'margin:0 auto',
    'display:flex', 'align-items:center', 'gap:10px',
    'padding:12px 14px', 'border-radius:14px',
    /*
     * 색은 지금 디자인(brand-600 솔잎빛)에서 가져온다.
     * 이 배너는 화면 밖에서 만들어지므로 Tailwind 를 못 쓰고 값을 적어야 하는데,
     * 그래서 디자인을 바꿀 때 여기만 예전 청록으로 남아 있었다.
     */
    'background:#4b6936', 'color:#fff',
    'box-shadow:0 6px 24px rgba(75,105,54,.35)',
    'font-size:13px', 'line-height:1.45'
  ].join(';')

  const text = document.createElement('span')
  text.style.flex = '1'
  text.textContent = '새 버전이 준비되었습니다.'

  const btn = document.createElement('button')
  btn.textContent = '지금 갱신'
  btn.style.cssText =
    'flex-shrink:0;padding:6px 12px;border:0;border-radius:9px;background:#fff;color:#4b6936;font-weight:700;font-size:12px;cursor:pointer'
  btn.onclick = onUpdate

  const later = document.createElement('button')
  later.textContent = '나중에'
  later.setAttribute('aria-label', '나중에 갱신')
  later.style.cssText =
    'flex-shrink:0;padding:6px 8px;border:0;background:transparent;color:rgba(255,255,255,.75);font-size:12px;cursor:pointer'
  later.onclick = () => bar.remove()

  bar.append(text, btn, later)
  document.body.appendChild(bar)
}
