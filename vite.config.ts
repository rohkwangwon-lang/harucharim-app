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
        /*
         * PWABuilder 가 '권장' 으로 짚은 것들. 없어도 포장은 되지만, 있으면 설치 화면과 스토어가 앱을 덜 헷갈린다.
         *   id           시작 주소가 바뀌어도 같은 앱으로 알아보게 한다
         *   orientation  세로로 쓰도록 만든 화면이다
         *   screenshots  안드로이드 크롬이 설치 창에 넓은 미리보기를 띄운다
         */
        id: base,
        orientation: 'portrait',
        dir: 'ltr',
        categories: ['health', 'medical', 'food'],
        screenshots: [
          { src: 'screenshots/1-suggest.png', sizes: '720x1560', type: 'image/png', form_factor: 'narrow', label: '오늘 무엇을 드실지 — 암종·치료 시기·증상에 맞춘 한 상' },
          { src: 'screenshots/2-search.png', sizes: '720x1560', type: 'image/png', form_factor: 'narrow', label: '이거 먹어도 되나요 — 근거와 함께 권장·주의·피하세요' },
          { src: 'screenshots/3-supp.png', sizes: '720x1560', type: 'image/png', form_factor: 'narrow', label: '영양제 — 근거가 있는 것과 없는 것' },
          { src: 'screenshots/4-diary.png', sizes: '720x1560', type: 'image/png', form_factor: 'narrow', label: '한 주를 모아 모자란 것과 넘치는 것' }
        ],
        /*
         * 안드로이드 상태바와 실행 화면 색.
         *
         * 디자인을 쑥·솔잎빛으로 바꾼 뒤에도 여기가 예전 청록색으로 남아 있었다.
         * 화면 안은 초록인데 상태바만 청록이라 설치해 여신 분께는 어긋나 보인다.
         * stone-50(쌀뜨물)과 brand-600(솔잎)으로 맞춘다.
         */
        background_color: '#faf9f4',
        theme_color: '#4b6936',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // 데이터가 전부 번들에 들어 있으므로 앱 셸 전체를 캐시해 완전한 오프라인 사용을 지원한다
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 설치 창에만 쓰는 미리보기 사진 — 오프라인 캐시에 넣으면 설치할 때마다 1 MB 가 더 내려간다
        globIgnores: ['**/screenshots/**'],
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
