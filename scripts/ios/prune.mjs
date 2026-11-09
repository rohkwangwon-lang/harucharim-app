// 아이폰 앱 안에 넣은 화면 파일에서 웹에만 필요한 것을 덜어 낸다(npm run ios:sync 가 부른다).
//  - tester/ : 비공개 테스트 모집 페이지(웹 전용)
//  - screenshots/ : 설치 창 미리보기 사진(웹 매니페스트용)
//  - sw.js, workbox-*.js : 서비스워커 — 아이폰 앱 안에서는 돌지 않고 lib/updatePrompt.ts 가 등록도 하지 않는다
import { rmSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const dir = join(process.cwd(), 'ios/App/App/public')
if (!existsSync(dir)) { console.error('ios/App/App/public 이 없습니다 — npx cap sync ios 먼저'); process.exit(1) }
const gone = []
for (const d of ['tester', 'screenshots']) if (existsSync(join(dir, d))) { rmSync(join(dir, d), { recursive: true }); gone.push(d + '/') }
for (const f of readdirSync(dir)) if (f === 'sw.js' || /^workbox-.*\.js$/.test(f)) { rmSync(join(dir, f)); gone.push(f) }
console.log('아이폰 앱에서 뺀 것:', gone.join(', ') || '없음')
