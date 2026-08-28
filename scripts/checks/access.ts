/**
 * 접근성 검사.
 *
 * 이 앱을 쓰시는 분 중에는 예순 넘으신 분이 많고, 항암 중에는 눈이 침침해지기도 한다.
 * 화면 낭독기를 쓰시는 분께는 '이름이 없는 입력칸' 이 곧 '무엇을 적는 칸인지 알 수 없는 칸' 이다.
 *
 * 처음 훑었을 때 열다섯 개가 이름 없이 있었다. 라벨을 옆에 두기는 했는데
 * htmlFor 로 이어 두지 않아, 눈으로 보는 사람에게만 이름이 있었던 셈이다.
 *
 * 스토어 심사에서도 보는 항목이라 검사로 남긴다.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const dir = 'src/components'
const bad: string[] = []
let inputs = 0

for (const f of readdirSync(dir).filter((x) => x.endsWith('.tsx'))) {
  const lines = readFileSync(path.join(dir, f), 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/<(input|select|textarea)\b/.test(lines[i])) continue
    inputs++
    let tag = lines[i]
    for (let j = i + 1; j <= i + 8 && !/>\s*$/.test(tag.trim()); j++) tag += ' ' + (lines[j] ?? '')
    /* 이름이 붙는 길은 셋 — aria-label, id(+htmlFor), 그리고 <label> 이 감싸는 것 */
    if (/aria-label=|aria-labelledby=|id=/.test(tag)) continue
    const before = lines.slice(Math.max(0, i - 4), i).join(' ')
    if (/<label(?![^>]*\/>)[^>]*>(?!.*<\/label>)/.test(before)) continue
    bad.push(`${f}:${i + 1}  ${tag.replace(/\s+/g, ' ').slice(0, 70)}`)
  }
}

console.log(`  입력칸 ${inputs}개 확인`)
console.log(bad.length === 0
  ? '접근성 검사 완료 — 문제 없음'
  : `접근성 검사 — 이름 없는 입력칸 ${bad.length}개\n` + bad.map((b) => '■ ' + b).join('\n'))
