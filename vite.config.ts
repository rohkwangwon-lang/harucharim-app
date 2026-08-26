import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages 같은 하위 경로 배포를 위해 base 를 환경변수로 받는다.
 *   HARUCHARIM_BASE=/harucharim-app/ npm run build
 */
const base = process.env.HARUCHARIM_BASE ?? '/'


export default defineConfig({
  define: {
    // 문의에 함께 담아 어떤 판에서 생긴 일인지 알 수 있게 한다
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0')
  },
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 앱에서 갱신을 직접 다루기 위해 자동 주입 대신 수동 등록을 쓴다
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '하루차림 — 암 환자 식이·영양 도우미',
        short_name: '하루차림',
        description:
          '한국 음식과 약국 영양제를 암종별로 확인하고, 근거와 함께 하루 식단을 구성합니다.',
        lang: 'ko',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#0d9482',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // 데이터가 전부 번들에 들어 있으므로 앱 셸 전체를 캐시해 완전한 오프라인 사용을 지원한다
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 식품 데이터가 들어간 번들이 3 MB 를 넘으므로 넉넉히 잡는다
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // 새 서비스워커가 대기하지 않고 바로 넘겨받게 한다.
        // 이게 없으면 이미 앱을 설치한 분에게 새 버전이 한참 뒤에야 보인다.
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900
  }
})
