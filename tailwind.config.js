/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * 색.
         *
         * 채도가 높은 청록은 흔하고 어딘가 기계적이다. 채도를 낮추고 초록 쪽으로
         * 조금 옮겨 병원보다 부엌에 가까운 인상으로 잡았다.
         * 중성색도 순수 회색 대신 아주 옅은 초록 기운을 섞어, 강조색과 한 화면에서
         * 따로 놀지 않게 했다.
         */
        brand: {
          50: '#f2f7f4', 100: '#dfece5', 200: '#c1d9cd', 300: '#98bfad',
          400: '#6ba189', 500: '#4a8570', 600: '#396b5b', 700: '#2f564a',
          800: '#28453d', 900: '#223a33'
        },
        // 따뜻한 기운을 띤 중성색 — 순수 회색보다 종이에 가깝다
        stone: {
          50: '#f8f8f6', 100: '#f1f1ed', 200: '#e4e4de', 300: '#cfcfc6',
          400: '#a8a89d', 500: '#82827a', 600: '#63635c', 700: '#4d4d48',
          800: '#3a3a36', 900: '#2b2b28'
        },
        warn: { 50:'#fdf7ed',100:'#f8ebd3',200:'#efd6a6',500:'#c2892a',600:'#a3721f',700:'#7d5717' },
        danger: { 50:'#fdf3f2',100:'#fae2df',200:'#f2c2bc',500:'#c2564a',600:'#a8463b',700:'#87372e' }
      },
      fontFamily: {
        sans: [
          'Pretendard Variable', 'Pretendard',
          '-apple-system', 'BlinkMacSystemFont', 'system-ui',
          'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif'
        ]
      },
      borderRadius: {
        // 과하게 둥근 모서리는 장난감처럼 보인다. 한 단계씩 줄였다.
        xl: '0.625rem',
        '2xl': '0.875rem'
      }
    }
  },
  plugins: []
}
