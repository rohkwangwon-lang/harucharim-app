/**
 * 왼쪽 끝에서 밀어 '이전 화면'으로(2026-11-18) — 몸짓 판정과 '어느 뒤로를 먼저 할까'.
 *
 * 화면은 아이폰 앱 안에서만 확인할 수 있어(웹에선 꺼 둠) 판정만 순수 함수로 떼어 여기서 본다.
 *  · 가장자리 밖에서 시작한 손가락은 무시하는가 — 가로로 넘기는 칩 줄과 겹치면 안 된다
 *  · 세로 스크롤을 '뒤로'로 오인하지 않는가
 *  · 덮개 창 > 하위 화면 > 앞 탭 순서로 하나만 하는가, 같은 단계면 나중 것이 먼저인가
 */
import { classify, EDGE, pickTop, shouldTrigger, startsAtEdge, TRIGGER } from '../../src/lib/backGesture'

const bad: string[] = []
const ok = (cond: boolean, what: string) => { if (!cond) bad.push(what) }

ok(startsAtEdge(0) && startsAtEdge(EDGE), '가장자리 안의 손가락을 놓침')
ok(!startsAtEdge(EDGE + 1) && !startsAtEdge(200), '가장자리 밖(칩 줄·목록)에서 시작한 손가락을 받음')

ok(classify(3, 2) === 'pending', '조금 닿은 것을 벌써 판정함')
ok(classify(40, 5) === 'swipe', '오른쪽으로 곧게 민 것을 놓침')
ok(classify(5, 60) === 'cancel', '세로 스크롤을 뒤로가기로 봄')
ok(classify(30, 25) === 'cancel', '비스듬한 스크롤을 뒤로가기로 봄')
ok(classify(-40, 0) === 'cancel', '왼쪽으로 민 것을 뒤로가기로 봄')

ok(shouldTrigger(TRIGGER, 10), '충분히 밀었는데 돌아가지 않음')
ok(!shouldTrigger(TRIGGER - 1, 0), '덜 밀었는데 돌아감')
ok(!shouldTrigger(TRIGGER + 20, TRIGGER + 40), '아래로 더 많이 끌었는데 돌아감')

const e = (level: number, seq: number, name: string) => ({ level, seq, name })
ok(pickTop([e(0, 1, '탭'), e(2, 2, '음식창'), e(1, 3, '이날')]).name === '음식창', '덮개 창보다 하위 화면을 먼저 닫음')
ok(pickTop([e(2, 1, '먼저 연 창'), e(2, 5, '나중 연 창')]).name === '나중 연 창', '같은 단계에서 먼저 연 것을 닫음')
ok(pickTop([e(0, 9, '탭'), e(3, 1, '관리자')]).name === '관리자', '관리자 화면을 두고 탭을 옮김')

console.log(bad.length === 0
  ? '밀어서 뒤로 검사 완료 — 문제 없음 (판정 10 · 순서 3)'
  : `밀어서 뒤로 검사 — 문제 ${bad.length}종\n` + bad.map((b) => '■ ' + b).join('\n'))
