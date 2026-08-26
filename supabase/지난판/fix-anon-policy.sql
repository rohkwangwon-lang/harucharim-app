-- ═══════════════════════════════════════════════════════════
--  익명 문의가 막히는 문제 진단 + 수정
--  SQL Editor 에 붙여넣고 Run 하세요. 결과 표가 함께 나옵니다.
-- ═══════════════════════════════════════════════════════════

-- 1) 지금 어떤 정책이 걸려 있는지 확인
select policyname as "정책 이름",
       roles      as "적용 대상",
       cmd        as "동작",
       with_check as "쓰기 조건"
  from pg_policies
 where schemaname = 'public' and tablename = 'of_inquiries'
 order by policyname;


-- 2) 익명 쓰기 정책을 다시 만든다
--    (이미 있으면 지우고 새로 만들므로 여러 번 실행해도 안전하다)
drop policy if exists of_inq_insert_anon on public.of_inquiries;

create policy of_inq_insert_anon
  on public.of_inquiries
  for insert
  to anon
  with check ( user_id is null and contact_email is not null );


-- 3) 익명 사용자가 표에 접근할 권한 자체가 있는지 확인하고 부여한다
--    RLS 정책과 별개로 GRANT 가 없으면 아무것도 못 한다.
grant insert on public.of_inquiries to anon;
grant select, insert on public.of_inquiries to authenticated;


-- 4) 앱이 어떤 신분으로 접속하는지 알아보는 함수
--    Supabase 가 최근 API 키 체계를 바꿔서, 새 키가 anon 으로 인식되는지 확인이 필요하다.
create or replace function public.of_whoami()
returns text
language sql
stable
as $$ select coalesce(auth.role(), 'unknown') $$;

grant execute on function public.of_whoami() to anon, authenticated;


-- 5) 다시 확인
select policyname as "정책 이름", roles as "적용 대상", cmd as "동작"
  from pg_policies
 where schemaname = 'public' and tablename = 'of_inquiries'
 order by policyname;
