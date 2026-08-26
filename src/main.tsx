import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { setupUpdatePrompt } from './lib/updatePrompt'
import { migrateStorage } from './lib/migrate'

/*
 * 예전 이름으로 저장된 것을 지금 이름으로 옮긴다.
 * 앱이 저장소를 읽기 전에 끝나야 하므로 render 보다 위에 둔다 —
 * 순서가 뒤집히면 빈 값을 읽고 처음 설정 화면부터 다시 시작한다.
 */
migrateStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

setupUpdatePrompt()
