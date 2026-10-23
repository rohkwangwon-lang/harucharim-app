/**
 * 움직이는 사용법의 음성 — 자막을 '읽기 좋은 말' 로 바꾸고, 자막마다 짧은 이름(해시)을 붙인다(2026-10-23).
 *
 * 두 곳에서 같은 규칙을 써야 한다:
 *  - 앱(components/Tour.tsx): 기기 음성으로 읽거나, 미리 만들어 둔 소리 파일(public/tour/<해시>.mp3)을 찾을 때
 *  - 소리 파일을 만드는 스크립트(scripts/build-tour-audio.ts): 어떤 글을 어떤 이름으로 만들지
 * 그래서 React 가 없는 순수 모듈로 따로 둔다.
 */

/** 기호·단위를 말로 — '날짜 × 끼니' 를 '곱하기' 라고, 'kcal' 을 '케이씨에이엘' 이라고 읽지 않게 */
export function toSpeech(t: string): string {
  return t
    .replace(/(\d)\s*~\s*(\d)/g, '$1에서 $2')
    .replace(/×/g, ' 그리고 ').replace(/→/g, ', ').replace(/·/g, ', ').replace(/—/g, ', ').replace(/[‹›]/g, '')
    .replace(/＋/g, '플러스 ').replace(/−\s*\+/g, '빼기 더하기').replace(/−/g, '빼기 ')
    .replace(/(\d)\s*kcal/g, '$1 킬로칼로리').replace(/(\d)\s*mg/g, '$1 밀리그램').replace(/(\d)\s*g\b/g, '$1 그램').replace(/(\d)\s*%/g, '$1 퍼센트')
    .replace(/\bBMI\b/g, '비엠아이').replace(/\bA4\b/g, '에이포').replace(/\bPNG\b/g, '그림 파일')
    .replace(/\s+/g, ' ').trim()
}

/** 문장 단위로 끊어 읽으면 기기 음성도 덜 서두른다 */
export function sentences(t: string): string[] {
  return toSpeech(t).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
}

/** 자막 글의 짧은 이름 — 글이 한 글자라도 바뀌면 이름이 바뀌어, 낡은 소리 파일이 붙지 않는다 */
export function hashText(t: string): string {
  let h = 5381
  for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0')
}
