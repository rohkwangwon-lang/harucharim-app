import { useEffect, useState } from 'react'
import { DeleteAccount } from './components/DeleteAccount'
import { REVIEW_MODE } from './config'
import { useAppState } from './lib/store'
import { CANCER_BY_ID } from './data/cancers'
import type { MealSlot } from './data/types'
import { Onboarding } from './components/Onboarding'
import { PatientPanel } from './components/PatientPanel'
import { FoodSearch } from './components/FoodSearch'
import { Supplements } from './components/Supplements'
import { TodayMeals } from './components/TodayMeals'
import { RecommendedMenu } from './components/RecommendedMenu'
import { Diary } from './components/Diary'
import { IconDiary, IconGuide, IconMe, IconMeal, IconPill, IconSearch, IconSuggest, Logo } from './components/icons'
import { label as dayLabel, today } from './lib/day'
import { CancerGuide } from './components/CancerGuide'
import { EvidenceGuide } from './components/EvidenceGuide'
import { HowTo } from './components/HowTo'
import { Exercise } from './components/Exercise'
import { DataManager } from './components/DataManager'
import { InquiryDialog } from './components/InquiryDialog'
import { AdminInquiries } from './components/AdminInquiries'
import { AdminPage } from './components/Admin'
import { StatsConsent } from './components/StatsConsent'
import { track, flush } from './lib/stats'
import { StatsAsk, shouldAsk } from './components/StatsAsk'
import { checkAdmin } from './lib/inquiry'
import { displayName, useSession, lastProvider } from './lib/auth'
import { isSupabaseConfigured } from './lib/supabase'
import { Credentials } from './components/ui'

/**
 * 탭은 5개로 고정한다.
 * 모바일 하단 탭이 6개를 넘으면 글자가 잘리고 무엇이 어디 있는지 기억하기 어려워진다.
 * 그래서 성격이 비슷한 영양제·운동·가이드는 '관리' 안에서 나눈다.
 */
type Tab = 'compose' | 'diary' | 'suggest' | 'search' | 'supp' | 'care' | 'me'
type CareView = 'howto' | 'exercise' | 'guide' | 'evidence'

/*
 * 하루를 쓰는 순서대로 늘어놓는다.
 *
 * 오늘 무엇을 드실지 짜고(내 식단) → 막히면 추천을 받고 → 없는 것을 찾아 담고 →
 * 지나간 날을 돌아본다(기록). 그 뒤가 가끔 보는 것들이다 —
 * 영양제, 가이드, 마지막이 좀처럼 고칠 일 없는 내 정보.
 *
 * 예전에는 기록이 두 번째였는데, 오늘 식단을 짜다 말고 지난 기록으로 건너뛰는
 * 일은 드물다. 자주 오가는 것끼리 붙여 두는 편이 손가락이 덜 움직인다.
 */
const TABS: { id: Tab; label: string; Icon: typeof IconMeal }[] = [
  { id: 'compose', label: '내 식단', Icon: IconMeal },
  { id: 'suggest', label: '추천', Icon: IconSuggest },
  { id: 'search', label: '찾기', Icon: IconSearch },
  { id: 'diary', label: '기록', Icon: IconDiary },
  { id: 'supp', label: '영양제', Icon: IconPill },
  /*
   * 운동과 암종 가이드는 '내 정보' 안에 있었다.
   * 내 정보는 키·몸무게를 고치고 문의를 넣는 자리인데,
   * 매일 볼 운동 처방과 암종별 식이 지침이 그 아래 숨어 있었다.
   * 성격이 다르므로 따로 낸다.
   */
  { id: 'care', label: '가이드', Icon: IconGuide },
  { id: 'me', label: '내 정보', Icon: IconMe }
]

const CARE_VIEWS: { id: CareView; label: string }[] = [
  /*
   * 화면마다 그 자리에 필요한 말은 적어 두었지만 전체를 한 번에 훑을 데가 없어서,
   * '다시 구성' 이나 주간 보고처럼 눌러 보아야 아는 기능은 있는 줄도 모르고 지나쳤다.
   * 처음 여신 분이 먼저 볼 자리이므로 맨 앞에 둔다.
   */
  { id: 'howto', label: '사용법' },
  { id: 'exercise', label: '운동' },
  { id: 'guide', label: '암종 가이드' },
  /*
   * 이 앱은 판정마다 '근거 A·B·C·G' 를 붙여 놓고 그 뜻을 어디에도 적지 않았다.
   * 마우스를 올려야 보이는 풍선말뿐이라 휴대폰에서는 볼 방법이 없었다.
   */
  { id: 'evidence', label: '근거 등급' }
]

export default function App() {
  const {
    state, day, setDay, selected, setWeight,
    setPatient, adoptName, addFood, setServings, setMeal, removeFood, clearFoods,
    toggleSupplement, completeOnboarding, resetOnboarding, setTextSize,
    rememberShown
  } = useAppState()

  const [tab, setTabState] = useState<Tab>('compose')
  /** 음식 찾기로 넘어갈 때 어느 끼니에 담을지 미리 정해 둔다 */
  const [pendingMeal, setPendingMeal] = useState<MealSlot>('점심')
  const [care, setCare] = useState<CareView>('howto')
  const [toast, setToast] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const { user, loading: sessionLoading } = useSession()

  /*
   * 고르신 글자 크기를 문서에 적용한다.
   * Tailwind 가 rem 을 쓰므로 이 한 줄이 글자·여백·아이콘을 한꺼번에 키운다.
   */
  useEffect(() => {
    const size = state.textSize ?? 'normal'
    if (size === 'normal') document.documentElement.removeAttribute('data-text')
    else document.documentElement.setAttribute('data-text', size)
  }, [state.textSize])
  // 관리자로 등록된 계정으로 로그인하면 문의 관리 화면이 나타난다
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!user) { setIsAdmin(false); return }
    checkAdmin().then(setIsAdmin)
    const n = displayName(user)
    if (n && n !== '사용자') adoptName(n)
  }, [user, adoptName])

  /*
   * 통계 — 동의하신 분만.
   *
   * 열 때 한 번 세고, 하루에 한 번 모아서 올린다.
   * 누를 때마다 보내면 시각까지 남아 그 자체가 사람을 따라다니는 기록이 된다.
   */
  useEffect(() => { track('open') }, [])

  /*
   * 처음 설정을 마치신 뒤 한 번 여쭙는다.
   * 스위치를 '내 정보' 깊은 곳에만 두면 법은 지키지만 아무도 켜지 않고,
   * 그러면 무엇을 고쳐야 할지 알 길이 없어진다.
   */
  const [asking2, setAsking2] = useState(false)

  /*
   * 관리자 페이지는 주소 뒤 #admin 으로만 열린다.
   * 관리자가 아니면 열리지 않고, 흔적도 남기지 않는다 —
   * 남의 기기에서 주소를 쳐 봐도 아무 일도 일어나지 않아야 한다.
   */
  const [adminOpen, setAdminOpen] = useState(false)
  useEffect(() => {
    const sync = () => setAdminOpen(location.hash.replace('#', '') === 'admin')
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const closeAdmin = () => {
    history.replaceState(null, '', location.pathname + location.search)
    setAdminOpen(false)
  }
  useEffect(() => {
    if (state.patient.onboarded && shouldAsk()) {
      const t = setTimeout(() => setAsking2(true), 1200)
      return () => clearTimeout(t)
    }
  }, [state.patient.onboarded])
  useEffect(() => {
    const t = setTimeout(() => {
      void flush(state.patient, Boolean(user), lastProvider())
    }, 4000)
    return () => clearTimeout(t)
  }, [state.patient, user])

  // 탭을 바꿨는데 이전 화면의 스크롤 위치가 남아 있으면 빈 화면처럼 보인다
  const setTab = (next: Tab) => {
    setTabState(next)
    if (next === 'care') track('guide_view')
    if (next === 'search') track('food_search')
    if (next === 'diary') track('diary_write')
    window.scrollTo({ top: 0 })
  }

  const profile = CANCER_BY_ID[state.patient.cancer]
  const selectedIds = new Set<string>(selected.map((x) => x.foodId))

  const handleAdd = (foodId: string, servings: number, meal: MealSlot) => {
    track('food_add')
    addFood(foodId, servings, meal)
    setToast(`${meal}에 담았습니다`)
    setTimeout(() => setToast(null), 1400)
  }

  /*
   * 로그아웃하시면 다시 로그인 화면으로 돌아간다.
   *
   * 첫 실행에서는 로그인을 거쳐야 넘어가게 해 두었는데, 한 번 넘어간 뒤에
   * 로그아웃하면 그대로 앱을 쓸 수 있었다. 들어오는 문만 잠그고 나가는 문은
   * 열어 둔 셈이라, 로그인을 필수로 둔 뜻이 반쯤 없어졌다.
   *
   * 다만 기록을 지우지는 않는다. 다시 로그인하시면 적어 두신 것이 그대로 있다 —
   * 이 앱의 건강 정보는 원래 기기 안에만 있고 서버로 가지 않기 때문이다.
   * 로그인 서버가 설정되지 않은 환경에서는 이 문이 아예 없다.
   */
  const loggedOut = isSupabaseConfigured && !sessionLoading && !user

  // 첫 실행이거나 로그아웃 상태면 다른 화면을 보여주기 전에 로그인부터 받는다
  if (!state.patient.onboarded || loggedOut) {
    return (
      <Onboarding
        patient={state.patient}
        onChange={setPatient}
        onDone={completeOnboarding}
        /* 이미 설정을 마치신 분이 로그아웃만 하신 경우에는 로그인 화면만 보여 준다 */
        loginOnly={state.patient.onboarded === true}
      />
    )
  }

  /* 관리자 페이지 — 앱과 겹치지 않는 별도 화면 */
  if (adminOpen && isAdmin) {
    return (
      <AdminPage onClose={closeAdmin}>
        <AdminInquiries />
      </AdminPage>
    )
  }

  /*
   * 폭.
   *
   * 아이폰에서는 화면이 곧 폭이지만, 아이패드에서는 672 px 이 1,024 px 한가운데
   * 놓여 양옆이 크게 빈다. 그렇다고 끝까지 늘리면 한 줄이 길어져 읽기 나빠진다 —
   * 본문은 한 줄에 65~75자가 편하다. 태블릿부터 한 단계만 넓힌다.
   */
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col md:max-w-3xl">
      <header className="safe-top sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo className="h-9 w-9 shrink-0 text-brand-600" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-stone-900">하루차림</h1>
              <p className="text-[11px] text-stone-500">암 환자를 위한 식이·영양 도우미</p>
            </div>
          </div>
          <button
            onClick={() => setTab('me')}
            className="rounded-xl bg-brand-50 px-3 py-1.5 text-right transition-colors hover:bg-brand-100"
          >
            <span className="block text-xs font-bold text-brand-800">{profile.name}</span>
            <span className="block text-[10px] text-brand-600">
              {day === today() ? '오늘' : dayLabel(day)} · {selected.length}가지
            </span>
          </button>
        </div>
      </header>

      {REVIEW_MODE && <ReviewBanner />}

      <main className="flex-1 px-4 py-4 pb-24">
        {tab === 'compose' && (
          <TodayMeals
            patient={state.patient}
            onPatch={setPatient}
            selected={selected}
            supplements={state.supplements}
            diary={state.diary}
            shown={state.shown}
            weights={state.weights}
            onAddTo={(meal) => { setPendingMeal(meal); setTab('search') }}
            onSetServings={setServings}
            onSetMeal={setMeal}
            onRemove={removeFood}
            onClear={clearFoods}
            onApplySuggestion={(id, meal) => handleAdd(id, 1, meal)}
            onSeeSuggestions={() => setTab('suggest')}
            day={day}
            onBackToToday={() => setDay(today())}
            weight={state.weights[day]}
            onSetWeight={(kg) => setWeight(kg, day)}
          />
        )}

        {tab === 'diary' && (
          <Diary
            patient={state.patient}
            diary={state.diary}
            weights={state.weights}
            day={day}
            supplements={state.supplements}
            onPickDay={setDay}
            onSetWeight={setWeight}
            onGoCompose={() => setTab('compose')}
          />
        )}

        {tab === 'suggest' && (
          <RecommendedMenu
            patient={state.patient}
            selected={selected}
            supplements={state.supplements}
            day={day}
            diary={state.diary}
            shown={state.shown}
            onShown={rememberShown}
            onApply={(id, meal) => handleAdd(id, 1, meal)}
            onApplyAll={(items) => {
              items.forEach((i) => addFood(i.foodId, 1, i.meal))
              setToast(`${items.length}가지를 담았습니다`)
              setTimeout(() => setToast(null), 1600)
              setTab('compose')
            }}
            onPatch={setPatient}
            onGoCompose={() => setTab('compose')}
          />
        )}

        {tab === 'search' && (
          <FoodSearch
            patient={state.patient}
            onAdd={handleAdd}
            selectedIds={selectedIds}
            initialMeal={pendingMeal}
            onDone={() => setTab('compose')}
            onNeedData={() => setTab('me')}
          />
        )}

        {tab === 'supp' && (
          <Supplements
            patient={state.patient}
            taking={state.supplements}
            onToggle={toggleSupplement}
          />
        )}

        {tab === 'care' && (
          <>
            {/*
              * 세 갈래를 고르는 자리.
              *
              * 12 px 에 고르지 않은 쪽이 옅은 회색이라, 지금 무엇을 보고 있는지
              * 한눈에 들어오지 않았다. 배경과의 대비가 3.4 : 1 로 기준(4.5)에 못 미쳤다 —
              * 이 앱을 쓰시는 분 중에는 항암 중 눈이 침침해지신 분도 있다.
              * 글자를 키우고, 고른 쪽은 색을 채워 분명히 하고, 손가락이 닿을 넓이를 준다.
              *
              * '사용법' 이 들어와 네 칸이 되자 375 px 화면에서 '암종 가이드' 가 두 줄로 접혔다.
              * 칸을 균등히 나누는 대신 글자 길이만큼만 차지하게 하고, 모자라면 옆으로 밀리게 둔다.
              * 접힌 글자는 줄 높이가 어긋나 눌러야 할 자리가 흐려진다.
              */}
            <div
              className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl bg-stone-100 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="가이드 종류"
            >
              {CARE_VIEWS.map((v) => (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={care === v.id}
                  onClick={() => { setCare(v.id); window.scrollTo({ top: 0 }) }}
                  className={`flex-1 whitespace-nowrap rounded-xl px-2.5 py-2.5 text-sm font-bold transition-colors ${
                    care === v.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-stone-700 hover:bg-white/70'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {care === 'howto' && <HowTo />}
            {care === 'exercise' && <Exercise patient={state.patient} />}
            {care === 'guide' && <CancerGuide patient={state.patient} />}
            {care === 'evidence' && <EvidenceGuide patient={state.patient} />}
          </>
        )}

        {tab === 'me' && (
          <>
              <>
            {/*
              * 관리자 화면은 앱 안에 섞지 않는다.
              * 환자분이 쓰시는 자리에 운영자용 숫자가 함께 놓이면
              * 언젠가 실수로 노출된다. 그 자리를 아예 만들지 않는 편이 낫다.
              * 관리자 계정으로 로그인했을 때만 이 단추가 보이고, 별도 화면으로 열린다.
              */}
            {isAdmin && (
              <button
                className="btn-outline mb-5 w-full text-xs"
                onClick={() => { location.hash = 'admin'; setAdminOpen(true) }}
              >
                관리자 페이지 열기
              </button>
            )}

            <PatientPanel patient={state.patient} onChange={setPatient} />

            <StatsConsent />

            <DataManager />

            <div className="card mb-5 p-4">
              <h3 className="text-sm font-bold text-stone-800">문의하기</h3>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                찾으시는 음식·영양제가 없거나 내용이 이상하면 알려 주세요. 확인 후 답변드립니다.
              </p>
              {user && (
                <>
                  <p className="mt-2 text-xs text-stone-600">
                    <span className="chip bg-brand-100 text-brand-700">로그인됨</span>{' '}
                    {displayName(user)}
                    {user.email ? ` · ${user.email}` : ''}
                  </p>
                  {!isAdmin && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-stone-400">
                        관리자로 등록하려면
                      </summary>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                        아래 계정 식별자를 <code className="rounded bg-stone-100 px-1">of_admins</code> 표에
                        넣으면 이 계정이 관리자가 됩니다. 카카오 로그인은 이메일을 주지 않아
                        식별자로 등록해야 합니다.
                      </p>
                      <p
                        className="mt-1.5 cursor-pointer select-all break-all rounded-lg bg-stone-100 px-2.5 py-2 font-mono text-[11px] text-stone-700"
                        onClick={() => navigator.clipboard?.writeText(user.id)}
                        title="눌러서 복사"
                      >
                        {user.id}
                      </p>
                    </details>
                  )}
                </>
              )}
              <button className="btn-outline mt-3 w-full text-xs" onClick={() => setAsking(true)}>
                문의 남기기 · 내 문의 보기
              </button>
            </div>
            {/*
              * 글자 크기 고르기.
              *
              * 기본값은 그대로 두고 필요하신 분만 키우신다.
              * 미리보기 문장을 함께 두어, 고르기 전에 얼마나 커지는지 보이게 한다.
              */}
            <div className="card mb-4 p-4">
              <p className="text-sm font-bold text-stone-900">글자 크기</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                눈이 침침하시면 키워 보세요. 글자와 함께 여백도 커지므로 화면이 흐트러지지 않습니다.
              </p>
              <div className="mt-3 flex gap-1.5">
                {([
                  ['normal', '보통'],
                  ['large', '크게'],
                  ['xlarge', '더 크게']
                ] as const).map(([id, label]) => {
                  const on = (state.textSize ?? 'normal') === id
                  return (
                    <button
                      key={id}
                      onClick={() => setTextSize(id)}
                      aria-pressed={on}
                      className={`flex-1 rounded-xl border-2 px-2 py-2.5 font-bold transition-colors ${
                        id === 'normal' ? 'text-sm' : id === 'large' ? 'text-base' : 'text-lg'
                      } ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-200 bg-white text-stone-700'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button className="btn-outline mb-4 w-full" onClick={resetOnboarding}>
              처음부터 다시 설정하기
            </button>

            {/*
              * 계정 삭제.
              *
              * 애플 심사 기준 5.1.1(v) 는 계정을 만들 수 있는 앱에
              * 앱 안에서의 계정 삭제를 요구한다 — 예외가 없다.
              * 개인정보보호법 제36조도 같은 것을 요구한다.
              * 로그인하신 분에게만 보인다.
              */}
            {user && (
              <div className="mb-5">
                <DeleteAccount onDone={() => setTab('compose')} />
              </div>
            )}
            <Disclaimer />
              </>
          </>
        )}
      </main>

      {asking && <InquiryDialog onClose={() => setAsking(false)} />}
      {asking2 && <StatsAsk onClose={() => setAsking2(false)} />}

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-stone-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl md:max-w-3xl">
          {TABS.map((t) => {
            const on = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  on ? 'font-semibold text-brand-700' : 'font-medium text-stone-400'
                }`}
              >
                <t.Icon className="h-[22px] w-[22px]" strokeWidth={on ? 1.9 : 1.6} />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/** 검수 단계임을 방문자에게 알린다. 정식 공개 시 config 의 REVIEW_MODE 를 끄면 사라진다. */
function ReviewBanner() {
  return (
    <div className="border-b border-warn-200 bg-warn-50 px-4 py-2">
      <p className="text-[11px] leading-relaxed text-warn-700">
        <strong className="font-bold">검수용 시험 버전입니다.</strong> 아직 공개 배포 전이며 내용을 검토하는 중입니다.
        치료 관련 결정은 반드시 담당 의료진과 상의하세요.
      </p>
    </div>
  )
}

function Disclaimer() {
  return (
    <>
    <Credentials />
    <div className="card mt-2 border-stone-200 bg-stone-50 p-4">
      <h3 className="text-sm font-bold text-stone-800">이 앱을 쓰실 때 알아 두실 것</h3>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-stone-600">
        <li>· 이 앱은 진료·처방·영양 상담을 대체하지 않습니다. 실제 치료 결정은 반드시 담당 의료진과 상의하셔야 합니다.</li>
        <li>· 모든 권고에는 근거 수준(A/B/C/G)과 출처를 함께 표시했습니다. 근거가 엇갈리는 주제는 그 사실 자체를 적었습니다.</li>
        <li>· 영양성분 값은 국가표준식품성분표와 제품 표시값을 기준으로 정리한 대표값입니다. 조리법과 제품에 따라 실제 값은 달라집니다.</li>
        <li>
          · 암종·체중·식단 같은 <strong>건강 정보는 이 기기 안에만</strong> 저장됩니다.
          체중·나이의 실제 수치와 드신 음식은 어떤 경우에도 전송되지 않습니다.
        </li>
        <li>
          · <strong>문의를 보내실 때만</strong> 적어 주신 내용과 연락처가 서버로 전송됩니다.
          답변 외의 목적으로 쓰지 않습니다.
        </li>
        <li>
          · <strong>이용 통계에 동의하신 경우에만</strong> 암종·치료 시기·연령대 같은 뭉갠 값이
          하루 한 번 전송됩니다. 기본은 꺼져 있고, 켜지 않으시면 아무것도 전송되지 않습니다.
        </li>
        <li>
          ·{' '}
          <a
            href={`${import.meta.env.BASE_URL}privacy.html`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2"
          >
            개인정보처리방침 보기
          </a>
        </li>
      </ul>
    </div>
    </>
  )
}
