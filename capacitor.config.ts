import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 아이폰 앱(앱스토어) 설정 — 2026-11-09.
 * 안드로이드는 지금처럼 TWA(android-twa/)로 가고, Capacitor 는 아이폰에만 쓴다.
 *
 * 화면 파일(dist/)을 앱 안에 통째로 넣는다 — 자료(약 75 MB)까지 들어 있어 비행기 모드에서도 된다.
 * 웹 주소를 띄우는 방식(server.url)은 '웹을 감싸기만 한 앱'(심사 지침 4.2)으로 보이기 쉬워 쓰지 않는다.
 * 대신 화면을 고치면 앱도 새로 올려 심사를 받아야 한다.
 */
const config: CapacitorConfig = {
  appId: 'com.harucharim.app',
  appName: '하루차림',
  webDir: 'dist',
  backgroundColor: '#f5f5f4',
  ios: {
    contentInset: 'never',          // 위·아래 안전 영역은 화면이 env(safe-area-inset-*) 로 직접 비운다(index.html viewport-fit=cover)
    scheme: 'harucharim',
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    LocalNotifications: { iconColor: '#4b6936' }
  }
}

export default config
