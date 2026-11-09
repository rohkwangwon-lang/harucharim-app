/**
 * 아이폰 앱(Capacitor)에서만 달라지는 것들 — 2026-11-09 앱스토어 준비.
 *
 * 웹·안드로이드(TWA)는 지금까지와 똑같이 브라우저 기능을 쓴다. 이 파일의 함수는
 * 아이폰 앱 안에서만 네이티브 기능으로 갈아 끼우고, 웹에서는 아무것도 하지 않는다.
 *
 * 왜 갈아 끼우나 — 아이폰 앱 안의 화면(WKWebView)에서는
 *  - 파일 내려받기(a.download)와 인쇄(window.print)가 되지 않는다 → 아이폰 공유 창으로
 *  - 서비스워커가 돌지 않는다 → 앱 안에 자료가 통째로 들어 있으니 끄면 된다
 *  - 구글이 앱 안 로그인 창을 막는다 → 1단계는 이메일 로그인만(lib/auth.ts)
 * 그리고 애플은 웹을 감싸기만 한 앱을 받지 않는다(심사 지침 4.2) — 기록 알림·바코드·공유를 네이티브로 붙인다.
 *
 * 플러그인은 필요할 때만 불러와(동적 import) 웹 번들이 무거워지지 않게 한다.
 */
import { Capacitor } from '@capacitor/core'

/** 아이폰·안드로이드 네이티브 앱 안인가 (웹·TWA 는 false) */
export const isNative = (): boolean => Capacitor.isNativePlatform()
export const isIOSApp = (): boolean => Capacitor.getPlatform() === 'ios'

/* ───────────── 공유 ───────────── */

/** 글 보내기 — 아이폰 공유 창 */
export async function shareText(title: string, text: string): Promise<boolean> {
  if (!isNative()) return false
  const { Share } = await import('@capacitor/share')
  try { await Share.share({ title, text, dialogTitle: title }) } catch { /* 취소 */ }
  return true
}

/**
 * 그림 보내기·저장 — 임시 폴더에 PNG 로 쓰고 공유 창을 연다.
 * 공유 창에는 '이미지 저장'(사진첩), 카카오톡, 프린트가 함께 있어 인쇄도 여기서 된다.
 */
export async function shareImage(blob: Blob, fileName: string, title: string): Promise<boolean> {
  if (!isNative()) return false
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
  const data = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(r.error)
    r.readAsDataURL(blob)
  })
  const safe = fileName.replace(/[^\w.\-가-힣]/g, '_')
  const { uri } = await Filesystem.writeFile({ path: safe, data, directory: Directory.Cache })
  try { await Share.share({ title, files: [uri], dialogTitle: title }) } catch { /* 취소 */ }
  return true
}

/* ───────────── 바코드 ───────────── */

/**
 * 아이폰 자체 바코드 인식으로 한 번 찍는다.
 * 돌려주는 값: 찍은 숫자 / 'cancel'(사용자가 닫음) / 'error'(카메라가 없거나 막혀 있음 — 손으로 번호를 넣는 화면으로 넘긴다).
 * 웹에서는 부르지 않는다(components/BarcodeScanner.tsx 의 카메라 화면을 그대로 쓴다).
 */
export async function scanBarcodeNative(): Promise<string | 'cancel' | 'error'> {
  const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import('@capacitor/barcode-scanner')
  const t0 = Date.now()
  try {
    const r = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      scanInstructions: '포장의 바코드를 네모 안에 맞춰 주세요',
      scanButton: false
    })
    const v = (r?.ScanResult ?? '').trim()
    return v || 'cancel'
  } catch (e) {
    /* 사용자가 닫은 것과 카메라 문제를 가른다 — 닫았으면 그대로 닫고, 문제면 번호 입력 화면을 보여 드린다 */
    // 카메라가 없을 때도 플러그인은 '취소됨'(OS-PLUG-BARC-0006)으로 돌려준다(시뮬레이터에서 확인).
    // 1초 안에 돌아온 '취소'는 사람이 누른 것일 수 없으니 카메라 문제로 본다.
    const cancelled = /cancel/i.test(String((e as { message?: string })?.message ?? e))
    return cancelled && Date.now() - t0 > 1000 ? 'cancel' : 'error'
  }
}

/* ───────────── 기록 알림 ───────────── */

const REMINDER_KEY = 'harucharim.reminder'
const REMINDER_ID = 1001
export interface Reminder { on: boolean; hour: number; minute: number }

export function readReminder(): Reminder {
  try {
    const v = JSON.parse(localStorage.getItem(REMINDER_KEY) ?? 'null') as Reminder | null
    if (v && typeof v.hour === 'number' && typeof v.minute === 'number') return v
  } catch { /* 저장이 막힌 기기 */ }
  return { on: false, hour: 20, minute: 0 }
}

/**
 * 매일 정한 시각에 "오늘 드신 것을 적어 두세요" 알림 하나.
 * 판정·치료와 관계없는 기록 습관 알림이다 — 약 복용 알림은 의료기기 경계(식약처 회신)에 닿을 수 있어 두지 않는다.
 * 돌려주는 값: 'ok' 켜짐/꺼짐 반영, 'denied' 아이폰 설정에서 알림이 막혀 있음.
 */
export async function applyReminder(r: Reminder): Promise<'ok' | 'denied'> {
  try { localStorage.setItem(REMINDER_KEY, JSON.stringify(r)) } catch { /* 저장이 막힌 기기 */ }
  if (!isNative()) return 'ok'
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => undefined)
  if (!r.on) return 'ok'
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') {
    try { localStorage.setItem(REMINDER_KEY, JSON.stringify({ ...r, on: false })) } catch { /* 저장이 막힌 기기 */ }
    return 'denied'
  }
  await LocalNotifications.schedule({
    notifications: [{
      id: REMINDER_ID,
      title: '하루차림',
      body: '오늘 드신 것을 적어 두시면 모자란 것을 함께 짚어 드려요.',
      schedule: { on: { hour: r.hour, minute: r.minute }, allowWhileIdle: true }
    }]
  })
  return 'ok'
}
