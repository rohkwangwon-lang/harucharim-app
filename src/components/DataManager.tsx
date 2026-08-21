import { useEffect, useState } from 'react'
import { clearStore, DATA_VERSION, getStatus, install, type InstallProgress, type StoreStatus } from '../lib/foodStore'
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
            {status && status.foodCount > 0 && status.version !== DATA_VERSION && (
              <p className="mb-3 rounded-lg bg-warn-50 px-3 py-2.5 text-xs leading-relaxed text-warn-700">
                <strong>자료가 갱신되었습니다.</strong> 예전에 받아 두신 것({status.version ?? '이전 판'})은
                더 쓰지 않습니다. 다시 받으셔야 검색과 바코드 조회가 됩니다.
              </p>
            )}
            <p className="text-sm leading-relaxed text-slate-700">
              지금은 자주 먹는 식품 <strong>1만 8천 종</strong>이 앱에 들어 있습니다.
              여기에 시중 가공식품 <strong>27만 종</strong>과 바코드 <strong>23만 건</strong>을 더하면
              편의점·마트 상품을 바코드로 찾을 수 있습니다.
            </p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              바코드를 찍으면 제품은 대부분 확인되지만, <strong>영양성분까지 나오는 것은 약 30 %</strong> 입니다.
              성분 분석이 된 제품이 그만큼이기 때문입니다. 나머지는 제품명만 알려 드리니
              이름으로 다시 찾아 주세요.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              <li>· 내려받는 용량 약 <strong>14 MB</strong> — Wi-Fi 를 권합니다</li>
              <li>· 저장하는 데 1~2분 걸립니다. 화면을 켜 둔 채로 기다려 주세요</li>
              <li>· 저장 후에는 인터넷 없이 검색과 바코드 조회가 됩니다</li>
              <li>· 기기 저장 공간을 약 150 MB 씁니다</li>
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
