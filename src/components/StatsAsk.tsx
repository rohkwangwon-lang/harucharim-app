import { useState } from 'react'
import { confirmAdult, isAdultConfirmed } from '../lib/ageGate'
import { setConsent } from '../lib/stats'

/**
 * 통계 동의를 한 번 여쭙는 자리.
 *
 * 스위치를 '내 정보' 깊은 곳에 두고 기본을 꺼 두면, 법은 지키지만 아무도 켜지 않는다.
 * 그러면 무엇을 고쳐야 할지 알 길이 없어진다. 그래서 처음 설정을 마치신 뒤 한 번 여쭙는다.
 *
 * 다만 여쭙는 방식에 지켜야 할 것이 있다.
 *
 * 개인정보보호법 제22조는 동의를 받을 때 각 사항을 구분해 명확히 알리게 하고,
 * 제22조 제5항은 선택 동의를 하지 않았다는 이유로 서비스 제공을 거부하지 못하게 한다.
 * 곧 '거절'이 '동의'만큼 쉽고 잘 보여야 한다. 회색 잔글씨로 밀어 두는 흔한 방식은
 * 형식만 동의이지 실은 동의가 아니다.
 *
 * 그래서 두 단추를 같은 크기로 두고, 거절해도 아무것도 잃지 않는다는 것을 먼저 적는다.
 * 한 번 답하시면 다시 묻지 않는다 — 켜실 때까지 되묻는 것도 같은 종류의 강요다.
 */

const ASKED_KEY = 'harucharim.stats.asked'

export function shouldAsk(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) !== 'yes'
      && localStorage.getItem('harucharim.stats.consent') === null
  } catch { return false }
}

function remember() {
  try { localStorage.setItem(ASKED_KEY, 'yes') } catch { /* 저장이 막힌 브라우저 */ }
}

export function StatsAsk({ onClose }: { onClose: () => void }) {
  /*
   * 여기서 받는 것은 암종·치료 시기 — 개인정보보호법 제23조의 민감정보다.
   * 로그인 화면에서 이미 여쭈었으므로 보통은 확인된 상태이지만,
   * 그 문이 없어지거나 순서가 바뀌어도 민감정보만은 새지 않도록 여기서 한 번 더 본다.
   * '보내지 않기'는 언제나 누르실 수 있다 — 거절을 막는 것은 동의가 아니다.
   */
  const [adult, setAdult] = useState(isAdultConfirmed)

  function answer(yes: boolean) {
    setConsent(yes)
    remember()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-ask-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lift">
        <h2 id="stats-ask-title" className="text-base font-bold text-stone-900">
          어떻게 쓰이는지 알려 주시겠어요?
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          이 앱은 혼자 만들고 있어서, 어느 화면이 불편한지 알 길이 없습니다.
          익명 통계를 보내 주시면 그걸 보고 고칩니다.
        </p>

        <p className="mt-2.5 rounded-xl bg-brand-50 px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-brand-800">
          보내지 않으셔도 <strong>모든 기능을 그대로</strong> 쓰실 수 있습니다.
          어느 쪽을 고르셔도 달라지는 것은 없습니다.
        </p>

        <div className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3">
          <div>
            <p className="text-[11px] font-bold text-stone-700">보내는 것</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
              암종, 치료 시기, 성별, 연령대(55세 → <strong>50대</strong>),
              체격 구간(60 kg → <strong>정상</strong>), 어느 화면을 몇 번 쓰셨는지
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-stone-700">보내지 않는 것</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
              이름·이메일·로그인 계정, 드신 음식, 체중과 나이의 실제 숫자,
              어떤 증상이 있고 어떤 약을 드시는지
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-stone-500">
          계정과 잇지 않고 기기에서 만든 무작위 번호로만 묶습니다.
          만든 사람이 보는 것도 개인이 아니라 집계입니다.
          건강에 관한 정보는 개인정보보호법 제23조의 민감정보라 따로 여쭙습니다.
        </p>

        {/*
          * 두 단추를 같은 크기로 둔다.
          * 거절을 잔글씨로 밀어 두면 형식만 동의이지 실은 동의가 아니다.
          */}
        {!adult && (
          <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
              checked={adult}
              onChange={(e) => { setAdult(e.target.checked); confirmAdult(e.target.checked) }}
            />
            <span className="text-[11px] leading-relaxed text-stone-600">
              <strong className="text-stone-800">만 14세 이상입니다.</strong>{' '}
              건강에 관한 정보라 만 14세 미만은 보호자 동의 없이 보내실 수 없습니다.
            </span>
          </label>
        )}

        <div className="mt-4 flex gap-2">
          {/* 두 단추의 클래스를 똑같이 둔다 — 거절은 막히는 일이 없으므로 disabled 는 여기서 놀지만,
              한쪽에만 붙여 두면 크기가 어긋나고 검사도 그것을 잡는다 */}
          <button className="btn-outline flex-1 disabled:opacity-40" onClick={() => answer(false)}>
            보내지 않기
          </button>
          <button
            className="btn-primary flex-1 disabled:opacity-40"
            disabled={!adult}
            onClick={() => answer(true)}
          >
            보내기
          </button>
        </div>

        <p className="mt-2.5 text-center text-[11px] text-stone-400">
          언제든 내 정보에서 바꾸실 수 있고, 끄시면 이미 보낸 것도 지웁니다.
        </p>
      </div>
    </div>
  )
}
