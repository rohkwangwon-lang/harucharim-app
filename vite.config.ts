import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages 같은 하위 경로 배포를 위해 base 를 환경변수로 받는다.
 *   ONCOFOOD_BASE=/oncofood-app/ npm run build
 */
const base = process.env.ONCOFOOD_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '온코푸드 — 암 환자 식이·영양 도우미',
        short_name: '온코푸드',
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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900
  }
})
