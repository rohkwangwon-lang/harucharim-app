import { useEffect, useRef, useState } from 'react'
import { track } from '../lib/stats'

/**
 * 움직이는 사용법(2026-10-23 사용자 요청) — 처음 등록부터 식단·장보기·영양제까지, 손가락이 눌러 가며 보여 준다.
 *
 * 실제 화면을 녹화하지 않고, 화면을 본뜬 작은 그림을 React 로 그린다.
 *  - 화면이 바뀌어도 녹화를 다시 할 필요가 없고, 파일이 무겁지 않으며(오프라인에서도 열린다),
 *  - 글자·단추 이름을 실제 화면과 같은 말로 둘 수 있다(설명서 검사 howto.ts 가 이 파일도 대조한다).
 * 장면(scene)마다 박자(beat)가 있고, 박자마다 '손가락 위치·누름·자막·화면 상태' 를 적는다.
 * 움직임을 줄여 달라고 한 기기(prefers-reduced-motion)에서는 손가락이 미끄러지지 않고 바로 옮겨 간다.
 */
export const TOUR_SEEN_KEY = 'harucharim.tour.seen'

type Screen =
  | { kind: 'login'; done?: boolean }
  | { kind: 'onb'; step: 1 | 2 | 3 | 4; picked?: string; typed?: boolean }
  | { kind: 'app'; tab: TabId; view: View; f?: Partial<Record<Flag, boolean>> }
type TabId = '내 식단' | '추천' | '찾기' | '기록' | '영양제' | '가이드' | '내 정보'
type View = 'days' | 'plan' | 'peek' | 'shop' | 'diary' | 'compose' | 'supp' | 'image'
type Flag = 'days3' | 'alt' | 'pantryOpen' | 'tofuHome' | 'bought' | 'copied' | 'typed' | 'added' | 'half' | 'saved' | 'taken'

interface Beat {
  /** 자막 — 화면 아래에 크게 */
  say: string
  /** 손가락 위치(화면 안 %). 없으면 손가락을 치운다 */
  at?: [number, number]
  /** 이 박자에서 누른다 */
  tap?: boolean
  screen: Screen
  /** 이 박자를 보여 주는 시간(ms). 기본 2400 */
  ms?: number
}

interface Scene { title: string; beats: Beat[] }

const SCENES: Scene[] = [
  {
    title: '시작하기',
    beats: [
      { say: '카카오나 구글 단추를 누르면 로그인됩니다. 처음이면 그 자리에서 가입됩니다.', at: [50, 24], screen: { kind: 'login' } },
      { say: '아이디를 따로 만들지 않습니다.', at: [50, 24], tap: true, screen: { kind: 'login' } },
      { say: '로그인되었습니다. 이제 몇 가지만 알려 주시면 됩니다.', at: [66, 93], screen: { kind: 'login', done: true } },
      { say: '다음을 누릅니다.', at: [66, 93], tap: true, screen: { kind: 'login', done: true }, ms: 1600 }
    ]
  },
  {
    title: '내 정보 등록',
    beats: [
      { say: '어떤 암으로 치료받고 계신지 고릅니다. 여기서 고른 것에 따라 모든 추천이 달라집니다.', at: [28, 20], screen: { kind: 'onb', step: 1 } },
      { say: '유방암을 골랐습니다.', at: [28, 20], tap: true, screen: { kind: 'onb', step: 1, picked: '유방암' } },
      { say: '지금 어느 단계인지 — 방사선치료 중, 항암 중, 수술 후, 치료를 마쳤습니다 가운데 고릅니다.', at: [50, 21], tap: true, screen: { kind: 'onb', step: 2, picked: '방사선치료 중' } },
      { say: '체중·키·나이를 넣으면 BMI 와 하루 목표 열량이 바로 보입니다.', at: [28, 24], tap: true, screen: { kind: 'onb', step: 3 } },
      { say: '숫자를 잘못 넣었는지도 여기서 알 수 있습니다.', screen: { kind: 'onb', step: 3, typed: true } },
      { say: '드시고 싶은 요리 계통을 고르고 시작하기를 누르면 준비가 끝납니다.', at: [66, 93], tap: true, screen: { kind: 'onb', step: 4, picked: '한식' } }
    ]
  },
  {
    title: '식단 추천',
    beats: [
      { say: '아래 추천 탭을 누릅니다.', at: [21, 96], tap: true, screen: { kind: 'app', tab: '내 식단', view: 'compose' } },
      { say: '며칠치를 받을지 고릅니다. 1일부터 5일까지, 3일을 골라 봅니다.', at: [43, 11], screen: { kind: 'app', tab: '추천', view: 'days' } },
      { say: '날마다 다른 상이 나오고, 생선·고기가 든 날은 앞에 옵니다.', at: [43, 11], tap: true, screen: { kind: 'app', tab: '추천', view: 'plan', f: { days3: true } } },
      { say: '마음에 들지 않으면 다시 구성을 누르세요. 같은 영양 목표로 다른 조합을 짭니다.', at: [84, 33], tap: true, screen: { kind: 'app', tab: '추천', view: 'plan', f: { days3: true, alt: true } } }
    ]
  },
  {
    title: '이 날 자세히',
    beats: [
      { say: '한 날의 이유와 영양이 궁금하면 이 날 자세히를 누릅니다.', at: [72, 62], tap: true, screen: { kind: 'app', tab: '추천', view: 'plan', f: { days3: true, alt: true } } },
      { say: '끼니마다 왜 이 음식인지, 어떤 권고와 근거에 따른 것인지 보입니다.', at: [26, 10], screen: { kind: 'app', tab: '추천', view: 'peek' } },
      { say: '돌아가기를 누르면 며칠치 화면으로 돌아옵니다.', at: [26, 10], tap: true, screen: { kind: 'app', tab: '추천', view: 'peek' }, ms: 1800 },
      { say: '고른 안은 그대로 남아 있습니다.', screen: { kind: 'app', tab: '추천', view: 'plan', f: { days3: true, alt: true } }, ms: 1800 }
    ]
  },
  {
    title: '장보기 목록',
    beats: [
      { say: '아래에 장보기 목록이 있습니다. 1인분 기준 양과 흔한 포장 단위, 냉장 보관 기간이 함께 적힙니다.', screen: { kind: 'app', tab: '추천', view: 'shop' } },
      { say: '집에 있는 재료를 누르고, 냉장고에 있는 것을 고르세요.', at: [20, 11], tap: true, screen: { kind: 'app', tab: '추천', view: 'shop', f: { pantryOpen: true } } },
      { say: '두부가 집에 있다고 하면 목록에서 빠지고, 두부를 쓰는 요리를 먼저 짭니다.', at: [28, 24], tap: true, screen: { kind: 'app', tab: '추천', view: 'shop', f: { pantryOpen: true, tofuHome: true } } },
      { say: '장을 보면서 산 것을 누르면 줄이 그어집니다.', at: [16, 25], tap: true, screen: { kind: 'app', tab: '추천', view: 'shop', f: { tofuHome: true, bought: true } } },
      { say: '복사나 보내기로 메모·카톡에 옮길 수 있습니다.', at: [76, 17], tap: true, screen: { kind: 'app', tab: '추천', view: 'shop', f: { tofuHome: true, bought: true, copied: true } } }
    ]
  },
  {
    title: '식단에 담기·기록',
    beats: [
      { say: '날짜별로 내 식단에 담기를 누르면 3일치가 날짜마다 기록에 들어갑니다.', at: [50, 85], tap: true, screen: { kind: 'app', tab: '추천', view: 'plan', f: { days3: true, alt: true } } },
      { say: '기록 탭에서 날짜를 누르면 그날 식단이 보입니다. 체중도 여기서 적습니다.', at: [79, 20], tap: true, screen: { kind: 'app', tab: '기록', view: 'diary', f: { taken: true } } },
      { say: '내 식단에서는 양을 바꾸거나 음식을 빼고, 찾기에서 다른 음식을 더할 수 있습니다.', at: [84, 22], tap: true, screen: { kind: 'app', tab: '내 식단', view: 'compose', f: { taken: true } } },
      { say: '반 공기로 줄였습니다. 하루 합계가 바로 다시 계산됩니다.', screen: { kind: 'app', tab: '내 식단', view: 'compose', f: { taken: true, half: true } } }
    ]
  },
  {
    title: '영양제',
    beats: [
      { say: '드시는 영양제는 영양제 탭에서 제품명으로 찾아 등록합니다.', at: [64, 96], tap: true, screen: { kind: 'app', tab: '내 식단', view: 'compose', f: { taken: true, half: true } } },
      { say: '오메가3 를 찾아 봅니다.', at: [50, 13], tap: true, screen: { kind: 'app', tab: '영양제', view: 'supp', f: { typed: true } } },
      { say: '등록하면 치료·약과 겹치는 것이 있는지 바로 알려 줍니다.', at: [84, 27], tap: true, screen: { kind: 'app', tab: '영양제', view: 'supp', f: { typed: true, added: true } } },
      { say: '영양제 양은 하루 합계에도 함께 들어갑니다.', screen: { kind: 'app', tab: '영양제', view: 'supp', f: { typed: true, added: true } }, ms: 1800 }
    ]
  },
  {
    title: '식단표 저장·인쇄',
    beats: [
      { say: '추천 화면의 식단표 저장은 날짜 × 끼니 표를 큰 글씨 그림으로 만듭니다. 냉장고에 붙이거나 가족에게 보내세요.', at: [30, 22], tap: true, screen: { kind: 'app', tab: '추천', view: 'plan', f: { days3: true, alt: true } } },
      { say: '인쇄는 그 표와 장보기 목록을 A4 한 장에 맞춰 뽑습니다.', screen: { kind: 'app', tab: '추천', view: 'image', f: { saved: true } }, ms: 3000 },
      { say: '준비 끝. 더 자세한 것은 가이드 탭의 사용법에 글로 적혀 있습니다.', screen: { kind: 'app', tab: '가이드', view: 'image' }, ms: 3000 }
    ]
  }
]

const TABS: TabId[] = ['내 식단', '추천', '찾기', '기록', '영양제', '가이드', '내 정보']
const DEFAULT_MS = 2400

export function Tour({ onClose }: { onClose: () => void }) {
  const [scene, setScene] = useState(0)
  const [beat, setBeat] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [ended, setEnded] = useState(false)
  const timer = useRef<number | null>(null)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const cur = SCENES[scene].beats[beat]
  const total = SCENES.reduce((n, s) => n + s.beats.length, 0)
  const index = SCENES.slice(0, scene).reduce((n, s) => n + s.beats.length, 0) + beat

  const go = (s: number, b: number) => {
    if (s >= SCENES.length) { setEnded(true); setPlaying(false); track('tour_done'); return }
    setEnded(false); setScene(s); setBeat(b)
  }
  const next = () => { if (beat + 1 < SCENES[scene].beats.length) go(scene, beat + 1); else go(scene + 1, 0) }
  const prevScene = () => { setEnded(false); setPlaying(false); go(Math.max(0, beat === 0 ? scene - 1 : scene), 0) }
  const nextScene = () => { setPlaying(false); go(scene + 1, 0) }

  useEffect(() => { track('tour_open') }, [])
  useEffect(() => {
    if (!playing || ended) return
    timer.current = window.setTimeout(next, cur.ms ?? DEFAULT_MS)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, beat, playing, ended])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') { setPlaying(false); next() }
      else if (e.key === 'ArrowLeft') prevScene()
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, beat])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/75 p-3" role="dialog" aria-modal="true" aria-label="움직이는 사용법">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-2 flex w-full items-center justify-between text-white">
          <p className="text-sm font-bold">{ended ? '사용법 끝' : `${scene + 1}. ${SCENES[scene].title}`}</p>
          <button className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25" onClick={onClose}>닫기 ✕</button>
        </div>

        {/* 전화기 */}
        <div className="relative w-[270px] overflow-hidden rounded-[26px] border-[6px] border-stone-800 bg-stone-50 shadow-2xl" style={{ height: 'min(500px, 58vh)' }}>
          {ended ? <Ending onReplay={() => { setEnded(false); setPlaying(true); go(0, 0) }} /> : <Phone screen={cur.screen} />}
          {!ended && cur.at && (
            <div
              className={`tour-finger pointer-events-none absolute z-20 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-700/50 shadow-lg ${reduce ? '' : 'transition-all duration-500 ease-in-out'}`}
              style={{ left: `${cur.at[0]}%`, top: `${cur.at[1]}%` }}
              aria-hidden
            >
              {cur.tap && <span key={index} className="tour-tap absolute inset-0 rounded-full border-2 border-brand-500" />}
            </div>
          )}
        </div>

        {/* 자막 */}
        <p key={index} className="tour-in mt-3 min-h-[3.5rem] w-full rounded-xl bg-white px-3.5 py-2.5 text-center text-[13.5px] font-semibold leading-relaxed text-stone-800" aria-live="polite">
          {ended ? '가이드 탭 → 사용법에서 언제든 다시 보실 수 있습니다.' : cur.say}
        </p>

        {/* 조작 */}
        <div className="mt-2.5 flex w-full items-center justify-between gap-2">
          <button className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/25" onClick={prevScene} aria-label="이전 장면">‹ 이전</button>
          <button className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-stone-900 shadow" onClick={() => { if (ended) { setEnded(false); go(0, 0) } setPlaying((p) => !p) }} aria-label={playing ? '멈춤' : '재생'}>
            {ended ? '다시 보기' : playing ? '❚❚ 멈춤' : '▶ 재생'}
          </button>
          <button className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/25" onClick={nextScene} aria-label="다음 장면">다음 ›</button>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5" aria-hidden>
          {SCENES.map((s, i) => (
            <button key={s.title} className={`h-2 rounded-full transition-all ${i === scene && !ended ? 'w-5 bg-white' : 'w-2 bg-white/40'}`} onClick={() => { setPlaying(false); go(i, 0) }} title={s.title} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-white/60">{ended ? `${total}장면` : `${index + 1} / ${total}`} · 화면을 본뜬 그림입니다</p>
      </div>
    </div>
  )
}

/* ─────────────────────────── 본뜬 화면 ─────────────────────────── */

function Phone({ screen }: { screen: Screen }) {
  if (screen.kind === 'login') return <Login done={!!screen.done} />
  if (screen.kind === 'onb') return <Onb step={screen.step} picked={screen.picked} typed={!!screen.typed} />
  return (
    <div className="flex h-full flex-col text-[10px] text-stone-800">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full bg-brand-600" />
          <div><p className="text-[11px] font-bold leading-tight">하루차림</p><p className="text-[8px] text-stone-500">암 환자를 위한 식이·영양 도우미</p></div>
        </div>
        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[8px] font-bold text-brand-800">유방암<br />오늘</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-2.5 py-2">
        <AppView view={screen.view} f={screen.f ?? {}} />
      </div>
      <div className="grid grid-cols-7 border-t border-stone-200 bg-white py-1.5 text-center text-[7.5px]">
        {TABS.map((t) => (
          <div key={t} className={t === screen.tab ? 'font-bold text-brand-700' : 'text-stone-400'}>
            <div className={`mx-auto mb-0.5 h-3 w-3 rounded ${t === screen.tab ? 'bg-brand-600' : 'bg-stone-300'}`} />{t}
          </div>
        ))}
      </div>
    </div>
  )
}

function Frame({ step, title, children, cta, disabled }: { step: number; title: string; children: React.ReactNode; cta: string; disabled?: boolean }) {
  const steps = ['로그인', '암종', '치료 시기', '몸 상태', '식성', '알게 된 경로']
  return (
    <div className="flex h-full flex-col bg-stone-50 text-[10px] text-stone-800">
      <div className="px-3 pt-3">
        <div className="flex items-baseline justify-between"><p className="text-[11px] font-bold">하루차림 시작하기</p><span className="text-[8px] text-stone-400">{step + 1} / 6</span></div>
        <div className="mt-1.5 grid grid-cols-6 gap-0.5">
          {steps.map((s, i) => <div key={s}><div className={`h-0.5 rounded ${i <= step ? 'bg-brand-500' : 'bg-stone-200'}`} /><p className={`mt-0.5 text-[6.5px] ${i === step ? 'font-bold text-brand-700' : 'text-stone-400'}`}>{s}</p></div>)}
        </div>
      </div>
      <div className="flex-1 px-3 pt-3">
        <p className="text-[13px] font-bold leading-snug">{title}</p>
        <div className="mt-2.5">{children}</div>
      </div>
      <div className="flex gap-1.5 px-3 pb-3">
        {step > 0 && <div className="flex-1 rounded-lg bg-stone-200 py-2 text-center font-semibold text-stone-600">이전</div>}
        <div className={`flex-[2] rounded-lg py-2 text-center font-bold text-white ${disabled ? 'bg-brand-300' : 'bg-brand-600'}`}>{cta}</div>
      </div>
    </div>
  )
}

function Login({ done }: { done: boolean }) {
  return (
    <Frame step={0} title="하루차림을 시작합니다" cta={done ? '다음' : '로그인이 필요합니다'} disabled={!done}>
      {done ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-2.5">
          <p className="font-bold text-brand-800">홍길동 님, 반갑습니다</p>
          <p className="mt-0.5 text-[9px] text-stone-600">로그인되었습니다. 다음 단계에서 몇 가지만 알려주시면 준비가 끝납니다.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[9px] text-stone-500">먼저 로그인해 주세요.</p>
          <div className="rounded-lg bg-[#fee500] py-2 text-center font-bold text-stone-900">카카오로 시작하기</div>
          <div className="rounded-lg border border-stone-300 bg-white py-2 text-center font-bold">구글로 시작하기</div>
          <p className="pt-1 text-center text-[8.5px] text-stone-500">카카오·구글 계정이 없으신가요? <b>이메일로 하기</b></p>
        </div>
      )}
    </Frame>
  )
}

function Onb({ step, picked, typed }: { step: 1 | 2 | 3 | 4; picked?: string; typed: boolean }) {
  const chip = (t: string, on: boolean) => <div key={t} className={`rounded-lg border px-2 py-1.5 text-center font-semibold ${on ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 bg-white'}`}>{t}</div>
  if (step === 1) return (
    <Frame step={1} title="어떤 암으로 치료받고 계신가요?" cta="다음" disabled={!picked}>
      <div className="grid grid-cols-2 gap-1.5">{['유방암', '위암', '대장암', '폐암', '간암', '전립선암', '췌장암', '두경부암'].map((t) => chip(t, t === picked))}</div>
    </Frame>
  )
  if (step === 2) return (
    <Frame step={2} title="지금 어느 단계에 계신가요?" cta="다음">
      <div className="space-y-1.5">{['방사선치료 중', '항암치료 중', '수술 후 회복', '치료를 마쳤습니다'].map((t) => chip(t, t === picked))}</div>
    </Frame>
  )
  if (step === 3) return (
    <Frame step={3} title="몸 상태를 알려주세요" cta="다음">
      <div className="grid grid-cols-3 gap-1.5">
        {[['체중', typed ? '58 kg' : ''], ['키', typed ? '160 cm' : ''], ['나이', typed ? '55' : '']].map(([k, v]) => (
          <div key={k}><p className="text-[8px] text-stone-500">{k}</p><div className="mt-0.5 h-6 rounded-md border border-stone-300 bg-white px-1.5 leading-6">{v}</div></div>
        ))}
      </div>
      {typed && <div className="mt-2.5 rounded-lg bg-brand-50 px-2 py-1.5 text-[9px] text-brand-900"><b>BMI 22.7</b> 정상 · 하루 목표 <b>1,740 kcal</b> · 단백질 <b>70~87 g</b></div>}
    </Frame>
  )
  return (
    <Frame step={4} title="어떤 음식으로 식단을 짤까요?" cta="시작하기">
      <div className="grid grid-cols-3 gap-1.5">{['한식', '양식', '중식', '일식', '동남아식'].map((t) => chip(t, t === picked))}</div>
      <p className="mt-2 text-[8.5px] text-stone-500">한식은 늘 나옵니다. 고른 계통은 상에 더 자주 오릅니다.</p>
    </Frame>
  )
}

const PLAN_A = [
  ['금 10/24', ['현미밥 반 공기 · 두부부침 · 배', '귀리 우유죽 · 된장찌개 · 단호박', '잡곡밥 · 닭안심 청경채 두부볶음 · 단감']],
  ['토 10/25', ['보리밥 · 시금치계란말이 · 사과', '흑미밥 · 된장찌개 · 콩자반 · 배', '현미밥 · 꽃게(찐 것) · 오리고기(구이)']],
  ['일 10/26', ['잡곡밥 · 두부조림 · 키위', '보리밥 · 닭가슴살 · 단감 · 두유', '흑미밥 · 미역국 · 버섯 두부계란찜']]
] as const
const PLAN_B = [
  ['금 10/24', ['들깨 두부죽 · 두부부침 · 배', '현미밥 · 소고기 양지(삶은 것) · 오렌지', '잡곡밥 · 연어 케일 참깨무침 · 단감']],
  ['토 10/25', ['보리밥 · 콩자반 · 사과', '귀리 우유죽 · 무국 · 계란말이', '흑미밥 · 대구 두부 맑은찜 · 브로콜리']],
  ['일 10/26', ['현미밥 · 달걀(삶은 것) · 락토프리 우유', '쌀밥 · 새우(데친 것) · 단호박', '잡곡밥 · 무국 · 꽃게(찐 것) · 포도']]
] as const

function AppView({ view, f }: { view: View; f: Partial<Record<Flag, boolean>> }) {
  const Chip = ({ t, on }: { t: string; on?: boolean }) => <span className={`rounded-full border px-1.5 py-0.5 text-[8.5px] ${on ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 bg-white text-stone-600'}`}>{t}</span>
  const Days = () => (
    <div className="mb-2 flex items-center gap-1"><span className="text-[8.5px] font-bold text-stone-600">며칠치</span>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} t={`${n}일`} on={f.days3 ? n === 3 : n === 1} />)}</div>
  )
  const plan = f.alt ? PLAN_B : PLAN_A
  const Cards = ({ detail }: { detail?: boolean }) => (
    <div className="space-y-1.5">
      {plan.map(([d, meals], i) => (
        <div key={d} className="rounded-lg border border-stone-200 bg-white px-2 py-1.5">
          <p className="font-bold"><span className="mr-1 rounded bg-brand-100 px-1 text-[7.5px] text-brand-800">{i + 1}일째</span>{d}</p>
          {(['아침', '점심', '저녁'] as const).map((s, k) => <p key={s} className="truncate text-[8.5px]"><span className="mr-1 font-semibold text-stone-400">{s}</span>{meals[k]}</p>)}
          {detail && <p className="text-right text-[8px] font-semibold text-brand-700">이 날 자세히(이유·영양) ›</p>}
        </div>
      ))}
    </div>
  )
  if (view === 'compose') return (
    <div>
      <p className="text-[11px] font-bold">{f.taken ? '오늘 · 금 10/24' : '오늘'}</p>
      {f.taken ? (
        <div className="mt-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1.5">
          <p className="font-bold text-stone-500">아침</p>
          {[['현미밥', f.half ? '½ 공기' : '1 공기'], ['두부부침', '1 접시'], ['배', '½ 개']].map(([n, q]) => (
            <div key={n} className="flex items-center justify-between py-0.5"><span>{n}</span><span className="rounded border border-stone-300 px-1.5 text-[8px]">− {q} +</span></div>
          ))}
          <p className="mt-1 text-right text-[8px] text-stone-500">하루 합계 {f.half ? '1,690' : '1,760'} kcal · 단백질 {f.half ? 84 : 86} g</p>
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-dashed border-stone-300 bg-white px-2 py-4 text-center text-stone-500">아직 담으신 것이 없습니다.<br />추천에서 하루치를 받아 보세요.</div>
      )}
    </div>
  )
  if (view === 'days') return <div><Days /><div className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-2"><p className="text-[8px] font-bold uppercase text-brand-700">하루(24시간) 전체</p><p className="font-bold">유방암 · 가을철 추천 식단</p></div></div>
  if (view === 'plan') return (
    <div>
      <Days />
      <div className="mb-1.5 flex items-start justify-between rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5">
        <div><p className="text-[8px] font-bold uppercase text-brand-700">3일치 식단 · 1인분</p><div className="mt-1 flex gap-1"><Chip t="집에 있는 재료" /><Chip t="식단표 저장" /><Chip t="인쇄" /></div></div>
        <span className="rounded-md border border-brand-600 bg-white px-1.5 py-1 text-[8px] font-bold text-brand-700">⟳ 다시 구성</span>
      </div>
      <Cards detail />
      <div className="mt-1.5 rounded-lg bg-brand-600 py-1.5 text-center font-bold text-white">3일치 27가지를 날짜별로 내 식단에 담기</div>
    </div>
  )
  if (view === 'peek') return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5"><span className="rounded-lg bg-brand-600 px-2 py-1 font-bold text-white">← 3일치로 돌아가기</span><span className="text-[8px] text-stone-500">2일째 · 토 10/25</span></div>
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5"><p className="text-[8px] font-bold uppercase text-brand-700">하루(24시간) 전체</p><p className="font-bold">유방암 · 가을철 추천 식단</p><p className="text-[8px] text-stone-600">오늘은 <b>단백질을 채우는 것</b>을 가장 크게 반영했습니다</p></div>
      <div className="mt-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1.5">
        <p className="font-bold text-stone-500">아침 <span className="font-normal">420 kcal</span></p>
        <p className="font-semibold">보리밥 <span className="rounded bg-stone-100 px-1 text-[7.5px] font-normal">밥 반 공기</span></p>
        <p className="font-semibold">시금치계란말이 <span className="rounded bg-brand-100 px-1 text-[7.5px] font-normal text-brand-800">단백질 12 g 보충</span></p>
        <p className="text-[8px] text-stone-500">이유 보기 › 치료 중 단백질 1.2~1.5 g/kg (ESPEN 2021) <span className="rounded border px-0.5">근거 A</span></p>
      </div>
      <div className="mt-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5"><p className="font-bold text-stone-500">점심</p><p className="font-semibold">흑미밥 · 된장찌개 · 콩자반 · 배</p></div>
    </div>
  )
  if (view === 'shop') {
    const items = [['채소', ['시금치 200 g (1단)', '청경채 80 g', '단호박 150 g (¼개)']], ['두류', f.tofuHome ? [] : ['두부 300 g (1모)']], ['육류', ['닭안심 100 g', '오리고기 80 g']], ['어패류', ['꽃게 2마리']]] as const
    return (
      <div>
        <div className="mb-1.5 flex gap-1"><Chip t={f.tofuHome ? '집에 있는 재료 1' : '집에 있는 재료'} on={!!f.tofuHome} /><Chip t="식단표 저장" /><Chip t="인쇄" /></div>
        {f.pantryOpen && (
          <div className="mb-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1.5">
            <p className="text-[8px] text-stone-500">냉장고에 있는 것을 누르세요.</p>
            <div className="mt-1 flex flex-wrap gap-1">{['달걀', '두부', '양파', '대파', '당근', '감자', '배추김치'].map((t) => <Chip key={t} t={t} on={t === '두부' && !!f.tofuHome} />)}</div>
          </div>
        )}
        <div className="flex items-center justify-between"><p className="font-bold">장보기 목록 <span className="font-normal text-stone-500">3일 · {f.tofuHome ? 24 : 25}가지</span></p><div className="flex gap-1"><span className={`rounded border px-1.5 py-0.5 text-[8px] ${f.copied ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-stone-300'}`}>복사</span><span className="rounded border border-stone-300 px-1.5 py-0.5 text-[8px]">보내기</span></div></div>
        {f.copied && <p className="mt-1 rounded bg-brand-50 px-1.5 py-0.5 text-[8px] text-brand-800">복사했습니다 — 메모·카톡에 붙여 넣으세요</p>}
        <div className="mt-1 space-y-1">
          {items.filter(([, its]) => its.length).map(([cat, its]) => (
            <div key={cat} className="rounded-lg border border-stone-200 bg-white px-2 py-1">
              <p className="text-[8px] font-bold text-stone-600">{cat}</p>
              {its.map((t, i) => {
                const done = f.bought && cat === '채소' && i === 0
                return <p key={t} className={`flex items-center gap-1 py-0.5 ${done ? 'text-stone-400 line-through' : ''}`}><span className={`inline-block h-2.5 w-2.5 rounded-sm border ${done ? 'border-brand-600 bg-brand-600' : 'border-stone-400'}`} />{t}{cat !== '채소' && <span className="rounded bg-warn-50 px-0.5 text-[7px] text-warn-700">냉장 {cat === '어패류' ? '2~4일' : '1~2일'}</span>}</p>
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (view === 'diary') return (
    <div>
      <p className="text-[11px] font-bold">10월</p>
      <div className="mt-1.5 grid grid-cols-7 gap-0.5 text-center text-[8px]">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => <p key={d} className="text-stone-400">{d}</p>)}
        {Array.from({ length: 14 }, (_, i) => i + 19).map((d) => <div key={d} className={`rounded py-1 ${d === 24 ? 'bg-brand-600 font-bold text-white' : 'bg-white'}`}>{d}{[24, 25, 26].includes(d) && f.taken && <span className={`mx-auto mt-0.5 block h-1 w-1 rounded-full ${d === 24 ? 'bg-white' : 'bg-brand-500'}`} />}</div>)}
      </div>
      <div className="mt-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5"><p className="font-bold">그날 체중</p><div className="mt-1 flex gap-1"><div className="h-6 flex-1 rounded border border-stone-300 px-1.5 leading-6 text-stone-400">kg</div><span className="rounded bg-stone-200 px-2 leading-6">저장</span></div></div>
      <div className="mt-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1.5"><p className="font-bold">그날 식단 <span className="font-normal text-stone-500">금 10/24 · 9가지</span></p><p className="text-[8.5px]">아침 현미밥 · 두부부침 · 배</p><p className="text-[8.5px]">점심 귀리 우유죽 · 된장찌개 · 단호박</p><p className="text-[8.5px]">저녁 잡곡밥 · 닭안심 청경채 두부볶음 · 단감</p></div>
    </div>
  )
  if (view === 'supp') return (
    <div>
      <p className="text-[11px] font-bold">영양제</p>
      <div className="mt-1.5 h-7 rounded-lg border border-stone-300 bg-white px-2 leading-7">{f.typed ? '오메가3' : <span className="text-stone-400">제품명으로 검색 — 예: 락토핏, 오메가3</span>}</div>
      {f.typed && !f.added && <div className="mt-1.5 flex items-center justify-between rounded-lg border border-stone-200 bg-white px-2 py-1.5"><span><b>오메가3</b> (EPA·DHA 1,000 mg)</span><span className="rounded bg-brand-600 px-2 py-0.5 font-bold text-white">추가</span></div>}
      {f.added && (
        <div className="mt-1.5 rounded-lg border border-warn-200 bg-warn-50 px-2 py-1.5">
          <p className="font-bold">오메가3 <span className="rounded bg-warn-500 px-1 text-[7.5px] text-white">주의</span></p>
          <p className="mt-0.5 text-[8.5px] text-stone-700">항혈전제와 함께 드시면 출혈 경향이 커질 수 있습니다. 수술 전후에는 의료진과 상의하세요.</p>
          <p className="mt-0.5 text-[8px] text-stone-500">근거 B · 하루 합계에 포함</p>
        </div>
      )}
    </div>
  )
  /* image */
  return (
    <div>
      {f.saved && <p className="mb-1.5 rounded bg-brand-50 px-1.5 py-1 text-[8.5px] text-brand-800">식단표 그림을 저장했습니다</p>}
      <div className="rounded-md border border-stone-300 bg-white p-1.5">
        <p className="text-[7px] font-bold text-brand-700">하루차림 식단표</p>
        <p className="text-[9px] font-bold">10/24(금) ~ 10/26(일) · 3일치</p>
        <table className="mt-1 w-full border-collapse text-[6.5px]">
          <thead><tr>{['날짜', '아침', '점심', '저녁'].map((h) => <th key={h} className="border border-stone-300 bg-brand-600 px-0.5 py-0.5 text-white">{h}</th>)}</tr></thead>
          <tbody>{PLAN_B.map(([d, m]) => <tr key={d}><th className="border border-stone-300 bg-brand-50 px-0.5 text-left text-[8px]">{d.slice(0, 1)}</th>{m.map((x) => <td key={x} className="border border-stone-300 px-0.5 align-top leading-tight">{x.replace(/ · /g, '\n')}</td>)}</tr>)}</tbody>
        </table>
        {!f.saved && <><p className="mt-1 text-[8px] font-bold">장보기 · 25가지</p><div className="grid grid-cols-3 gap-1 text-[6px] leading-tight"><p>□ 시금치 200 g<br />□ 청경채 80 g<br />□ 단호박 150 g</p><p>□ 두부 300 g (1모)<br />□ 닭안심 100 g<br />□ 오리고기 80 g</p><p>□ 꽃게 2마리<br />□ 배 2개<br />□ 단감 1개</p></div></>}
      </div>
      <p className="mt-1 text-center text-[8px] text-stone-500">{f.saved ? '냉장고에 붙이거나 보내세요' : 'A4 한 장'}</p>
    </div>
  )
}

function Ending({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-brand-50 px-5 text-center">
      <span className="h-12 w-12 rounded-full bg-brand-600" />
      <p className="mt-3 text-base font-bold text-stone-900">준비 끝</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-stone-600">처음 등록 → 추천 → 장보기 → 담기 → 영양제 → 식단표까지 보셨습니다.</p>
      <button className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white" onClick={onReplay}>처음부터 다시</button>
    </div>
  )
}
