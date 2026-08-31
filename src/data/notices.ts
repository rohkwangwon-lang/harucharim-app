/**
 * 앱 안 공지.
 *
 * 이용약관 10항과 개인정보처리방침 11항은 이렇게 약속하고 있다 —
 * "시행일 7일 전(이용자에게 불리한 변경은 30일 전)에 앱 안에 알리겠습니다."
 *
 * 그 약속을 지킬 자리가 앱에 없었다. 문서만 약속하고 수단이 없으면
 * 개정하는 날 바로 어기게 된다. 그래서 공지를 자료로 두고,
 * 날짜 간격은 검사(scripts/checks/notice.ts)가 기계적으로 본다 —
 * 7일을 못 채운 공지는 검사에서 걸려 배포 전에 멈춘다.
 *
 * 사람의 기억에 맡기지 않는 것이 요점이다.
 */

export type NoticeKind = 'terms' | 'privacy' | 'service'

export interface Notice {
  /** 'terms-2026-08-31' 처럼 종류와 날짜로 짓는다. 한 번 쓴 것은 바꾸지 않는다 — 읽음 표시가 이 값에 묶여 있다 */
  id: string
  kind: NoticeKind
  title: string
  /** 문단 단위. 짧게 끊어 적는다 */
  body: string[]
  /** 앱에 보이기 시작하는 날 (YYYY-MM-DD) */
  postAt: string
  /** 시행일. 약관·방침 개정이면 반드시 적는다 */
  effectiveAt?: string
  /** 이용자에게 불리한 변경인가. 참이면 30일 간격이 필요하고, 배너 대신 한 번 가리고 보여 준다 */
  adverse?: boolean
  /** 함께 열어 볼 문서 — public/ 아래 파일 이름 */
  link?: string
  linkLabel?: string
}

/** 며칠 전에 알려야 하는가 */
export const NOTICE_LEAD_DAYS = { normal: 7, adverse: 30 } as const

/**
 * 공지 목록. 새 것을 위에 적는다.
 *
 * 지난 공지도 지우지 않고 남긴다 — 무엇을 언제 알렸는지가 기록으로 남아야
 * 나중에 "알린 적 없다"는 다툼이 생기지 않는다.
 */
export const NOTICES: Notice[] = [
  {
    id: 'terms-2026-09-08',
    kind: 'terms',
    title: '이용약관과 개인정보처리방침을 고쳤습니다',
    body: [
      '문서끼리 어긋나던 곳과, 덜 밝힌 곳을 바로잡았습니다. 새로 받는 정보는 없습니다.',
      '로그인이 어떻게 쓰이는지, 문의 글에 적어 보내신 내용은 어떻게 되는지를 분명히 적었습니다. ' +
      '웹사이트 파일이 미국 GitHub 서버에서 오므로 접속 기록이 그곳에 남는다는 것도 국외 이전으로 따로 밝혔습니다.',
      '드신 것과 체중은 여전히 기기 안에만 둡니다. 이 점은 달라지지 않았습니다.'
    ],
    postAt: '2026-08-31',
    effectiveAt: '2026-09-08',
    link: 'terms.html',
    linkLabel: '이용약관 보기'
  }
]
