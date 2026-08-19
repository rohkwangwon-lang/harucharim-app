/**
 * 공개 단계 설정.
 *
 * 지금은 선생님이 실제 환자 대상으로 내용을 검수하는 단계다.
 * 검수가 끝나 정식 공개로 넘어갈 때 아래 세 곳을 함께 되돌린다.
 *   1) 이 파일의 REVIEW_MODE 를 false 로
 *   2) index.html 의 <meta name="robots" content="noindex, nofollow" /> 삭제
 *   3) public/robots.txt 삭제
 */
export const REVIEW_MODE = true
