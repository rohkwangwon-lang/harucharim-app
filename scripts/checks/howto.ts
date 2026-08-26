/**
 * 설명서 검사.
 *
 * 설명서가 틀리면 사용자는 설명서를 의심하지 않고 자기가 잘못 본 줄 안다.
 * "추천 탭에서 다시 구성을 누르세요" 라고 적혀 있는데 그런 단추가 없으면
 * 있는 데를 찾아 한참 헤매다가 앱을 닫는다.
 *
 * 그래서 설명서가 이름을 대는 단추·화면이 실제로 코드에 있는지 대조한다.
 * 단추 이름을 바꾸면 여기서 걸리므로 설명서를 함께 고치게 된다.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const HOWTO = 'src/components/HowTo.tsx'

/** 설명서가 화면에 있다고 말하는 것들. 문구가 바뀌면 여기서 잡힌다. */
const LABELS = [
  '달라졌나요', '음식 추가', '이렇게 채워 보세요', '담으신 재료로',
  '하루치를 한 번에 추천받기', '이유 보기',
  '다시 구성', '이전 안', '담기',
  '오늘로', '영양 보고', '모자랐던 것을 채우려면',
  '나에게 권장되는 것만', '주의·피해야 할 것만', '손으로 검토한 영양제',
  '상품 데이터 받기', '치료를 마쳤습니다', '더 크게', '설정 결과'
]

/** 설명서가 다루어야 할 화면. 탭이 늘면 설명서에도 자리가 있어야 한다. */
const TABS = ['내 식단', '추천', '찾기', '기록', '영양제', '가이드', '내 정보']

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(p) && !p.endsWith('HowTo.tsx')) out.push(p)
  }
  return out
}

/*
 * 주석을 걷어내고 대조한다.
 * 처음에는 소스를 통째로 훑었는데, 단추 이름을 바꿔 놓고 검사해 보니 통과했다.
 * '다시 구성' 이 여러 파일의 주석에 적혀 있어서 그것이 증거 노릇을 한 것이다.
 * 사용자가 누르는 것은 화면에 그려진 글자이지 주석이 아니다.
 */
function stripComments(t: string): string {
  return t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
}

const src = walk('src').map((p) => stripComments(readFileSync(p, 'utf-8'))).join('\n')
const doc = readFileSync(HOWTO, 'utf-8')

const bads: string[] = []

const ghost = LABELS.filter((l) => !src.includes(l))
if (ghost.length) bads.push(`설명서에만 있고 화면에는 없는 이름 (${ghost.length}종)\n   - ${ghost.join(', ')}`)

const missed = LABELS.filter((l) => !doc.includes(l))
if (missed.length) bads.push(`검사 목록에 있는데 설명서가 안 적음 (${missed.length}종)\n   - ${missed.join(', ')}`)

const noTab = TABS.filter((t) => !doc.includes(t))
if (noTab.length) bads.push(`설명서가 다루지 않는 탭 (${noTab.length}종)\n   - ${noTab.join(', ')}`)

/* 앱이 하지 않는 일을 분명히 적었는지. 의료 앱에서 이 문장이 빠지면 안 된다. */
for (const must of ['대체하지 않습니다', '담당 선생님']) {
  if (!doc.includes(must)) bads.push(`한계를 밝히는 문구가 빠짐: "${must}"`)
}

/* 설명서가 App.tsx 에 실제로 걸려 있는지. 만들어 놓고 안 걸면 아무도 못 본다. */
const app = readFileSync('src/App.tsx', 'utf-8')
if (!app.includes('<HowTo />')) bads.push('HowTo 가 App 에 걸려 있지 않음 — 만들어도 열 길이 없다')

console.log(bads.length
  ? `설명서 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
  : `설명서 검사 완료 — 이름 ${LABELS.length}종·탭 ${TABS.length}종 대조, 문제 없음`)
