/**
 * 문서 검사 — 문서에 적은 숫자가 앱과 같은가.
 *
 * 질의서·스토어 원고·발표 자료·홍보물은 "규칙 몇 건, 문헌 몇 종" 을 적는다. 규칙을 하나 더하면 그 숫자가
 * 열 군데에서 낡는다. 2026-10-13 에 규칙 여덟 건과 문헌 여덟 종이 늘면서 실제로 그랬고, 그날 손으로 다 고친 뒤 이 검사를 세웠다.
 * 기관에 내는 문서(식약처 질의서)가 제품과 다르면 회신이 그 제품을 덮지 못한다.
 *
 * 숫자는 scripts/doc-numbers.ts 가 앱 자료에서 센다. 여기서는 문서에서 그 숫자를 찾아 견줄 뿐이다.
 * 문서가 문장을 바꿔 숫자가 사라지면 그것도 실패다 — 검사가 조용히 헛도는 것을 막는다.
 */
import fs from 'node:fs'
import { DOC_NUMBERS as N } from '../doc-numbers'

const bads: string[] = []
let seen = 0
/** 문서에서 pattern 을 모두 찾아, 첫 묶음의 숫자가 want 와 같은지 본다 */
function expect(file: string, what: string, pattern: RegExp, want: number, atLeast = 1) {
  if (!fs.existsSync(file)) { bads.push(`${file} — 파일이 없다`); return }
  const text = fs.readFileSync(file, 'utf8')
  const hits = [...text.matchAll(new RegExp(pattern.source, 'g'))]
  if (hits.length < atLeast) { bads.push(`${file} — "${what}" 을 적은 자리를 못 찾음 (문장이 바뀌었으면 이 검사도 고칠 것)`); return }
  for (const h of hits) {
    seen++
    const got = Number(h[1].replace(/,/g, ''))
    if (got !== want) bads.push(`${file} — ${what}: 문서 ${got} · 앱 ${want}  («${h[0].slice(0, 40)}»)`)
  }
}

/*
 * 식약처 질의서는 2026-10-14 에 냈다(1AA-2610-0550517). 낸 뒤로는 앱이 아니라 **낸 그대로** 와 견준다 —
 * 질의서는 그날 무엇을 냈는지의 기록이고, 앱이 바뀌었다고 고쳐 쓰면 그 기록이 사라진다.
 * 앱과 달라진 것은 아래에서 따로 세어 보여 주고, 보완 제출이 필요한지는 docs/출시/현재-상태.md 에 적는다.
 */
const SUB = {
  rules: 124, interactions: 28, total: 152, references: 87, ingredientRules: 34, medications: 18, medicationDetails: 7,
  cancers: 10, conditions: 17,
  ruleLevels: { prefer: 45, caution: 38, avoid: 31, info: 10 },
  ruleGrades: { A: 16, B: 21, C: 23, G: 64 },
  interactionLevels: { prefer: 2, caution: 16, avoid: 8, info: 2 }
} as const
const drift = (['rules', 'interactions', 'total', 'references', 'ingredientRules', 'medications', 'medicationDetails', 'conditions'] as const)
  .filter((k) => SUB[k] !== N[k]).map((k) => `${k} ${SUB[k]}→${N[k]}`)
if (drift.length) {
  const now = fs.readFileSync('docs/출시/현재-상태.md', 'utf8')
  if (!now.includes('제출 뒤 바뀐 것')) bads.push(`앱이 제출본과 달라졌는데(${drift.join(', ')}) 현재-상태.md 에 '제출 뒤 바뀐 것' 기록이 없다`)
}

const Q = 'docs/법무/식약처-의료기기-해당여부-질의서.md'
expect(Q, '식이 정보 규칙 수', /식이 정보 규칙 \| (\d+)건/, SUB.rules)
expect(Q, '상호작용 규칙 수', /약물·음식 상호작용 규칙 \| (\d+)건/, SUB.interactions)
expect(Q, '참고 문헌 수', /참고 문헌 \| (\d+)종/, SUB.references)
expect(Q, '규칙 합계', /규칙 (\d+)건의 전체 목록/, SUB.total)
expect(Q, '붙임의 규칙 수', /식이 정보 규칙 (\d+)건, 약물·음식 상호작용 규칙/, SUB.rules)
expect(Q, '붙임의 상호작용 수', /약물·음식 상호작용 규칙 (\d+)건 \(표시 문구/, SUB.interactions)
expect(Q, '붙임의 문헌 수', /참고 문헌 (\d+)종 목록/, SUB.references)
expect(Q, '권장 수', /표시 구분은 권장 (\d+)건, 주의/, SUB.ruleLevels.prefer)
expect(Q, '주의 수', /권장 \d+건, 주의 (\d+)건, 피하세요/, SUB.ruleLevels.caution)
expect(Q, '피하세요 수', /주의 \d+건, 피하세요 (\d+)건, 참고 \d+건입니다/, SUB.ruleLevels.avoid)
expect(Q, '참고 수', /피하세요 \d+건, 참고 (\d+)건입니다/, SUB.ruleLevels.info)
expect(Q, 'A 등급 수', /메타분석\(A\) (\d+)건/, SUB.ruleGrades.A)
expect(Q, 'B 등급 수', /코호트\(B\) (\d+)건/, SUB.ruleGrades.B)
expect(Q, 'C 등급 수', /기전 연구\(C\) (\d+)건/, SUB.ruleGrades.C)
expect(Q, 'G 등급 수', /합의\(G\) (\d+)건/, SUB.ruleGrades.G)
expect(Q, '상호작용 — 피하세요', /규칙은 \d+건이며\(전체 문구는 붙임 2\), 표시 구분은 피하세요 (\d+)건/, SUB.interactionLevels.avoid)
expect(Q, '상호작용 — 주의', /표시 구분은 피하세요 \d+건, 주의 (\d+)건, 참고/, SUB.interactionLevels.caution)
expect(Q, '상호작용 수(본문)', /규칙은 (\d+)건이며\(전체 문구는 붙임 2\)/, SUB.interactions)
expect(Q, '약의 종류', /복용 약의 종류 \| (\d+)가지 가운데/, SUB.medications)
expect(Q, '약 이름 아랫칸', /모두 (\d+)가지\)/, SUB.medicationDetails)
expect(Q, '증상 수', /증상·상태 \| (\d+)가지 가운데/, SUB.conditions)

const HOW = 'docs/법무/식약처-질의-제출-방법.md'
expect(HOW, '규칙표', /고정된 규칙표\((\d+)건\)/, SUB.total)
expect(HOW, '상호작용', /상호작용 정보를 표시합니다\((\d+)건\)/, SUB.interactions)
expect(HOW, '첨부 — 규칙', /규칙 (\d+)건 전체 목록/, SUB.total)
expect(HOW, '첨부 — 문헌', /참고 문헌 (\d+)종, 등록 예정/, SUB.references)

const NOW = 'docs/출시/현재-상태.md'
expect(NOW, '식이 규칙', /식이 규칙 (\d+)건 \+/, N.rules)
expect(NOW, '상호작용', /상호작용 (\d+)건 = /, N.interactions)
expect(NOW, '합계', /= \*\*(\d+)건\*\*/, N.total)
expect(NOW, '문헌', /참고 문헌 \*\*(\d+)종\*\*/, N.references)

const STORE = 'docs/출시/스토어-등록-자료.md'
expect(STORE, '규칙', /임상 규칙 (\d+)개/, N.total)
expect(STORE, '문헌', /참고 문헌 (\d+)종/, N.references, 3)

const PR = 'docs/홍보/README.md'
expect(PR, '규칙', /임상 규칙 \| (\d+)개/, N.total)
expect(PR, '영양 규칙', /\(영양 (\d+) \+ 상호작용/, N.rules)
expect(PR, '상호작용', /\+ 상호작용 (\d+)\)/, N.interactions)
expect(PR, '등급', /근거 A(\d+) B\d+ C\d+ G\d+/, N.ruleGrades.A)
expect(PR, '등급 B', /근거 A\d+ B(\d+) C\d+ G\d+/, N.ruleGrades.B)
expect(PR, '등급 G', /근거 A\d+ B\d+ C\d+ G(\d+)/, N.ruleGrades.G)
expect(PR, '문헌', /참고 문헌 (\d+)종 전부 원문 대조/, N.references)

const WHY = 'docs/홍보/하루차림-무엇이-다른가.html'
expect(WHY, '규칙', /규칙 (\d+)개/, N.total, 2)
expect(WHY, '규칙 큰 숫자', /<b>(\d+)<\/b><span>임상 규칙/, N.total)
expect(WHY, '문헌', /(\d+)종 전부/, N.references)
expect(WHY, '문헌 제목', /참고 문헌 (\d+)종/, N.references, 2)
expect(WHY, '상호작용', /을 (\d+)개 규칙으로/, N.interactions)

const DECK = 'docs/홍보/하루차림-발표.html'
expect(DECK, '규칙 큰 숫자', /<span data-to="(\d+)">\d+<\/span><span class="unit">개<\/span>/, N.total)
expect(DECK, '영양 규칙', /영양 규칙 (\d+)개/, N.rules, 2)
expect(DECK, '상호작용', /약물·음식 상호작용 (\d+)개/, N.interactions)
expect(DECK, '문헌', /<b data-to="(\d+)">\d+<\/b>종 참고 문헌/, N.references)
expect(DECK, '성분 규칙', /<b data-to="(\d+)">\d+<\/b>개 영양제 성분 규칙/, N.ingredientRules)
for (const g of ['A', 'B', 'C', 'G'] as const) {
  expect(DECK, `등급 ${g}`, new RegExp(`<div class="grade g${g}">.*?<b data-to="(\\d+)">`), N.ruleGrades[g])
}

expect('scripts/screenshots/feature.py', '그래픽 이미지 — 문헌', /참고 문헌 (\d+)종/, N.references)
expect('scripts/screenshots/feature.py', '그래픽 이미지 — 규칙', /임상 규칙 (\d+)개/, N.total)
expect('scripts/screenshots/frame.py', '스크린샷 문구 — 문헌', /참고 문헌 (\d+)종/, N.references)

/* 지침서는 앱 자료에서 만든다 — 낡았으면 다시 만들어야 한다 */
const GUIDE = 'docs/지침서/암환자-식이영양-지침서.html'
expect(GUIDE, '지침서 — 규칙', /규칙 (\d+)개와 참고 문헌/, N.total)
expect(GUIDE, '지침서 — 문헌', /참고 문헌 (\d+)종으로/, N.references)

/* ── HTML 문서는 글자 부호를 스스로 밝혀야 한다 ───────────────────
 *
 * 2026-10-14 에 홍보 자료(하루차림-무엇이-다른가.html)가 글자가 깨져 열렸다. <!doctype> 도 <meta charset> 도 없이
 * <title> 로 시작하는 조각이었다. 웹 서버는 부호를 머리말에 실어 보내지만, 받아서 컴퓨터에서 바로 여는 파일은 그럴 데가 없어
 * 브라우저가 짐작한다 — 사파리는 한글을 다른 부호로 읽었다. 지침서도 같은 꼴이었다.
 * 나눠 드리는 HTML 은 전부 첫머리에 부호를 적는다. 브라우저는 첫 1,024 바이트 안에서만 그것을 찾는다.
 */
{
  const walk = (dir: string, out: string[] = []): string[] => {
    if (!fs.existsSync(dir)) return out
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`
      if (e.isDirectory()) walk(p, out)
      else if (e.name.endsWith('.html')) out.push(p)
    }
    return out
  }
  const pages = [...walk('docs'), ...walk('public'), 'index.html']
  if (pages.length < 6) bads.push(`HTML 검사가 헛돎 — ${pages.length}개`)
  for (const p of pages) {
    const head = fs.readFileSync(p).subarray(0, 1024).toString('utf8')
    if (!/^\s*<!doctype html>/i.test(head)) bads.push(`${p} — <!doctype html> 로 시작하지 않는다`)
    if (!/<meta\s+charset=["']?utf-8/i.test(head)) bads.push(`${p} — 첫 1,024 바이트 안에 <meta charset="utf-8"> 가 없다. 컴퓨터에서 바로 열면 한글이 깨진다`)
  }
}

if (seen < 55) bads.push(`문서 검사가 헛돎 — 견준 자리 ${seen}곳`)
console.log(`문서 검사 완료 — 문서 10종 · 숫자 ${seen}곳 대조${drift.length ? ` · 제출본과 다른 것 ${drift.join(', ')}` : ''}, ${bads.length ? `문제 ${bads.length}건` : '문제 없음'}`)
for (const b of bads) console.log('   -', b)
if (bads.length) process.exitCode = 1
