/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf9', 100: '#ccfbef', 200: '#99f6e0', 300: '#5fe9ce',
          400: '#2dd4bb', 500: '#14b8a1', 600: '#0d9482', 700: '#0f766a',
          800: '#115e57', 900: '#134e48'
        },
        warn: { 50:'#fffbeb',100:'#fef3c7',200:'#fde68a',500:'#f59e0b',700:'#b45309' },
        danger: { 50:'#fef2f2',100:'#fee2e2',200:'#fecaca',500:'#ef4444',700:'#b91c1c' }
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif']
      }
    }
  },
  plugins: []
}
