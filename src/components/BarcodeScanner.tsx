import { useEffect, useRef, useState } from 'react'

/**
 * 바코드 스캐너.
 *
 * 크롬 계열에는 브라우저에 바코드 인식 기능(BarcodeDetector)이 들어 있지만
 * iOS 사파리에는 없다. 아이폰·아이패드가 주 사용 환경이므로 없을 때는
 * 라이브러리를 그때 불러와 쓴다. 처음부터 싣지 않으므로 앱 크기에는 영향이 없다.
 */

type Status = '준비 중' | '카메라 권한 요청' | '스캔 중' | '오류'

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const

export function BarcodeScanner({
  onDetect,
  onClose
}: {
  onDetect: (code: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('준비 중')
  const [error, setError] = useState<string | null>(null)
  /** 카메라가 못 읽을 때 손으로 넣는 번호 */
  const [manual, setManual] = useState('')
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null

    async function start() {
      try {
        setStatus('카메라 권한 요청')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } }
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()
        setStatus('스캔 중')

        // 1) 브라우저에 내장된 인식기가 있으면 그것을 쓴다 (안드로이드 크롬 등)
        const BD = (window as unknown as { BarcodeDetector?: new (o: object) => {
          detect(s: CanvasImageSource): Promise<{ rawValue: string }[]>
        } }).BarcodeDetector

        if (BD) {
          const detector = new BD({ formats: FORMATS })
          const tick = async () => {
            if (cancelled) return
            try {
              const found = await detector.detect(video)
              if (found.length > 0 && found[0].rawValue) {
                onDetect(found[0].rawValue.trim())
                return
              }
            } catch {
              // 프레임 인식 실패는 흔한 일이라 넘어간다
            }
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          stopRef.current = () => { cancelled = true }
          return
        }

        // 2) 없으면(주로 iOS 사파리) 라이브러리를 그때 불러온다
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result && !cancelled) {
            cancelled = true
            onDetect(result.getText().trim())
          }
        })
        stopRef.current = () => { cancelled = true; controls.stop() }
      } catch (e) {
        if (cancelled) return
        setStatus('오류')
        const msg = e instanceof Error ? e.message : String(e)
        setError(
          /NotAllowed|Permission/i.test(msg)
            ? '카메라 사용이 차단되어 있습니다. 브라우저 설정에서 이 사이트의 카메라를 허용해 주세요.'
            : /NotFound/i.test(msg)
              ? '사용할 수 있는 카메라를 찾지 못했습니다.'
              : `카메라를 열지 못했습니다. (${msg})`
        )
      }
    }

    start()
    return () => {
      cancelled = true
      stopRef.current?.()
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetect])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900">
      <div className="safe-top flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-white">바코드 스캔</span>
        <button className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10" onClick={onClose}>
          닫기
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

        {/* 조준 틀 — 바코드를 이 안에 맞추면 된다 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-32 w-72 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-brand-400/90" />
          </div>
        </div>

        {error && (
          <div className="absolute inset-x-4 bottom-6 rounded-xl bg-danger-600 px-4 py-3 text-sm leading-relaxed text-white">
            {error}
          </div>
        )}
      </div>

      {/*
        * 손으로 번호를 넣는 길.
        *
        * 카메라가 못 읽는 경우가 꽤 있다 — 포장이 구겨졌거나, 냉동실에서 꺼내 김이 서렸거나,
        * 조명이 어둡거나, 애초에 카메라를 못 쓰는 기기이거나.
        * 그때 아무 길도 없으면 여기서 끝난다. 바코드 아래 숫자는 눈으로 읽을 수 있으니
        * 그대로 넣으실 수 있게 둔다.
        */}
      <div className="safe-bottom px-5 pb-4 pt-3">
        <p className="mb-2.5 text-center text-xs text-white/70">
          {status === '스캔 중'
            ? '제품 뒷면의 바코드를 틀 안에 맞춰 주세요'
            : status === '오류'
              ? '카메라를 사용할 수 없습니다. 아래에 번호를 넣어 주세요'
              : '카메라를 준비하고 있습니다…'}
        </p>

        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            const code = manual.replace(/\D/g, '')
            if (code.length >= 8) onDetect(code)
          }}
        >
          <input
            aria-label="바코드 번호 직접 입력"
            className="min-w-0 flex-1 rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-brand-400 focus:outline-none"
            inputMode="numeric"
            autoComplete="off"
            placeholder="바코드 아래 숫자를 직접 넣으셔도 됩니다"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button
            type="submit"
            disabled={manual.replace(/\D/g, '').length < 8}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-white/15 disabled:text-white/40"
          >
            찾기
          </button>
        </form>
      </div>
    </div>
  )
}
