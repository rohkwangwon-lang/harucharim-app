import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../lib/stats'
import { sentences, hashText } from '../lib/tourSpeech'

/**
 * 움직이는 사용법(2026-10-23 사용자 요청, 같은 날 "더 자세히" 요청으로 장(章)을 나눔) —
 * 처음 등록부터, 내가 고른 음식에 나머지를 추천받는 법, 며칠치·장보기, 기록·체중, 영양제, 몸 상태가 달라졌을 때까지
 * 손가락이 눌러 가며 보여 준다.
 *
 * 실제 화면을 녹화하지 않고, 화면을 본뜬 작은 그림을 React 로 그린다.
 *  - 화면이 바뀌어도 녹화를 다시 할 필요가 없고, 파일이 무겁지 않으며(오프라인에서도 열린다),
 *  - 글자·단추 이름을 실제 화면과 같은 말로 둘 수 있다(설명서 검사 howto.ts 가 이 파일도 대조한다).
 * 장(chapter) → 장면(scene) → 박자(beat). 박자마다 '손가락 위치·누름·자막·화면 상태' 를 적는다.
 * 처음에는 목차를 보여 주어 보고 싶은 장만 고를 수 있게 한다 — 전부 보면 4분 가까이라 한 번에 다 보시라고 하기 어렵다.
 * 움직임을 줄여 달라고 한 기기(prefers-reduced-motion)에서는 손가락이 미끄러지지 않고 바로 옮겨 간다.
 */
export const TOUR_SEEN_KEY = 'harucharim.tour.seen'
const VOICE_KEY = 'harucharim.tour.voice'

/*
 * 음성 안내(2026-10-23 사용자 요청) — 기기에 든 한국어 음성(Web Speech API)으로 자막을 읽어 준다.
 * 녹음 파일을 두지 않는 까닭: 장면 글을 고칠 때마다 다시 녹음할 수 없고, 파일이 무거우며, 기기 음성은 오프라인에서도 된다.
 * 대신 목소리는 기기마다 다르다(아이폰 유나, 안드로이드 구글 TTS). 한국어 음성이 없는 기기에서는 켜도 소리가 나지 않으므로 그 사실을 적어 둔다.
 * 읽는 동안에는 박자를 넘기지 않는다 — 읽기가 끝난 뒤 잠깐 쉬고 넘어간다.
 */
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
/*
 * 기기 음성 고르기 — 같은 '유나' 라도 고급(Premium/Enhanced) 판이 훨씬 자연스럽다(사용자 지적 2026-10-23: 기계 티가 난다).
 * 고급 → 구글/신경망 → 유나 → 아무 한국어 순으로 고른다.
 */
const VOICE_RANK: [RegExp, number][] = [[/premium|고급|enhanced|향상|siri/i, 4], [/google|natural|neural|wavenet/i, 3], [/yuna|유나/i, 2]]
function koVoice(): SpeechSynthesisVoice | null {
  if (!canSpeak) return null
  const vs = window.speechSynthesis.getVoices().filter((v) => /^ko/i.test(v.lang))
  const score = (v: SpeechSynthesisVoice) => VOICE_RANK.find(([re]) => re.test(v.name))?.[1] ?? 1
  return vs.sort((a, b) => score(b) - score(a))[0] ?? null
}
const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent)
/*
 * 미리 녹음해 둔 소리 파일(public/tour/audio.json → <해시>.mp3). scripts/build-tour-audio.ts 가 신경망 음성으로 만든다.
 * 파일이 있으면 그것을 틀고(기기와 상관없이 같은 자연스러운 목소리), 없거나 못 받으면 기기 음성으로 읽는다.
 */
const AUDIO_BASE = `${import.meta.env.BASE_URL}tour/`
interface Clips { voice?: string; clips: Record<string, string> }

type TabId = '내 식단' | '추천' | '찾기' | '기록' | '영양제' | '가이드' | '내 정보'
type View = 'compose' | 'days' | 'plan' | 'peek' | 'shop' | 'diary' | 'supp' | 'image' | 'search' | 'detail' | 'suggest1' | 'me' | 'care'
type Flag =
  | 'days3' | 'alt' | 'pantryOpen' | 'tofuHome' | 'bought' | 'copied' | 'typed' | 'added' | 'half' | 'saved' | 'taken'
  | 'results' | 'jjigae' | 'filled' | 'hint' | 'prev' | 'bars' | 'weight' | 'graph' | 'report' | 'filterGood' | 'filterBad'
  | 'symptom' | 'soft' | 'med' | 'allergy' | 'done' | 'changed' | 'big' | 'exercise'
type Screen =
  | { kind: 'login'; done?: boolean }
  | { kind: 'onb'; step: 1 | 2 | 3 | 4; picked?: string; typed?: boolean }
  | { kind: 'app'; tab: TabId; view: View; f?: Partial<Record<Flag, boolean>> }

interface Beat {
  /** 자막 — 화면 아래에 크게 */
  say: string
  /** 손가락 위치(화면 안 %). 없으면 손가락을 치운다 */
  at?: [number, number]
  /** 이 박자에서 누른다 */
  tap?: boolean
  screen: Screen
  /** 이 박자를 보여 주는 시간(ms). 기본 2600 */
  ms?: number
}
interface Scene { title: string; beats: Beat[] }
interface Chapter { title: string; lead: string; scenes: Scene[] }

const app = (tab: TabId, view: View, f?: Partial<Record<Flag, boolean>>): Screen => ({ kind: 'app', tab, view, f })
const TAB_X: Record<TabId, number> = { '내 식단': 7, 추천: 21, 찾기: 36, 기록: 50, 영양제: 64, 가이드: 79, '내 정보': 93 }
const tabTap = (say: string, to: TabId, from: Screen): Beat => ({ say, at: [TAB_X[to], 96], tap: true, screen: from, ms: 2000 })

const CHAPTERS: Chapter[] = [
  {
    title: '처음 등록',
    lead: '로그인과 내 정보 — 한 번만 하면 됩니다',
    scenes: [
      {
        title: '시작하기',
        beats: [
          { say: '카카오나 구글 단추를 누르면 로그인됩니다. 처음이면 그 자리에서 가입됩니다.', at: [50, 24], screen: { kind: 'login' } },
          { say: '아이디를 따로 만들지 않습니다.', at: [50, 24], tap: true, screen: { kind: 'login' } },
          { say: '로그인되었습니다. 다음을 누릅니다.', at: [66, 93], tap: true, screen: { kind: 'login', done: true } }
        ]
      },
      {
        title: '내 정보 등록',
        beats: [
          { say: '어떤 암으로 치료받고 계신지 고릅니다. 여기서 고른 것에 따라 모든 추천이 달라집니다.', at: [28, 20], screen: { kind: 'onb', step: 1 } },
          { say: '유방암을 골랐습니다.', at: [28, 20], tap: true, screen: { kind: 'onb', step: 1, picked: '유방암' } },
          { say: '지금 어느 단계인지 고릅니다. 같은 음식도 시기에 따라 권고가 반대로 바뀝니다.', at: [50, 21], tap: true, screen: { kind: 'onb', step: 2, picked: '방사선치료 중' } },
          { say: '체중·키·나이를 넣으면 BMI 와 하루 목표 열량이 바로 보입니다.', at: [28, 24], tap: true, screen: { kind: 'onb', step: 3 } },
          { say: '숫자를 잘못 넣었는지도 여기서 알 수 있습니다.', screen: { kind: 'onb', step: 3, typed: true } },
          { say: '드시고 싶은 요리 계통을 고르고 시작하기를 누르면 준비가 끝납니다.', at: [66, 93], tap: true, screen: { kind: 'onb', step: 4, picked: '한식' } }
        ]
      }
    ]
  },
  {
    title: '내가 고르고, 나머지는 추천받기',
    lead: '먹고 싶은 것을 먼저 담고 빈자리만 채우는 법',
    scenes: [
      {
        title: '음식 찾기',
        beats: [
          tabTap('먹고 싶은 음식이 있으면 찾기 탭에서 시작합니다.', '찾기', app('내 식단', 'compose')),
          { say: '음식 이름으로 검색합니다. 된장찌개를 찾아 봅니다.', at: [50, 11], tap: true, screen: app('찾기', 'search') },
          { say: '결과마다 이분께 어떤지 판정이 붙어 있습니다 — 권장, 주의, 피하세요.', screen: app('찾기', 'search', { results: true }) },
          { say: '된장찌개를 누르면 자세히 볼 수 있습니다.', at: [50, 26], tap: true, screen: app('찾기', 'search', { results: true }) }
        ]
      },
      {
        title: '판정과 드시는 방법',
        beats: [
          { say: '왜 주의인지(나트륨), 어떻게 드시면 되는지(건더기 위주로, 국물은 반만)가 바로 보입니다.', screen: app('찾기', 'detail') },
          { say: '이유 아래에는 어떤 권고와 근거에 따른 것인지 적혀 있습니다.', at: [50, 62], screen: app('찾기', 'detail') },
          { say: '끼니와 양을 고르고 담기를 누릅니다.', at: [50, 46], tap: true, screen: app('찾기', 'detail') }
        ]
      },
      {
        title: '빈자리만 추천받기',
        beats: [
          { say: '내 식단에 된장찌개가 점심으로 담겼습니다. 위의 막대는 아직 열량·단백질이 모자란다고 말합니다.', screen: app('내 식단', 'compose', { jjigae: true, bars: true }) },
          { say: '하루치를 한 번에 추천받기를 누릅니다.', at: [50, 60], tap: true, screen: app('내 식단', 'compose', { jjigae: true, bars: true }) },
          { say: '담으신 1가지에 부족한 부분을 채웠습니다 — 된장찌개는 "내가 담음" 으로 그대로 두고 나머지만 앱이 골랐습니다.', screen: app('추천', 'suggest1', { jjigae: true }) },
          { say: '다시 구성을 누르면 담으신 것은 그대로 두고 나머지만 바꿉니다.', at: [84, 13], tap: true, screen: app('추천', 'suggest1', { jjigae: true, alt: true }) },
          { say: '앞의 안이 나았다면 이전 안으로 돌아갈 수 있습니다.', at: [60, 13], tap: true, screen: app('추천', 'suggest1', { jjigae: true, prev: true }) },
          { say: '음식마다 이유 보기를 펴면 왜 올렸는지 보입니다. 마음에 드는 것만 하나씩 담아도 되고,', at: [84, 48], screen: app('추천', 'suggest1', { jjigae: true }) },
          { say: '추천 12가지를 내 식단에 담기로 한 번에 담아도 됩니다.', at: [50, 34], tap: true, screen: app('추천', 'suggest1', { jjigae: true }) }
        ]
      },
      {
        title: '끼니마다 채우기·바꾸기',
        beats: [
          { say: '내 식단의 끼니별 구성에서는 끼니마다 이렇게 채워 보세요 제안이 붙습니다. 하나씩 담을 수 있습니다.', at: [84, 66], tap: true, screen: app('내 식단', 'compose', { jjigae: true, filled: true, hint: true }) },
          { say: '＋ 점심에 음식 추가를 누르면 찾기로 가서 그 끼니에 바로 담깁니다.', at: [50, 70], tap: true, screen: app('내 식단', 'compose', { jjigae: true, filled: true }) },
          { say: '양은 − + 로 바꿉니다. 밥을 반 공기로 줄였습니다. 하루 합계가 바로 다시 계산됩니다.', at: [84, 41], tap: true, screen: app('내 식단', 'compose', { jjigae: true, filled: true, half: true }) },
          { say: '제품은 찾기의 바코드로 카메라에 찍어 담을 수도 있습니다(시험 중인 기능).', at: [86, 11], screen: app('찾기', 'search'), ms: 2800 }
        ]
      }
    ]
  },
  {
    title: '며칠치 식단과 장보기',
    lead: '1~5일 한 번에 받고, 장 보고, 냉장고에 붙이기',
    scenes: [
      {
        title: '며칠치 받기',
        beats: [
          tabTap('추천 탭에서 며칠치를 고를 수 있습니다.', '추천', app('내 식단', 'compose', { jjigae: true, filled: true })),
          { say: '1일부터 5일까지. 3일을 골라 봅니다.', at: [43, 11], tap: true, screen: app('추천', 'plan', { days3: true }) },
          { say: '날마다 다른 상이 나오고, 생선·고기가 든 날은 앞에 옵니다. 국·조림은 2인분을 끓여 이틀에 나눕니다.', screen: app('추천', 'plan', { days3: true }) },
          { say: '다시 구성을 누르면 다른 조합을 짭니다.', at: [84, 33], tap: true, screen: app('추천', 'plan', { days3: true, alt: true }) }
        ]
      },
      {
        title: '이 날 자세히',
        beats: [
          { say: '한 날의 이유와 영양이 궁금하면 이 날 자세히를 누릅니다.', at: [72, 62], tap: true, screen: app('추천', 'plan', { days3: true, alt: true }) },
          { say: '끼니마다 왜 이 음식인지, 어떤 권고와 근거에 따른 것인지 보입니다.', screen: app('추천', 'peek') },
          { say: '돌아가기를 누르면 며칠치 화면으로 돌아오고, 고른 안은 그대로 남아 있습니다.', at: [26, 10], tap: true, screen: app('추천', 'peek'), ms: 2200 }
        ]
      },
      {
        title: '장보기 목록',
        beats: [
          { say: '아래 장보기 목록에는 1인분 기준 양, 흔한 포장 단위, 냉장 보관 기간이 적힙니다.', screen: app('추천', 'shop') },
          { say: '집에 있는 재료를 누르고 냉장고에 있는 것을 고르세요.', at: [20, 11], tap: true, screen: app('추천', 'shop', { pantryOpen: true }) },
          { say: '두부가 집에 있다고 하면 목록에서 빠지고, 두부를 쓰는 요리를 먼저 짭니다.', at: [28, 24], tap: true, screen: app('추천', 'shop', { pantryOpen: true, tofuHome: true }) },
          { say: '장을 보면서 산 것을 누르면 줄이 그어집니다.', at: [16, 25], tap: true, screen: app('추천', 'shop', { tofuHome: true, bought: true }) },
          { say: '복사나 보내기로 메모·카톡에 옮길 수 있습니다.', at: [76, 17], tap: true, screen: app('추천', 'shop', { tofuHome: true, bought: true, copied: true }) }
        ]
      },
      {
        title: '담기·식단표',
        beats: [
          { say: '날짜별로 내 식단에 담기를 누르면 3일치가 날짜마다 기록에 들어갑니다.', at: [50, 85], tap: true, screen: app('추천', 'plan', { days3: true, alt: true }) },
          { say: '식단표 저장은 날짜 × 끼니 표를 큰 글씨 그림으로 만듭니다. 냉장고에 붙이거나 가족에게 보내세요.', at: [30, 22], tap: true, screen: app('추천', 'plan', { days3: true, alt: true }) },
          { say: '인쇄는 그 표와 장보기 목록을 A4 한 장에 맞춰 뽑습니다.', screen: app('추천', 'image', { saved: true }), ms: 3000 }
        ]
      }
    ]
  },
  {
    title: '기록과 체중',
    lead: '날짜별 식단, 체중 흐름, 이 주의 영양 보고',
    scenes: [
      {
        title: '기록 탭',
        beats: [
          tabTap('기록 탭에는 날짜별 식단이 쌓입니다.', '기록', app('내 식단', 'compose', { jjigae: true, filled: true })),
          { say: '날짜를 누르면 그날 식단이 보이고 고칠 수 있습니다. 점이 찍힌 날이 기록이 있는 날입니다.', at: [79, 20], tap: true, screen: app('기록', 'diary', { taken: true }) },
          { say: '그날 체중을 적어 두면 — ', at: [40, 37], tap: true, screen: app('기록', 'diary', { taken: true, weight: true }) },
          { say: '이틀 이상 쌓이면 체중 흐름이 그려지고, 6개월간 5 % 넘게 줄면 경고가 붙습니다.', screen: app('기록', 'diary', { taken: true, weight: true, graph: true }) }
        ]
      },
      {
        title: '영양 보고',
        beats: [
          { say: '이 주의 영양 보고는 평균만이 아니라 며칠이나 모자랐고 며칠이나 넘었는지 셉니다.', screen: app('기록', 'diary', { taken: true, report: true }) },
          { say: '모자랐던 것을 채우려면 아래에 그 영양소가 많은 음식을 권합니다.', at: [50, 70], screen: app('기록', 'diary', { taken: true, report: true }) },
          { say: '지난달을 뒤적이다가 오늘로를 누르면 오늘로 돌아옵니다.', at: [86, 11], tap: true, screen: app('기록', 'diary', { taken: true, report: true }), ms: 2200 }
        ]
      }
    ]
  },
  {
    title: '영양제',
    lead: '제품으로 등록하고, 나에게 맞는지 거르기',
    scenes: [
      {
        title: '영양제 등록',
        beats: [
          tabTap('드시는 영양제는 영양제 탭에서 등록합니다.', '영양제', app('내 식단', 'compose', { jjigae: true, filled: true })),
          { say: '제품명으로 찾습니다. 오메가3 를 찾아 봅니다.', at: [50, 13], tap: true, screen: app('영양제', 'supp', { typed: true }) },
          { say: '등록하면 치료·약과 겹치는 것이 있는지 바로 알려 줍니다. 양은 하루 합계에도 들어갑니다.', at: [84, 27], tap: true, screen: app('영양제', 'supp', { typed: true, added: true }) }
        ]
      },
      {
        title: '나에게 맞는 것만',
        beats: [
          { say: '손으로 검토한 영양제 목록은 나에게 권장되는 것만, 주의·피해야 할 것만으로 거를 수 있습니다.', at: [30, 44], tap: true, screen: app('영양제', 'supp', { added: true, filterGood: true }) },
          { say: '주의·피해야 할 것만을 누르면 지금 치료·약과 부딪히는 것이 모입니다.', at: [70, 44], tap: true, screen: app('영양제', 'supp', { added: true, filterBad: true }), ms: 3000 }
        ]
      }
    ]
  },
  {
    title: '몸 상태가 달라지면',
    lead: '증상·약·알레르기를 고치면 추천이 그 자리에서 바뀝니다',
    scenes: [
      {
        title: '증상 고치기',
        beats: [
          tabTap('설사가 시작됐다면 내 정보에서 알려 주세요.', '내 정보', app('내 식단', 'compose', { jjigae: true, filled: true })),
          { say: '지금 겪고 있는 증상에서 설사를 누릅니다. 증상 규칙이 암종 규칙보다 식단을 더 크게 좌우합니다.', at: [52, 33], tap: true, screen: app('내 정보', 'me', { symptom: true }) },
          { say: '추천이 그 자리에서 바뀝니다 — 잔사가 적고 부드러운 것으로.', screen: app('추천', 'suggest1', { soft: true }) },
          { say: '내 식단 맨 위의 달라졌나요? 를 펴도 같은 것을 고칠 수 있습니다.', at: [50, 11], tap: true, screen: app('내 식단', 'compose', { jjigae: true, filled: true, changed: true }), ms: 2800 }
        ]
      },
      {
        title: '약·알레르기·치료 마침',
        beats: [
          { say: '복용 중인 약에 와파린을 넣으면 비타민 K 가 많은 음식과 영양제에 주의가 붙습니다.', at: [52, 52], tap: true, screen: app('내 정보', 'me', { symptom: true, med: true }) },
          { say: '알레르기를 고르면 그 이름이 보이는 음식은 피하세요로 표시하고 추천에서 뺍니다.', at: [30, 68], tap: true, screen: app('내 정보', 'me', { symptom: true, med: true, allergy: true }) },
          { say: '치료가 끝나면 치료 시기를 치료를 마쳤습니다로 바꾸세요. 목표 열량이 유지 수준으로 내려갑니다.', at: [70, 20], tap: true, screen: app('내 정보', 'me', { done: true }) },
          { say: '글씨가 작으면 더 크게를 누르세요.', at: [84, 83], tap: true, screen: app('내 정보', 'me', { done: true, big: true }), ms: 2200 }
        ]
      },
      {
        title: '가이드 탭',
        beats: [
          tabTap('가이드 탭에는 이 사용법과 운동, 암종 가이드, 근거 등급 설명이 있습니다.', '가이드', app('내 정보', 'me', { done: true })),
          { say: '운동은 식단과 함께 봐야 하는 것이라 같은 자리에 두었습니다.', at: [37, 11], tap: true, screen: app('가이드', 'care', { exercise: true }), ms: 2600 },
          { say: '여기까지입니다. 이 안내는 언제든 가이드 → 사용법에서 다시 보실 수 있습니다.', screen: app('가이드', 'care'), ms: 3000 }
        ]
      }
    ]
  }
]

const TABS: TabId[] = ['내 식단', '추천', '찾기', '기록', '영양제', '가이드', '내 정보']
const DEFAULT_MS = 2600

interface Flat { ch: number; sc: number; beat: Beat; sceneStart: boolean; chapterStart: boolean }
const FLAT: Flat[] = CHAPTERS.flatMap((c, ch) => c.scenes.flatMap((s, sc) => s.beats.map((beat, b) => ({ ch, sc, beat, sceneStart: b === 0, chapterStart: b === 0 && sc === 0 }))))
const CH_START = CHAPTERS.map((_, ch) => FLAT.findIndex((f) => f.ch === ch))
const chapterSeconds = (ch: number) => Math.round(FLAT.filter((f) => f.ch === ch).reduce((n, f) => n + (f.beat.ms ?? DEFAULT_MS), 0) / 1000)

export function Tour({ onClose }: { onClose: () => void }) {
  const [menu, setMenu] = useState(true)
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const timer = useRef<number | null>(null)
  const [voice, setVoice] = useState<boolean>(() => { try { return localStorage.getItem(VOICE_KEY) === '1' } catch { return false } })
  const [noKo, setNoKo] = useState(false)
  /* 읽기가 끝나야 넘어간다 — 박자 번호를 적어 두고, 그 번호의 읽기가 끝났을 때만 다음으로 */
  const [spoken, setSpoken] = useState(-1)
  const [clips, setClips] = useState<Clips | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const [premium, setPremium] = useState(true)
  const reduce = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])

  const cur = FLAT[pos]
  const chapter = CHAPTERS[cur.ch]
  const scene = chapter.scenes[cur.sc]

  const start = (at: number) => { setMenu(false); setEnded(false); setPos(at); setPlaying(true) }
  const hush = () => { if (canSpeak) window.speechSynthesis.cancel(); if (audio.current) { audio.current.pause(); audio.current.onended = null } }
  const toggleVoice = () => {
    const on = !voice
    setVoice(on); try { localStorage.setItem(VOICE_KEY, on ? '1' : '0') } catch { /* 없어도 된다 */ }
    if (on) { track('tour_voice'); if (!menu && !ended) say(cur.beat.say, pos) } else hush()
  }
  const speakSynth = (text: string, at: number) => {
    if (!canSpeak) { setSpoken(at); return }
    window.speechSynthesis.cancel()
    const v = koVoice()
    /* 문장마다 따로 읽으면 사이에 숨이 들어가 덜 서두른다. 속도는 보통보다 조금 느리게 */
    const parts = sentences(text)
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part)
      if (v) u.voice = v
      u.lang = 'ko-KR'; u.rate = 0.92; u.pitch = 1
      if (i === parts.length - 1) { u.onend = () => setSpoken(at); u.onerror = () => setSpoken(at) }
      window.speechSynthesis.speak(u)
    })
  }
  const say = (text: string, at: number) => {
    hush()
    const file = clips?.clips[hashText(text)]
    if (file) {
      const a = audio.current ?? (audio.current = new Audio())
      a.src = AUDIO_BASE + file
      a.onended = () => setSpoken(at)
      a.onerror = () => speakSynth(text, at)
      a.play().catch(() => speakSynth(text, at))
      return
    }
    speakSynth(text, at)
  }
  const next = () => { if (pos + 1 < FLAT.length) setPos(pos + 1); else { setEnded(true); setPlaying(false); track('tour_done') } }
  const prevScene = () => {
    setEnded(false); setPlaying(false)
    const here = FLAT.findLastIndex((f, i) => f.sceneStart && i <= pos)
    const target = here === pos ? FLAT.findLastIndex((f, i) => f.sceneStart && i < pos) : here
    setPos(Math.max(0, target))
  }
  const nextScene = () => {
    setPlaying(false)
    const i = FLAT.findIndex((f, k) => f.sceneStart && k > pos)
    if (i < 0) { setEnded(true); track('tour_done') } else setPos(i)
  }

  useEffect(() => { track('tour_open'); return () => { if (canSpeak) window.speechSynthesis.cancel() } }, [])
  useEffect(() => {
    /* 녹음 파일 목록 — 없으면(404) 기기 음성으로 */
    fetch(AUDIO_BASE + 'audio.json').then((r) => (r.ok ? r.json() : null)).then((j: Clips | null) => { if (j && j.clips) setClips(j) }).catch(() => { /* 기기 음성으로 */ })
  }, [])
  useEffect(() => {
    if (!canSpeak) return
    const check = () => { const vs = window.speechSynthesis.getVoices(); if (vs.length) { setNoKo(!vs.some((v) => /^ko/i.test(v.lang))); setPremium(vs.some((v) => /^ko/i.test(v.lang) && VOICE_RANK[0][0].test(v.name))) } }
    check(); window.speechSynthesis.addEventListener?.('voiceschanged', check)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', check)
  }, [])
  /* 박자가 바뀌면 읽는다(음성이 켜졌고 재생 중일 때) */
  useEffect(() => {
    if (menu || ended) { hush(); return }
    if (voice && playing) say(cur.beat.say, pos)
    else if (!playing) hush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, playing, menu, ended])
  useEffect(() => {
    if (!playing || ended || menu) return
    const ms = cur.beat.ms ?? DEFAULT_MS
    if (voice && (clips || (canSpeak && !noKo))) {
      /* 읽기가 끝난 뒤 600 ms 쉬고 넘어간다. 읽기가 끝났다는 신호가 안 오면(일부 기기) 넉넉히 기다렸다가 넘어간다 */
      if (spoken === pos) { timer.current = window.setTimeout(next, 600) }
      else timer.current = window.setTimeout(next, ms + 9000)
    } else timer.current = window.setTimeout(next, ms)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, playing, ended, menu, voice, spoken, noKo, clips])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { hush(); onClose() }
      else if (menu) return
      else if (e.key === 'ArrowRight') { setPlaying(false); next() }
      else if (e.key === 'ArrowLeft') prevScene()
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, menu])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/75 p-3" role="dialog" aria-modal="true" aria-label="움직이는 사용법">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-2 flex w-full items-center justify-between gap-2 text-white">
          <p className="min-w-0 truncate text-sm font-bold">{menu ? '움직이는 사용법' : ended ? '사용법 끝' : `${cur.ch + 1}. ${chapter.title} › ${scene.title}`}</p>
          <div className="flex shrink-0 gap-1.5">
            {(canSpeak || clips) && (
              <button className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${voice ? 'bg-white text-stone-900' : 'bg-white/15 hover:bg-white/25'}`} onClick={toggleVoice} aria-pressed={voice} title={noKo ? '이 기기에는 한국어 음성이 없습니다' : '자막을 읽어 줍니다'}>
                {voice ? '🔊 음성 켜짐' : '🔈 음성'}
              </button>
            )}
            {!menu && <button className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25" onClick={() => { setPlaying(false); setMenu(true) }}>목차</button>}
            <button className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25" onClick={() => { hush(); onClose() }}>닫기 ✕</button>
          </div>
        </div>

        {menu ? (
          <div className="w-full rounded-2xl bg-white p-3.5">
            <p className="text-sm font-bold text-stone-900">무엇을 보시겠어요?</p>
            <p className="mt-0.5 text-[11.5px] text-stone-500">손가락이 눌러 가며 보여 드립니다. 보는 중에 멈추거나 건너뛸 수 있습니다.</p>
            {(canSpeak || clips) && (
              <button className={`mt-2 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12px] ${voice ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-stone-300 text-stone-700'}`} onClick={toggleVoice} aria-pressed={voice}>
                <span aria-hidden>{voice ? '🔊' : '🔈'}</span>
                <span className="flex-1"><b>음성 안내</b> {voice ? '켜짐 — 자막을 소리로 읽어 드립니다' : '끔 — 켜면 자막을 소리로 읽어 드립니다'}</span>
                <span className="text-[10px] text-stone-500">{clips ? '녹음 음성' : noKo ? '한국어 음성 없음' : '기기 음성'}</span>
              </button>
            )}
            {canSpeak && voice && !clips && noKo && <p className="mt-1 text-[10.5px] text-warn-700">이 기기에는 한국어 음성이 없어 소리가 나지 않을 수 있습니다. 설정에서 한국어 음성을 내려받으면 됩니다.</p>}
            {canSpeak && voice && !clips && !noKo && !premium && isApple && (
              <p className="mt-1 text-[10.5px] leading-relaxed text-stone-500">
                더 자연스러운 목소리: 설정 → 손쉬운 사용 → 음성 콘텐츠(맥은 말하기) → 음성 → 한국어에서 <b>유나(고급)</b>을 내려받으면 이 안내도 그 목소리로 읽습니다.
              </p>
            )}
            <button className="btn-primary mt-3 w-full py-2.5 text-sm" onClick={() => start(0)}>▶ 처음부터 전부 보기 <span className="text-[11px] font-normal opacity-80">· 약 {Math.round(FLAT.reduce((n, f) => n + (f.beat.ms ?? DEFAULT_MS), 0) / 60000)}분</span></button>
            <ul className="mt-2.5 divide-y divide-stone-100">
              {CHAPTERS.map((c, i) => (
                <li key={c.title}>
                  <button className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-stone-50" onClick={() => start(CH_START[i])}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-stone-900">{c.title}</span>
                      <span className="block text-[11px] text-stone-500">{c.lead}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-stone-400">{c.scenes.length}장면 · {Math.max(1, Math.round(chapterSeconds(i) / 10) * 10)}초</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {/* 전화기 */}
            <div className="relative w-[270px] overflow-hidden rounded-[26px] border-[6px] border-stone-800 bg-stone-50 shadow-2xl" style={{ height: 'min(500px, 58vh)' }}>
              {ended ? <Ending onMenu={() => { setEnded(false); setMenu(true) }} /> : <Phone screen={cur.beat.screen} />}
              {!ended && cur.beat.at && (
                <div
                  className={`tour-finger pointer-events-none absolute z-20 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-700/50 shadow-lg ${reduce ? '' : 'transition-all duration-500 ease-in-out'}`}
                  style={{ left: `${cur.beat.at[0]}%`, top: `${cur.beat.at[1]}%` }}
                  aria-hidden
                >
                  {cur.beat.tap && <span key={pos} className="tour-tap absolute inset-0 rounded-full border-2 border-brand-500" />}
                </div>
              )}
            </div>

            {/* 자막 */}
            <p key={pos} className="tour-in mt-3 min-h-[3.5rem] w-full rounded-xl bg-white px-3.5 py-2.5 text-center text-[13.5px] font-semibold leading-relaxed text-stone-800" aria-live="polite">
              {ended ? '가이드 탭 → 사용법에서 언제든 다시 보실 수 있습니다.' : cur.beat.say}
            </p>

            {/* 조작 */}
            <div className="mt-2.5 flex w-full items-center justify-between gap-2">
              <button className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/25" onClick={prevScene} aria-label="이전 장면">‹ 이전</button>
              <button className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-stone-900 shadow" onClick={() => { if (ended) { start(0); return } setPlaying((p) => !p) }} aria-label={playing ? '멈춤' : '재생'}>
                {ended ? '처음부터 다시' : playing ? '❚❚ 멈춤' : '▶ 재생'}
              </button>
              <button className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/25" onClick={nextScene} aria-label="다음 장면">다음 ›</button>
            </div>
            <div className="mt-2.5 flex items-center gap-1" aria-hidden>
              {CHAPTERS.map((c, i) => (
                <button key={c.title} className={`h-1.5 rounded-full transition-all ${i === cur.ch && !ended ? 'w-7 bg-white' : 'w-3 bg-white/40'}`} onClick={() => start(CH_START[i])} title={c.title} />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-white/60">{ended ? `${FLAT.length}박자` : `${pos + 1} / ${FLAT.length}`} · 화면을 본뜬 그림입니다</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── 본뜬 화면 ─────────────────────────── */

function Phone({ screen }: { screen: Screen }) {
  if (screen.kind === 'login') return <Login done={!!screen.done} />
  if (screen.kind === 'onb') return <Onb step={screen.step} picked={screen.picked} typed={!!screen.typed} />
  return (
    <div className="flex h-full flex-col text-[10px] text-stone-800">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full bg-brand-600" />
          <div><p className="text-[11px] font-bold leading-tight">하루차림</p><p className="text-[8px] text-stone-500">암 환자를 위한 식이·영양 도우미</p></div>
        </div>
        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[8px] font-bold text-brand-800">유방암<br />오늘</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-2.5 py-2">
        <AppView view={screen.view} f={screen.f ?? {}} />
      </div>
      <div className="grid grid-cols-7 border-t border-stone-200 bg-white py-1.5 text-center text-[7.5px]">
        {TABS.map((t) => (
          <div key={t} className={t === screen.tab ? 'font-bold text-brand-700' : 'text-stone-400'}>
            <div className={`mx-auto mb-0.5 h-3 w-3 rounded ${t === screen.tab ? 'bg-brand-600' : 'bg-stone-300'}`} />{t}
          </div>
        ))}
      </div>
    </div>
  )
}

function Frame({ step, title, children, cta, disabled }: { step: number; title: string; children: React.ReactNode; cta: string; disabled?: boolean }) {
  const steps = ['로그인', '암종', '치료 시기', '몸 상태', '식성', '알게 된 경로']
  return (
    <div className="flex h-full flex-col bg-stone-50 text-[10px] text-stone-800">
      <div className="px-3 pt-3">
        <div className="flex items-baseline justify-between"><p className="text-[11px] font-bold">하루차림 시작하기</p><span className="text-[8px] text-stone-400">{step + 1} / 6</span></div>
        <div className="mt-1.5 grid grid-cols-6 gap-0.5">
          {steps.map((s, i) => <div key={s}><div className={`h-0.5 rounded ${i <= step ? 'bg-brand-500' : 'bg-stone-200'}`} /><p className={`mt-0.5 text-[6.5px] ${i === step ? 'font-bold text-brand-700' : 'text-stone-400'}`}>{s}</p></div>)}
        </div>
      </div>
      <div className="flex-1 px-3 pt-3">
        <p className="text-[13px] font-bold leading-snug">{title}</p>
        <div className="mt-2.5">{children}</div>
      </div>
      <div className="flex gap-1.5 px-3 pb-3">
        {step > 0 && <div className="flex-1 rounded-lg bg-stone-200 py-2 text-center font-semibold text-stone-600">이전</div>}
        <div className={`flex-[2] rounded-lg py-2 text-center font-bold text-white ${disabled ? 'bg-brand-300' : 'bg-brand-600'}`}>{cta}</div>
      </div>
    </div>
  )
}

function Login({ done }: { done: boolean }) {
  return (
    <Frame step={0} title="하루차림을 시작합니다" cta={done ? '다음' : '로그인이 필요합니다'} disabled={!done}>
      {done ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-2.5">
          <p className="font-bold text-brand-800">홍길동 님, 반갑습니다</p>
          <p className="mt-0.5 text-[9px] text-stone-600">로그인되었습니다. 다음 단계에서 몇 가지만 알려주시면 준비가 끝납니다.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[9px] text-stone-500">먼저 로그인해 주세요.</p>
          <div className="rounded-lg bg-[#fee500] py-2 text-center font-bold text-stone-900">카카오로 시작하기</div>
          <div className="rounded-lg border border-stone-300 bg-white py-2 text-center font-bold">구글로 시작하기</div>
          <p className="pt-1 text-center text-[8.5px] text-stone-500">카카오·구글 계정이 없으신가요? <b>이메일로 하기</b></p>
        </div>
      )}
    </Frame>
  )
}

function Onb({ step, picked, typed }: { step: 1 | 2 | 3 | 4; picked?: string; typed: boolean }) {
  const chip = (t: string, on: boolean) => <div key={t} className={`rounded-lg border px-2 py-1.5 text-center font-semibold ${on ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 bg-white'}`}>{t}</div>
  if (step === 1) return (
    <Frame step={1} title="어떤 암으로 치료받고 계신가요?" cta="다음" disabled={!picked}>
      <div className="grid grid-cols-2 gap-1.5">{['유방암', '위암', '대장암', '폐암', '간암', '전립선암', '췌장암', '두경부암'].map((t) => chip(t, t === picked))}</div>
    </Frame>
  )
  if (step === 2) return (
    <Frame step={2} title="지금 어느 단계에 계신가요?" cta="다음">
      <div className="space-y-1.5">{['방사선치료 중', '항암치료 중', '수술 후 회복', '치료를 마쳤습니다'].map((t) => chip(t, t === picked))}</div>
    </Frame>
  )
  if (step === 3) return (
    <Frame step={3} title="몸 상태를 알려주세요" cta="다음">
      <div className="grid grid-cols-3 gap-1.5">
        {[['체중', typed ? '58 kg' : ''], ['키', typed ? '160 cm' : ''], ['나이', typed ? '55' : '']].map(([k, v]) => (
          <div key={k}><p className="text-[8px] text-stone-500">{k}</p><div className="mt-0.5 h-6 rounded-md border border-stone-300 bg-white px-1.5 leading-6">{v}</div></div>
        ))}
      </div>
      {typed && <div className="mt-2.5 rounded-lg bg-brand-50 px-2 py-1.5 text-[9px] text-brand-900"><b>BMI 22.7</b> 정상 · 하루 목표 <b>1,740 kcal</b> · 단백질 <b>70~87 g</b></div>}
    </Frame>
  )
  return (
    <Frame step={4} title="어떤 음식으로 식단을 짤까요?" cta="시작하기">
      <div className="grid grid-cols-3 gap-1.5">{['한식', '양식', '중식', '일식', '동남아식'].map((t) => chip(t, t === picked))}</div>
      <p className="mt-2 text-[8.5px] text-stone-500">한식은 늘 나옵니다. 고른 계통은 상에 더 자주 오릅니다.</p>
    </Frame>
  )
}

const PLAN_A = [
  ['금 10/24', ['현미밥 반 공기 · 두부부침 · 배', '귀리 우유죽 · 된장찌개 · 단호박', '잡곡밥 · 닭안심 청경채 두부볶음 · 단감']],
  ['토 10/25', ['보리밥 · 시금치계란말이 · 사과', '흑미밥 · 된장찌개 · 콩자반 · 배', '현미밥 · 꽃게(찐 것) · 오리고기(구이)']],
  ['일 10/26', ['잡곡밥 · 두부조림 · 키위', '보리밥 · 닭가슴살 · 단감 · 두유', '흑미밥 · 미역국 · 버섯 두부계란찜']]
] as const
const PLAN_B = [
  ['금 10/24', ['들깨 두부죽 · 두부부침 · 배', '현미밥 · 소고기 양지(삶은 것) · 오렌지', '잡곡밥 · 연어 케일 참깨무침 · 단감']],
  ['토 10/25', ['보리밥 · 콩자반 · 사과', '귀리 우유죽 · 무국 · 계란말이', '흑미밥 · 대구 두부 맑은찜 · 브로콜리']],
  ['일 10/26', ['현미밥 · 달걀(삶은 것) · 락토프리 우유', '쌀밥 · 새우(데친 것) · 단호박', '잡곡밥 · 무국 · 꽃게(찐 것) · 포도']]
] as const

type F = Partial<Record<Flag, boolean>>
const Chip = ({ t, on, tone }: { t: string; on?: boolean; tone?: 'danger' }) => (
  <span className={`rounded-full border px-1.5 py-0.5 text-[8.5px] ${on ? (tone === 'danger' ? 'border-danger-500 bg-danger-500 text-white' : 'border-brand-500 bg-brand-500 text-white') : 'border-stone-300 bg-white text-stone-600'}`}>{t}</span>
)
const Level = ({ l }: { l: '권장' | '주의' | '피하세요' }) => (
  <span className={`rounded px-1 text-[7.5px] font-bold ${l === '권장' ? 'bg-brand-100 text-brand-800' : l === '주의' ? 'bg-warn-100 text-warn-700' : 'bg-danger-100 text-danger-700'}`}>{l}</span>
)
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`rounded-lg border border-stone-200 bg-white px-2 py-1.5 ${className}`}>{children}</div>

function AppView({ view, f }: { view: View; f: F }) {
  switch (view) {
    case 'compose': return <Compose f={f} />
    case 'search': return <Search f={f} />
    case 'detail': return <Detail />
    case 'suggest1': return <Suggest1 f={f} />
    case 'days': case 'plan': return <Plan f={f} days={view === 'plan'} />
    case 'peek': return <Peek />
    case 'shop': return <Shop f={f} />
    case 'diary': return <DiaryV f={f} />
    case 'supp': return <Supp f={f} />
    case 'me': return <Me f={f} />
    case 'care': return <Care f={f} />
    default: return <Image f={f} />
  }
}

function Bars({ kcal, prot, over }: { kcal: number; prot: number; over?: boolean }) {
  const Bar = ({ k, v, unit, lo, hi }: { k: string; v: number; unit: string; lo: number; hi: number }) => {
    const pct = Math.min(100, Math.round((v / hi) * 100)); const low = v < lo
    return (
      <div className="flex items-center gap-1.5"><span className="w-8 text-[8px] text-stone-500">{k}</span>
        <div className="relative h-1.5 flex-1 rounded bg-stone-200"><div className={`h-1.5 rounded ${low ? 'bg-warn-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} /></div>
        <span className={`w-16 text-right text-[8px] ${low ? 'text-warn-700' : 'text-stone-600'}`}>{v.toLocaleString()} / {lo}~{hi} {unit}</span></div>
    )
  }
  return <Card className="space-y-1"><Bar k="열량" v={kcal} unit="kcal" lo={1500} hi={1800} /><Bar k="단백질" v={prot} unit="g" lo={70} hi={87} />{over && <p className="text-[8px] text-stone-500">막대가 주황이면 모자란 것입니다.</p>}</Card>
}

function Compose({ f }: { f: F }) {
  const rice = f.half ? '½ 공기' : '1 공기'
  return (
    <div>
      {f.changed ? (
        <Card className="mb-1.5 border-brand-200 bg-brand-50"><p className="font-bold">달라졌나요? <span className="font-normal text-stone-500">▾</span></p><div className="mt-1 flex flex-wrap gap-1"><Chip t="방사선치료 중" on /><Chip t="설사" on /><Chip t="오심·구토" /><Chip t="식욕부진" /></div></Card>
      ) : <p className="mb-1.5 flex items-center justify-between text-[11px] font-bold">오늘 <span className="rounded border border-stone-300 px-1.5 text-[8px] font-normal text-stone-500">달라졌나요? ▾</span></p>}
      {(f.jjigae || f.taken) && <Bars kcal={f.filled ? (f.half ? 1690 : 1760) : f.jjigae ? 410 : 1760} prot={f.filled ? 84 : f.jjigae ? 14 : 86} over={!!f.bars} />}
      {!f.jjigae && !f.taken && <Card className="border-dashed py-4 text-center text-stone-500">아직 담으신 것이 없습니다.<br />찾기에서 먹고 싶은 것을 담거나, 추천에서 하루치를 받아 보세요.</Card>}
      {f.jjigae && !f.filled && (
        <>
          <Card className="mt-1.5"><p className="font-bold text-stone-500">점심</p><div className="flex items-center justify-between py-0.5"><span>된장찌개 <Level l="주의" /> <span className="rounded bg-stone-100 px-1 text-[7.5px]">내가 담음</span></span><span className="rounded border border-stone-300 px-1.5 text-[8px]">− 1 그릇 +</span></div></Card>
          <div className="mt-2 rounded-lg bg-brand-600 py-2 text-center"><p className="text-[11px] font-bold text-white">하루치를 한 번에 추천받기</p><p className="text-[8px] text-brand-100">담으신 것은 그대로 두고 빈자리만 채웁니다</p></div>
        </>
      )}
      {(f.filled || f.taken) && (
        <>
          <Card className="mt-1.5"><p className="font-bold text-stone-500">아침</p>
            {[['현미밥', rice], ['두부부침', '1 접시'], ['배', '½ 개']].map(([n, q]) => <div key={n} className="flex items-center justify-between py-0.5"><span>{n}</span><span className="rounded border border-stone-300 px-1.5 text-[8px]">− {q} +</span></div>)}
          </Card>
          <Card className="mt-1"><p className="font-bold text-stone-500">점심</p>
            <div className="flex items-center justify-between py-0.5"><span>된장찌개 {f.jjigae && <span className="rounded bg-stone-100 px-1 text-[7.5px]">내가 담음</span>}</span><span className="rounded border border-stone-300 px-1.5 text-[8px]">− 1 그릇 +</span></div>
            <div className="flex items-center justify-between py-0.5"><span>귀리 우유죽</span><span className="rounded border border-stone-300 px-1.5 text-[8px]">− 1 그릇 +</span></div>
            {f.hint && <div className="mt-1 rounded bg-brand-50 px-1.5 py-1"><p className="text-[8px] font-bold text-brand-700">이렇게 채워 보세요</p><div className="flex items-center justify-between"><span>달걀(삶은 것) <span className="text-[7.5px] text-stone-500">단백질 +6 g</span></span><span className="rounded bg-brand-600 px-1.5 text-[8px] font-bold text-white">담기</span></div></div>}
            <p className="mt-1 text-center text-[8.5px] font-semibold text-brand-700">＋ 점심에 음식 추가</p>
          </Card>
        </>
      )}
    </div>
  )
}

function Search({ f }: { f: F }) {
  const rows: [string, '권장' | '주의' | '피하세요', string][] = [['된장찌개', '주의', '나트륨 높음 · 건더기 위주로'], ['된장국', '권장', '단백질 · 발효'], ['두부 된장찌개', '주의', '나트륨'], ['청국장찌개', '주의', '나트륨']]
  return (
    <div>
      <div className="flex gap-1"><div className="h-7 flex-1 rounded-lg border border-stone-300 bg-white px-2 leading-7">{f.results ? '된장찌개' : <span className="text-stone-400">음식 이름으로 검색 — 예: 된장찌개, 두부</span>}</div><span className="rounded-lg border border-stone-300 bg-white px-1.5 text-[8px] leading-7">▣ 바코드</span></div>
      <p className="mt-1 text-[8px] text-stone-500">담을 끼니 <Chip t="아침" /> <Chip t="점심" on /> <Chip t="저녁" /></p>
      {f.results ? (
        <div className="mt-1.5 space-y-1">{rows.map(([n, l, why], i) => <Card key={n} className={i === 0 ? 'border-brand-300' : ''}><div className="flex items-center justify-between"><span className="font-semibold">{n} <Level l={l} /></span><span className="text-[8px] text-stone-400">›</span></div><p className="text-[8px] text-stone-500">{why}</p></Card>)}</div>
      ) : (
        <Card className="mt-1.5 py-3 text-center text-stone-500">이름을 적으면 바로 찾습니다.<br />한국 음식 412종 + 식약처 자료 23만 건</Card>
      )}
    </div>
  )
}

function Detail() {
  return (
    <div>
      <div className="flex items-start justify-between"><div><p className="text-[12px] font-bold">된장찌개 <Level l="주의" /></p><p className="text-[8px] text-stone-500">1 그릇(300 g) · 180 kcal · 단백질 12 g · 나트륨 980 mg</p></div><span className="text-stone-400">✕</span></div>
      <div className="mt-1.5 rounded-lg bg-brand-50 px-2 py-1.5"><p className="text-[8.5px] font-bold text-brand-800">드시는 방법</p><p className="text-[8.5px]">· 건더기 위주로, 국물은 반만 드세요<br />· 하루 나트륨 2,000 mg 안에서</p></div>
      <Card className="mt-1.5 border-brand-300"><div className="flex items-center justify-between"><span className="text-[8.5px]">끼니 <Chip t="점심" on /> · 양 <span className="rounded border px-1">− 1 그릇 +</span></span><span className="rounded bg-brand-600 px-2 py-1 font-bold text-white">점심에 1인분 담기</span></div></Card>
      <Card className="mt-1.5"><p className="font-bold">이유</p><p className="text-[8.5px]"><b>나트륨이 높습니다.</b> 방사선치료 중 고혈압·부종이 없더라도 하루 2,000 mg 안쪽을 권합니다.</p><p className="mt-0.5 text-[8px] text-stone-500">한국인 영양소 섭취기준 2025 · ESPEN 2021 <span className="rounded border px-0.5">근거 A</span> · 근거 2건 보기</p></Card>
    </div>
  )
}

function Suggest1({ f }: { f: F }) {
  const lunch = f.soft ? ['된장찌개(건더기만)', '흰죽', '달걀찜'] : f.alt ? ['된장찌개', '흑미밥 반 공기', '닭가슴살(삶은 것)', '브로콜리'] : ['된장찌개', '현미밥 반 공기', '소고기 양지(삶은 것)', '시금치나물']
  const seedText = f.alt ? '2번째 안입니다. 담으신 1가지는 그대로 두고 나머지만 바꿨습니다.' : f.prev ? '1번째 안으로 돌아왔습니다.' : null
  return (
    <div>
      <div className="mb-1 flex items-center gap-1"><span className="text-[8.5px] font-bold text-stone-600">며칠치</span>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} t={`${n}일`} on={n === 1} />)}</div>
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5">
        <div className="flex items-start justify-between"><div><p className="text-[8px] font-bold uppercase text-brand-700">하루(24시간) 전체</p><p className="font-bold">유방암 · 가을철 추천 식단</p><p className="text-[8px] text-stone-600">{f.soft ? '오늘은 설사를 가장 크게 반영했습니다' : f.jjigae ? <>담으신 <b>1가지</b>에 부족한 부분을 채웠습니다.</> : '아직 담으신 것이 없어 처음부터 구성했습니다.'}</p></div>
          <div className="flex gap-1">{(f.alt || f.prev) && <span className="rounded border border-stone-300 bg-white px-1.5 py-1 text-[8px] font-bold text-stone-600">‹ 이전 안</span>}<span className="rounded border border-brand-600 bg-white px-1.5 py-1 text-[8px] font-bold text-brand-700">⟳ 다시 구성</span></div></div>
        {seedText && <p className="mt-1 text-[8px] text-brand-800">{seedText}</p>}
      </div>
      <div className="mt-1.5 rounded-lg bg-brand-600 py-1.5 text-center font-bold text-white">추천 12가지를 내 식단에 담기</div>
      <Card className="mt-1.5"><p className="font-bold text-stone-500">점심 <span className="font-normal">560 kcal</span></p>
        {lunch.map((n, i) => <div key={n} className="flex items-center justify-between py-0.5"><span>{n} {i === 0 && f.jjigae ? <span className="rounded bg-stone-100 px-1 text-[7.5px]">내가 담음</span> : <span className="rounded bg-brand-100 px-1 text-[7.5px] text-brand-800">{i === 1 ? '열량' : '단백질 보충'}</span>}</span><span className="text-[8px] text-brand-700">{i === 0 && f.jjigae ? '' : '이유 보기 ▾ · 담기'}</span></div>)}
      </Card>
      <Card className="mt-1"><p className="font-bold text-stone-500">저녁</p><p className="text-[8.5px]">{f.soft ? '흰죽 · 대구 두부 맑은찜 · 바나나' : '잡곡밥 · 연어 케일 참깨무침 · 단감'}</p></Card>
    </div>
  )
}

function Plan({ f, days }: { f: F; days: boolean }) {
  const plan = f.alt ? PLAN_B : PLAN_A
  const Days = () => <div className="mb-2 flex items-center gap-1"><span className="text-[8.5px] font-bold text-stone-600">며칠치</span>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} t={`${n}일`} on={f.days3 ? n === 3 : n === 1} />)}</div>
  if (!days) return <div><Days /><div className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-2"><p className="text-[8px] font-bold uppercase text-brand-700">하루(24시간) 전체</p><p className="font-bold">유방암 · 가을철 추천 식단</p></div></div>
  return (
    <div>
      <Days />
      <div className="mb-1.5 flex items-start justify-between rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5">
        <div><p className="text-[8px] font-bold uppercase text-brand-700">3일치 식단 · 1인분</p><div className="mt-1 flex gap-1"><Chip t="집에 있는 재료" /><Chip t="식단표 저장" /><Chip t="인쇄" /></div></div>
        <span className="rounded-md border border-brand-600 bg-white px-1.5 py-1 text-[8px] font-bold text-brand-700">⟳ 다시 구성</span>
      </div>
      <div className="space-y-1.5">
        {plan.map(([d, meals], i) => (
          <Card key={d}>
            <p className="font-bold"><span className="mr-1 rounded bg-brand-100 px-1 text-[7.5px] text-brand-800">{i + 1}일째</span>{d}</p>
            {(['아침', '점심', '저녁'] as const).map((s, k) => <p key={s} className="truncate text-[8.5px]"><span className="mr-1 font-semibold text-stone-400">{s}</span>{meals[k]}</p>)}
            <p className="text-right text-[8px] font-semibold text-brand-700">이 날 자세히(이유·영양) ›</p>
          </Card>
        ))}
      </div>
      <div className="mt-1.5 rounded-lg bg-brand-600 py-1.5 text-center font-bold text-white">3일치 27가지를 날짜별로 내 식단에 담기</div>
    </div>
  )
}

function Peek() {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5"><span className="rounded-lg bg-brand-600 px-2 py-1 font-bold text-white">← 3일치로 돌아가기</span><span className="text-[8px] text-stone-500">2일째 · 토 10/25</span></div>
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5"><p className="text-[8px] font-bold uppercase text-brand-700">하루(24시간) 전체</p><p className="font-bold">유방암 · 가을철 추천 식단</p><p className="text-[8px] text-stone-600">오늘은 <b>단백질을 채우는 것</b>을 가장 크게 반영했습니다</p></div>
      <Card className="mt-1.5">
        <p className="font-bold text-stone-500">아침 <span className="font-normal">420 kcal</span></p>
        <p className="font-semibold">보리밥 <span className="rounded bg-stone-100 px-1 text-[7.5px] font-normal">밥 반 공기</span></p>
        <p className="font-semibold">시금치계란말이 <span className="rounded bg-brand-100 px-1 text-[7.5px] font-normal text-brand-800">단백질 12 g 보충</span></p>
        <p className="text-[8px] text-stone-500">이유 보기 › 치료 중 단백질 1.2~1.5 g/kg (ESPEN 2021) <span className="rounded border px-0.5">근거 A</span></p>
      </Card>
      <Card className="mt-1"><p className="font-bold text-stone-500">점심</p><p className="font-semibold">흑미밥 · 된장찌개 · 콩자반 · 배</p></Card>
    </div>
  )
}

function Shop({ f }: { f: F }) {
  const items = [['채소', ['시금치 200 g (1단)', '청경채 80 g', '단호박 150 g (¼개)']], ['두류', f.tofuHome ? [] : ['두부 300 g (1모)']], ['육류', ['닭안심 100 g', '오리고기 80 g']], ['어패류', ['꽃게 2마리']]] as const
  return (
    <div>
      <div className="mb-1.5 flex gap-1"><Chip t={f.tofuHome ? '집에 있는 재료 1' : '집에 있는 재료'} on={!!f.tofuHome} /><Chip t="식단표 저장" /><Chip t="인쇄" /></div>
      {f.pantryOpen && (
        <Card className="mb-1.5"><p className="text-[8px] text-stone-500">냉장고에 있는 것을 누르세요.</p>
          <div className="mt-1 flex flex-wrap gap-1">{['달걀', '두부', '양파', '대파', '당근', '감자', '배추김치'].map((t) => <Chip key={t} t={t} on={t === '두부' && !!f.tofuHome} />)}</div>
        </Card>
      )}
      <div className="flex items-center justify-between"><p className="font-bold">장보기 목록 <span className="font-normal text-stone-500">3일 · {f.tofuHome ? 24 : 25}가지</span></p><div className="flex gap-1"><span className={`rounded border px-1.5 py-0.5 text-[8px] ${f.copied ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-stone-300'}`}>복사</span><span className="rounded border border-stone-300 px-1.5 py-0.5 text-[8px]">보내기</span></div></div>
      {f.copied && <p className="mt-1 rounded bg-brand-50 px-1.5 py-0.5 text-[8px] text-brand-800">복사했습니다 — 메모·카톡에 붙여 넣으세요</p>}
      <div className="mt-1 space-y-1">
        {items.filter(([, its]) => its.length).map(([cat, its]) => (
          <Card key={cat} className="py-1"><p className="text-[8px] font-bold text-stone-600">{cat}</p>
            {its.map((t, i) => { const done = f.bought && cat === '채소' && i === 0
              return <p key={t} className={`flex items-center gap-1 py-0.5 ${done ? 'text-stone-400 line-through' : ''}`}><span className={`inline-block h-2.5 w-2.5 rounded-sm border ${done ? 'border-brand-600 bg-brand-600' : 'border-stone-400'}`} />{t}{cat !== '채소' && <span className="rounded bg-warn-50 px-0.5 text-[7px] text-warn-700">냉장 {cat === '어패류' ? '2~4일' : '1~2일'}</span>}</p> })}
          </Card>
        ))}
      </div>
    </div>
  )
}

function DiaryV({ f }: { f: F }) {
  if (f.report) return (
    <div>
      <div className="flex items-center justify-between"><p className="text-[11px] font-bold">10월 · 3주째</p><span className="rounded border border-stone-300 px-1.5 text-[8px]">오늘로</span></div>
      <Card className="mt-1.5"><p className="font-bold">이 주의 영양 보고</p>
        {[['열량', '5일 중 2일 모자람', 'warn'], ['단백질', '5일 모두 목표 안', 'ok'], ['나트륨', '1일 넘음', 'warn'], ['식이섬유', '3일 모자람', 'warn']].map(([k, v, s]) => <div key={k} className="flex justify-between py-0.5 text-[8.5px]"><span>{k}</span><span className={s === 'ok' ? 'text-brand-700' : 'text-warn-700'}>{v}</span></div>)}
      </Card>
      <Card className="mt-1.5 border-brand-200 bg-brand-50"><p className="font-bold text-brand-800">모자랐던 것을 채우려면</p><p className="text-[8.5px]">식이섬유 — 고구마(찐 것) · 나물무침(모둠) · 배 · 현미밥</p><p className="text-[8.5px]">열량 — 간식을 하루 한 번 더: 두유라떼 · 견과 한 줌</p></Card>
    </div>
  )
  return (
    <div>
      <div className="flex items-center justify-between"><p className="text-[11px] font-bold">10월</p><span className="rounded border border-stone-300 px-1.5 text-[8px]">오늘로</span></div>
      <div className="mt-1 grid grid-cols-7 gap-0.5 text-center text-[8px]">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => <p key={d} className="text-stone-400">{d}</p>)}
        {Array.from({ length: 14 }, (_, i) => i + 19).map((d) => <div key={d} className={`rounded py-1 ${d === 24 ? 'bg-brand-600 font-bold text-white' : 'bg-white'}`}>{d}{[21, 22, 24, 25, 26].includes(d) && f.taken && <span className={`mx-auto mt-0.5 block h-1 w-1 rounded-full ${d === 24 ? 'bg-white' : 'bg-brand-500'}`} />}</div>)}
      </div>
      <Card className="mt-1.5"><p className="font-bold">그날 체중</p><div className="mt-1 flex gap-1"><div className={`h-6 flex-1 rounded border border-stone-300 px-1.5 leading-6 ${f.weight ? '' : 'text-stone-400'}`}>{f.weight ? '57.5 kg' : 'kg'}</div><span className={`rounded px-2 leading-6 ${f.weight ? 'bg-brand-600 text-white' : 'bg-stone-200'}`}>저장</span></div></Card>
      {f.graph ? (
        <Card className="mt-1.5"><p className="font-bold">체중 흐름 <span className="font-normal text-stone-500">최근 4회</span></p>
          <svg viewBox="0 0 200 40" className="mt-1 h-10 w-full"><polyline points="10,10 70,14 130,20 190,26" fill="none" stroke="#4b6936" strokeWidth="2" /><circle cx="190" cy="26" r="3" fill="#4b6936" /></svg>
          <p className="text-[8px] text-warn-700">6개월간 4.2 % 줄었습니다. 5 % 이상이면 영양 개입 기준입니다.</p></Card>
      ) : (
        <Card className="mt-1.5"><p className="font-bold">그날 식단 <span className="font-normal text-stone-500">금 10/24 · 9가지</span></p><p className="text-[8.5px]">아침 현미밥 · 두부부침 · 배</p><p className="text-[8.5px]">점심 귀리 우유죽 · 된장찌개 · 단호박</p><p className="text-[8.5px]">저녁 잡곡밥 · 닭안심 청경채 두부볶음 · 단감</p></Card>
      )}
    </div>
  )
}

function Supp({ f }: { f: F }) {
  const list: [string, '권장' | '주의' | '피하세요', string][] = [['비타민 D', '권장', '결핍 흔함 · 1,000 IU'], ['오메가3', '주의', '항혈전제와 출혈 경향'], ['고용량 비타민 C', '피하세요', '방사선치료 중 항산화'], ['세인트존스워트', '피하세요', '약 효과 떨어뜨림']]
  const shown = f.filterGood ? list.filter((x) => x[1] === '권장') : f.filterBad ? list.filter((x) => x[1] !== '권장') : list
  return (
    <div>
      <p className="text-[11px] font-bold">영양제</p>
      <div className="mt-1 h-7 rounded-lg border border-stone-300 bg-white px-2 leading-7">{f.typed ? '오메가3' : <span className="text-stone-400">제품명으로 검색 — 예: 락토핏, 오메가3</span>}</div>
      {f.typed && !f.added && <Card className="mt-1.5 flex items-center justify-between"><span><b>오메가3</b> (EPA·DHA 1,000 mg)</span><span className="rounded bg-brand-600 px-2 py-0.5 font-bold text-white">추가</span></Card>}
      {f.added && (
        <div className="mt-1.5 rounded-lg border border-warn-200 bg-warn-50 px-2 py-1.5">
          <p className="font-bold">오메가3 <span className="rounded bg-warn-500 px-1 text-[7.5px] text-white">주의</span> <span className="text-[8px] font-normal text-stone-500">복용 중</span></p>
          <p className="text-[8.5px] text-stone-700">항혈전제와 함께 드시면 출혈 경향이 커질 수 있습니다. 수술 전후에는 의료진과 상의하세요.</p>
        </div>
      )}
      {(f.filterGood || f.filterBad || f.added) && (
        <Card className="mt-1.5"><p className="font-bold">손으로 검토한 영양제 35종</p>
          <div className="mt-1 flex gap-1"><Chip t="나에게 권장되는 것만" on={!!f.filterGood} /><Chip t="주의·피해야 할 것만" on={!!f.filterBad} tone="danger" /></div>
          <div className="mt-1 space-y-0.5">{shown.map(([n, l, why]) => <p key={n} className="text-[8.5px]">{n} <Level l={l} /> <span className="text-stone-500">{why}</span></p>)}</div>
        </Card>
      )}
    </div>
  )
}

function Me({ f }: { f: F }) {
  return (
    <div className="space-y-1.5">
      <Card><p className="font-bold">치료 시기</p><div className="mt-1 flex flex-wrap gap-1"><Chip t="방사선치료 중" on={!f.done} /><Chip t="항암치료 중" /><Chip t="치료를 마쳤습니다" on={!!f.done} /></div>{f.done && <p className="mt-1 text-[8px] text-brand-800">하루 열량 목표 1,740 → <b>1,560 kcal</b>(유지 수준)</p>}</Card>
      <Card><p className="font-bold">지금 겪고 있는 증상</p><div className="mt-1 flex flex-wrap gap-1"><Chip t="오심·구토" /><Chip t="식욕부진" /><Chip t="설사" on={!!f.symptom} /><Chip t="변비" /><Chip t="구강점막염" /></div></Card>
      <Card><p className="font-bold">복용 중인 약</p><div className="mt-1 flex flex-wrap gap-1"><Chip t="타목시펜" /><Chip t="와파린" on={!!f.med} /><Chip t="메트포르민" /></div>{f.med && <p className="mt-1 text-[8px] text-warn-700">비타민 K 가 많은 음식(시금치·케일)은 양을 일정하게 — 영양제도 함께 봅니다</p>}</Card>
      <Card><p className="font-bold">알레르기</p><div className="mt-1 flex flex-wrap gap-1"><Chip t="새우" on={!!f.allergy} tone="danger" /><Chip t="우유" /><Chip t="땅콩" /><Chip t="밀" /></div></Card>
      <Card className="flex items-center justify-between"><span className="font-bold">글자 크기</span><span className="flex gap-1"><Chip t="보통" on={!f.big} /><Chip t="더 크게" on={!!f.big} /></span></Card>
    </div>
  )
}

function Care({ f }: { f: F }) {
  return (
    <div>
      <div className="flex gap-1"><Chip t="사용법" on={!f.exercise} /><Chip t="운동" on={!!f.exercise} /><Chip t="암종 가이드" /><Chip t="근거 등급" /></div>
      {f.exercise ? (
        <Card className="mt-1.5"><p className="font-bold">오늘 운동</p><p className="text-[8.5px]">치료 중에도 걷기 같은 가벼운 활동을 유지하면 근육이 덜 빠집니다(ESPEN 2021 권고 12).</p><p className="mt-0.5 text-[8.5px]">이번 주 3일 · 20분씩 — 피로가 심한 날은 쉬세요.</p></Card>
      ) : (
        <Card className="mt-1.5"><div className="rounded-lg bg-brand-600 py-1.5 text-center font-bold text-white">▶ 움직이는 사용법 보기</div><p className="mt-1.5 font-bold">하루차림 사용하는 법</p><p className="text-[8.5px] text-stone-600">하루를 쓰는 순서대로 적었습니다. 필요하신 곳만 펴서 보셔도 됩니다.</p></Card>
      )}
    </div>
  )
}

function Image({ f }: { f: F }) {
  return (
    <div>
      {f.saved && <p className="mb-1.5 rounded bg-brand-50 px-1.5 py-1 text-[8.5px] text-brand-800">식단표 그림을 저장했습니다</p>}
      <div className="rounded-md border border-stone-300 bg-white p-1.5">
        <p className="text-[7px] font-bold text-brand-700">하루차림 식단표</p>
        <p className="text-[9px] font-bold">10/24(금) ~ 10/26(일) · 3일치</p>
        <table className="mt-1 w-full border-collapse text-[6.5px]">
          <thead><tr>{['날짜', '아침', '점심', '저녁'].map((h) => <th key={h} className="border border-stone-300 bg-brand-600 px-0.5 py-0.5 text-white">{h}</th>)}</tr></thead>
          <tbody>{PLAN_B.map(([d, m]) => <tr key={d}><th className="border border-stone-300 bg-brand-50 px-0.5 text-left text-[8px]">{d.slice(0, 1)}</th>{m.map((x) => <td key={x} className="border border-stone-300 px-0.5 align-top leading-tight">{x.replace(/ · /g, '\n')}</td>)}</tr>)}</tbody>
        </table>
        {!f.saved && <><p className="mt-1 text-[8px] font-bold">장보기 · 25가지</p><div className="grid grid-cols-3 gap-1 text-[6px] leading-tight"><p>□ 시금치 200 g<br />□ 청경채 80 g<br />□ 단호박 150 g</p><p>□ 두부 300 g (1모)<br />□ 닭안심 100 g<br />□ 오리고기 80 g</p><p>□ 꽃게 2마리<br />□ 배 2개<br />□ 단감 1개</p></div></>}
      </div>
      <p className="mt-1 text-center text-[8px] text-stone-500">{f.saved ? '냉장고에 붙이거나 보내세요 · 인쇄는 A4 한 장' : 'A4 한 장'}</p>
    </div>
  )
}

function Ending({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-brand-50 px-5 text-center">
      <span className="h-12 w-12 rounded-full bg-brand-600" />
      <p className="mt-3 text-base font-bold text-stone-900">여기까지입니다</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-stone-600">처음 등록 → 내가 고르고 추천받기 → 며칠치·장보기 → 기록·체중 → 영양제 → 몸 상태가 달라지면.</p>
      <button className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white" onClick={onMenu}>목차로</button>
    </div>
  )
}
