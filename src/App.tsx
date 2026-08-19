import { useState } from 'react'
import { REVIEW_MODE } from './config'
import { useAppState } from './lib/store'
import { CANCER_BY_ID } from './data/cancers'
import { PatientPanel } from './components/PatientPanel'
import { FoodSearch } from './components/FoodSearch'
import { Supplements } from './components/Supplements'
import { Analysis } from './components/Analysis'
import { MenuPlanner } from './components/MenuPlanner'
import { CancerGuide } from './components/CancerGuide'

type Tab = 'search' | 'analysis' | 'menu' | 'supplement' | 'guide' | 'me'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'search', label: '음식 찾기', icon: '🔍' },
  { id: 'analysis', label: '분석', icon: '📊' },
  { id: 'menu', label: '식단', icon: '🍱' },
  { id: 'supplement', label: '영양제', icon: '💊' },
  { id: 'guide', label: '가이드', icon: '📖' },
  { id: 'me', label: '내 정보', icon: '👤' }
]

export default function App() {
  const { state, setPatient, addFood, setServings, removeFood, clearFoods, toggleSupplement } = useAppState()
  const [tab, setTabState] = useState<Tab>('search')
  const [toast, setToast] = useState<string | null>(null)

  // 탭을 바꿨는데 이전 화면의 스크롤 위치가 남아 있으면 빈 화면처럼 보인다
  const setTab = (next: Tab) => {
    setTabState(next)
    window.scrollTo({ top: 0 })
  }

  const profile = CANCER_BY_ID[state.patient.cancer]
  const selectedIds = new Set(state.selected.map((s) => s.foodId))

  const handleAdd = (foodId: string, servings: number) => {
    addFood(foodId, servings)
    setToast('담았습니다')
    setTimeout(() => setToast(null), 1400)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      {/* 헤더 */}
      <header className="safe-top sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">온코푸드</h1>
            <p className="text-[11px] text-slate-500">암 환자를 위한 식이·영양 도우미</p>
          </div>
          <button
            onClick={() => setTab('me')}
            className="rounded-xl bg-brand-50 px-3 py-1.5 text-right transition-colors hover:bg-brand-100"
          >
            <span className="block text-xs font-bold text-brand-800">{profile.name}</span>
            <span className="block text-[10px] text-brand-600">
              {state.patient.weightKg} kg · {state.selected.length}가지 담김
            </span>
          </button>
        </div>
      </header>

      {REVIEW_MODE && <ReviewBanner />}

      {/* 본문 */}
      <main className="flex-1 px-4 py-4 pb-24">
        {tab === 'search' && (
          <FoodSearch patient={state.patient} onAdd={handleAdd} selectedIds={selectedIds} />
        )}
        {tab === 'analysis' && (
          <Analysis
            patient={state.patient}
            selected={state.selected}
            supplements={state.supplements}
            onSetServings={setServings}
            onRemove={removeFood}
            onClear={clearFoods}
          />
        )}
        {tab === 'menu' && (
          <MenuPlanner patient={state.patient} selected={state.selected} onAdd={handleAdd} />
        )}
        {tab === 'supplement' && (
          <Supplements patient={state.patient} taking={state.supplements} onToggle={toggleSupplement} />
        )}
        {tab === 'guide' && <CancerGuide patient={state.patient} />}
        {tab === 'me' && <PatientPanel patient={state.patient} onChange={setPatient} />}

        {tab === 'me' && <Disclaimer />}
      </main>

      {/* 토스트 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* 하단 탭 */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                tab === t.id ? 'text-brand-700' : 'text-slate-400'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

/** 검수 단계임을 방문자에게 알린다. 정식 공개 시 config 의 REVIEW_MODE 를 끄면 사라진다. */
function ReviewBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
      <p className="text-[11px] leading-relaxed text-amber-800">
        <strong className="font-bold">검수용 시험 버전입니다.</strong> 아직 공개 배포 전이며 내용을 검토하는 중입니다.
        치료 관련 결정은 반드시 담당 의료진과 상의하세요.
      </p>
    </div>
  )
}

function Disclaimer() {
  return (
    <div className="card mt-2 border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-800">이 앱을 쓰실 때 알아 두실 것</h3>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
        <li>
          · 이 앱은 진료·처방·영양 상담을 대체하지 않습니다. 실제 치료 결정은 반드시 담당 의료진과 상의하셔야 합니다.
        </li>
        <li>
          · 모든 권고에는 근거 수준(A/B/C/G)과 출처를 함께 표시했습니다. 근거가 엇갈리는 주제는 그 사실 자체를 적었습니다.
        </li>
        <li>
          · 영양성분 값은 국가표준식품성분표와 제품 표시값을 기준으로 정리한 대표값입니다.
          조리법과 제품에 따라 실제 값은 달라집니다.
        </li>
        <li>
          · 입력하신 정보는 이 기기 안에만 저장되며 어디로도 전송되지 않습니다.
        </li>
      </ul>
    </div>
  )
}
