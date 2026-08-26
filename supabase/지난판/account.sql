-- ═══════════════════════════════════════════════════════════
--  하루차림 — 계정 삭제
--
--  ▶ 한 번만 하면 됩니다.
--
--    1. supabase.com 로그인 → 이 프로젝트 선택
--    2. 왼쪽 메뉴 SQL Editor → New query
--    3. 이 파일 전체를 붙여넣고 Run (Ctrl+Enter)
--    4. 맨 아래에 "설치 완료" 한 줄이 나오면 끝입니다
--
--  ▶ 두 번 실행해도 괜찮습니다.
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
--  왜 필요한지
--
--  애플 App Store Review Guideline 5.1.1(v):
--  계정을 만들 수 있는 앱은 앱 안에서 계정을 삭제할 수 있어야 한다.
--  예외가 없다. 이게 없으면 심사에서 반려된다.
--
--  그리고 개인정보보호법 제36조(개인정보의 정정·삭제)도 같은 것을 요구한다.
--  '탈퇴하려면 메일을 보내세요' 는 요건을 채우지 못한다.
--
--  삭제는 진짜 삭제여야 한다. 비활성으로 두고 나중에 되살리는 방식은
--  애플이 반려 사유로 명시하고 있다.
-- ═══════════════════════════════════════════════════════════

create or replace function public.of_delete_me()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '로그인 상태가 아닙니다';
  end if;

  /*
   * 남기신 문의를 먼저 지운다.
   *
   * auth.users 를 지우면 of_inquiries.user_id 가 어떻게 되는지는
   * 그 표의 외래키 설정에 달렸는데, 설정에 기대지 않고 여기서 분명히 지운다.
   * '계정은 지웠는데 문의 본문은 남아 있다' 가 가장 나쁜 결과다.
   */
  delete from public.of_inquiries where user_id = uid;

  /*
   * 이용 통계는 계정과 이어져 있지 않다(기기에서 만든 무작위 번호로만 묶는다).
   * 그래서 여기서 지울 대상이 없다 — 앱이 기기 쪽에서 of_forget() 을 따로 부른다.
   * 이어져 있지 않다는 것이 이 자리에서 확인된다.
   */

  /* 마지막으로 계정 자체 */
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.of_delete_me() to authenticated;

-- ═══════════════════════════════════════════════════════════
select '설치 완료 — 앱에서 계정 삭제가 가능해졌습니다' as 결과
  from pg_proc
 where proname = 'of_delete_me'
 limit 1;
