-- ═══════════════════════════════════════════════════════════
--  관리자 기능 — 앱 안에서 문의를 보고 답변한다
-- ═══════════════════════════════════════════════════════════

-- 1) 관리자 명단
create table if not exists public.of_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.of_admins enable row level security;
-- 명단 자체는 아무도 읽지 못한다. 아래 함수만 내부적으로 본다.

-- ⚠️ 여기에 선생님 Google 계정 이메일을 넣으세요
insert into public.of_admins (email)
values ('rohkwangwon@gmail.com')
on conflict (email) do nothing;


-- 2) 지금 로그인한 사람이 관리자인지 판별
create or replace function public.of_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.of_admins
     where email = nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'
  )
$$;

grant execute on function public.of_is_admin() to authenticated;


-- 3) 관리자는 모든 문의를 읽는다
drop policy if exists of_inq_select_admin on public.of_inquiries;
create policy of_inq_select_admin
  on public.of_inquiries
  for select
  to authenticated
  using ( public.of_is_admin() );


-- 4) 관리자는 답변을 쓴다
drop policy if exists of_inq_update_admin on public.of_inquiries;
create policy of_inq_update_admin
  on public.of_inquiries
  for update
  to authenticated
  using ( public.of_is_admin() )
  with check ( public.of_is_admin() );

grant update (answer, answered_at, status) on public.of_inquiries to authenticated;


-- 5) 관리자용 목록 (문의자 연락처까지 보인다)
drop view if exists public.of_admin_inquiries;
create view public.of_admin_inquiries
with (security_invoker = true) as
  select id, created_at, user_id, contact_email, kind, subject, body,
         app_version, status, answer, answered_at
    from public.of_inquiries;

grant select on public.of_admin_inquiries to authenticated;


-- 6) 시험용 글 정리와 불필요한 권한 회수
delete from public.of_inquiries
 where app_version = 'test'
    or contact_email in ('test@example.com','a@b.com','deploy-test@example.com');

revoke delete, truncate, references, trigger on public.of_inquiries from anon;
revoke delete, truncate, references, trigger on public.of_inquiries from authenticated;
revoke update on public.of_inquiries from anon;

drop function if exists public.of_whoami();
drop function if exists public.of_diag();


-- 7) 확인
select email as "등록된 관리자" from public.of_admins;
