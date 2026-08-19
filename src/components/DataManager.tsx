import { useEffect, useState } from 'react'
import { clearStore, getStatus, install, type InstallProgress, type StoreStatus } from '../lib/foodStore'
import { Section } from './ui'

/**
 * 확장 식품 데이터 관리.
 *
 * 상용 가공식품 27만 건은 앱에 넣기엔 커서 원하는 분만 따로 받게 한다.
 * 한 번 받아 두면 기기 안에 남아 인터넷 없이도 검색과 바코드 조회가 된다.
 */
export function DataManager() {
  const [status, setStatus] = useState<StoreStatus | null>(null)
  const [progress, setProgress] = useState<InstallProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { getStatus().then(setStatus) }, [])

  const run = async () => {
    setError(null)
    setProgress({ phase: '식품 데이터', loaded: 0, total: 1 })
    try {
      const next = await install(setProgress)
      setStatus(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setProgress(null)
    }
  }

  const remove = async () => {
    await clearStore()
    setStatus(await getStatus())
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0

  return (
    <Section
      title="편의점·마트 상품 데이터"
      desc="받아 두면 시중 가공식품 27만 종을 검색하고 바코드로 찾을 수 있습니다."
    >
      <div className="card p-4">
        {status?.installed ? (
          <>
            <div className="flex items-center gap-2">
              <span className="chip bg-brand-100 text-brand-700">받아 둠</span>
              <span className="text-sm text-slate-600">
                식품 {status.foodCount.toLocaleString()}종 · 바코드 {status.barcodeCount.toLocaleString()}건
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              이 기기에 저장되어 있어 인터넷 없이도 쓸 수 있습니다.
            </p>
            <button className="btn-outline mt-3 w-full text-xs" onClick={remove}>
              저장된 데이터 지우기
            </button>
          </>
        ) : progress ? (
          <>
            <p className="text-sm font-medium text-slate-800">{progress.phase} 저장 중…</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs tabular-nums text-slate-500">
              {progress.loaded.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              기기에 저장하는 중입니다. 화면을 닫지 말고 잠시 기다려 주세요.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-700">
              지금은 자주 먹는 식품 <strong>1만 8천 종</strong>이 앱에 들어 있습니다.
              여기에 시중 가공식품 <strong>27만 종</strong>을 더하면 편의점·마트 상품을 바코드로 찾을 수 있습니다.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              <li>· 내려받는 용량 약 9 MB — Wi-Fi 를 권합니다</li>
              <li>· 저장 후에는 인터넷 없이 동작합니다</li>
              <li>· 저장 공간 약 60 MB 를 씁니다</li>
            </ul>
            <button className="btn-primary mt-3 w-full" onClick={run}>
              상품 데이터 받기
            </button>
          </>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-xs leading-relaxed text-danger-700">
            받지 못했습니다: {error}
          </p>
        )}
      </div>
    </Section>
  )
}
