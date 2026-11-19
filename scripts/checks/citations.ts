/**
 * 출처가 화면에서 '누를 수 있는 주소' 로, 찾기 쉬운 자리에 있는가 — 2026-11-19 애플 심사 반려(지침 1.4.1).
 *
 * 반려 문구: 식단 정보에 출처 링크가 없다. 출처는 사용자가 쉽게 찾을 수 있어야 한다.
 * 문헌 172건에 주소는 모두 있었는데 화면이 그것을 숨기거나(두 겹 접기·옅은 10 px) 빠뜨렸다(영양제 화면은 이름만).
 *
 *  · 모든 참고문헌에 원문 주소(url)가 있는가
 *  · 화면 코드가 문헌 이름(.citation)을 RefLink 밖에서 맨글자로 찍지 않는가 — Sources.tsx 만 예외
 *  · 식단을 내놓는 화면(추천·며칠 치·내 식단·기록)에 '이 식단의 출처' 상자가 있는가
 *  · 목표 숫자를 보여 주는 내 정보(신체 정보)에 출처가 붙는가
 *  · '이 식단의 출처' 에 적은 문헌이 실제로 있는가
 *  · 출처 접힘 줄이 예전 이름 '근거 N건' 으로 되돌아가지 않았는가
 *  · 앱에 든 문서(처리방침·약관)를 아이폰에서 열 수 없는 주소로 걸지 않았는가
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ALL_REFERENCES, REF_BY_ID } from '../../src/data/references'
import { MEAL_BASIS } from '../../src/data/mealBasis'

const bad: string[] = []
const ok = (cond: boolean, what: string) => { if (!cond) bad.push(what) }

const noUrl = ALL_REFERENCES.filter((r) => !r.url || !/^https:\/\//.test(r.url))
ok(noUrl.length === 0, `원문 주소가 없거나 https 가 아닌 문헌: ${noUrl.map((r) => r.id).join(', ')}`)

const dir = 'src/components'
const files = [...readdirSync(dir).filter((f) => f.endsWith('.tsx')).map((f) => join(dir, f)), 'src/App.tsx']
const src = Object.fromEntries(files.map((f) => [f, readFileSync(f, 'utf8')]))

for (const [f, s] of Object.entries(src)) {
  if (f.endsWith('Sources.tsx')) continue
  /* '.citation' 을 화면에 찍는 곳 — 주석과 RefLink 로 넘기는 곳은 빼고 */
  const lines = s.split('\n').filter((l) => /\.citation\b/.test(l) && !/^\s*(\*|\/\/|\/\*)/.test(l))
  ok(lines.length === 0, `${f}: 문헌 이름을 링크 없이 찍음 → RefLink/CiteList 를 쓸 것\n    ${lines.map((l) => l.trim()).join('\n    ')}`)
  ok(!/>\s*근거 \{[^}]+\}건/.test(s), `${f}: 출처 접힘 줄이 '근거 N건' 으로 되돌아감 → CiteList('출처 N건')`)
  ok(!/href=\{`\$\{import\.meta\.env\.BASE_URL\}[^`]*\.html`\}/.test(s), `${f}: 앱 안 문서를 BASE_URL 로 걸음 — 아이폰 앱에서 열리지 않음 → pageUrl()`)
}

for (const f of ['RecommendedMenu', 'MealPlan', 'TodayMeals', 'Diary']) {
  ok(/<MealSourcesCard\b/.test(src[`${dir}/${f}.tsx`] ?? ''), `${f}: 식단 화면에 '이 식단의 출처' 상자가 없음`)
}
ok(/<CiteList ids=\{\['espen2021', 'kdri2025'\]\}/.test(src[`${dir}/PatientPanel.tsx`] ?? ''), 'PatientPanel: 열량·단백질 목표에 출처가 없음')
ok(/AllSourcesButton/.test(src['src/App.tsx']), "내 정보: '출처 전체 보기' 가 없음")
ok(/id="all-sources"/.test(src[`${dir}/EvidenceGuide.tsx`] ?? ''), "가이드: 출처 전체 목록(#all-sources)이 없음 — '출처 전체 보기' 가 갈 곳이 없다")

const missing = MEAL_BASIS.filter((b) => !REF_BY_ID[b.id])
ok(missing.length === 0, `'이 식단의 출처' 에 없는 문헌: ${missing.map((b) => b.id).join(', ')}`)

console.log(bad.length === 0
  ? `출처 검사 완료 — 문제 없음 (문헌 ${ALL_REFERENCES.length}건 모두 주소 · 화면 ${files.length}개 · 식단 화면 4곳)`
  : `출처 검사 — 문제 ${bad.length}종\n` + bad.map((b) => '■ ' + b).join('\n'))
if (bad.length) process.exitCode = 1
