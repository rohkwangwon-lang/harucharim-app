import { useState } from 'react'
import { hasConsent, setConsent } from '../lib/stats'

/**
 * 통계 수집 동의.
 *
 * 개인정보보호법 제23조는 건강에 관한 정보를 '민감정보' 로 두고, 다른 개인정보와
 * 뭉뚱그린 동의로는 처리하지 못하게 한다. 별도로, 무엇을 어디에 쓰는지 알리고 받아야 한다.
 * 그리고 동의하지 않으셔도 서비스는 그대로 되어야 한다 — 거절하면 못 쓰게 만드는 것은
 * 동의가 아니라 강요이고, 같은 법이 그것도 금지한다.
 *
 * 그래서 기본을 꺼 두고, 무엇이 나가고 무엇이 나가지 않는지 다 적었다.
 * 짧게 쓰고 싶었지만, 짧게 쓰면 결국 "동의합니다" 만 남는다.
 */
export function StatsConsent() {
  const [on, setOn] = useState(hasConsent())
  const [open, setOpen] = useState(false)

  function toggle() {
    const next = !on
    setConsent(next)
    setOn(next)
  }

  return (
    <div className="card mb-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-stone-800">이용 통계 보내기</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            어떤 분들이 무엇을 어려워하시는지 알아야 고칠 수 있습니다.
            <strong className="text-stone-600"> 보내지 않으셔도 모든 기능을 그대로 쓰실 수 있습니다.</strong>
          </p>
        </div>
        <button
          role="switch"
          aria-checked={on}
          aria-label="이용 통계 보내기"
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-stone-300'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      <button
        className="mt-2.5 text-[11px] font-semibold text-brand-700 underline underline-offset-2"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '접기' : '무엇이 나가고 무엇이 나가지 않는지 보기'}
      </button>

      {open && (
        <div className="mt-2.5 space-y-2.5 rounded-xl bg-stone-50 p-3">
          <div>
            <p className="text-[11px] font-bold text-stone-700">나가는 것</p>
            <ul className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-stone-600">
              <li>· 암종, 치료 시기, 성별</li>
              <li>· 연령대 (55세 → <strong>50대</strong>), 체격 구간 (60 kg·163 cm → <strong>정상</strong>)</li>
              <li>· 증상과 복용 약의 <strong>가짓수</strong>만 (무엇인지는 보내지 않습니다)</li>
              <li>· 어느 화면을 하루에 몇 번 쓰셨는지</li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-700">나가지 않는 것</p>
            <ul className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-stone-600">
              <li>· 이름, 이메일, 로그인 계정 — 통계는 계정과 이어지지 않습니다</li>
              <li>· 드신 음식, 체중 숫자, 나이 숫자</li>
              <li>· 어떤 증상이 있으신지, 어떤 약을 드시는지</li>
            </ul>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">
            기기에서 만든 무작위 번호 하나로만 묶습니다. 그 번호로는 누구인지 되짚을 수 없고,
            카카오·구글 계정과도 이어지지 않습니다. 만든 사람이 보는 것도 개인이 아니라 집계이며,
            다섯 명 미만인 칸은 아예 나오지 않습니다.
          </p>
          <p className="text-[11px] leading-relaxed text-stone-500">
            언제든 이 스위치를 끄시면 <strong>이미 올라간 것까지 지웁니다.</strong>
            건강에 관한 정보는 개인정보보호법 제23조의 민감정보라 따로 여쭙습니다.
          </p>
        </div>
      )}
    </div>
  )
}
