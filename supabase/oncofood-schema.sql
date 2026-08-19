-- ═══════════════════════════════════════════════════════════════
--  온코푸드 — 1:1 문의 스키마
--
--  Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
--  환자용 앱과 같은 프로젝트를 쓰므로, 표 이름 앞에 of_ 를 붙여 구분합니다.
--
--  설계 원칙
--   · 문의는 "데이터 추가 요청과 오류 신고"용입니다. 개별 치료 상담을 받지 않습니다.
--     화면에서도 그렇게 안내하고, 여기 유형 목록에도 상담 항목을 두지 않습니다.
--   · 자기 문의만 보이게 합니다. 다른 사람의 글은 관리자만 봅니다.
--   · 로그인하지 않은 분도 문의할 수 있게 하되, 답변은 이메일로 받게 합니다.
-- ═══════════════════════════════════════════════════════════════

-- ── 문의 ──────────────────────────────────────────────────────
create table if not exists public.of_inquiries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- 로그인한 경우에만 채워집니다. 익명 문의는 null 입니다.
  user_id      uuid references auth.users(id) on delete set null,

  -- 답변받을 곳. 로그인했으면 계정 이메일이 들어갑니다.
  contact_email text,

  kind         text not null check (kind in ('food', 'supplement', 'error', 'etc')),
  -- 요청하는 음식·영양제 이름 (오류 신고면 문제가 있는 항목 이름)
  subject      text not null check (char_length(subject) between 1 and 120),
  body         text not null check (char_length(body) between 1 and 2000),

  -- 어떤 화면에서 보냈는지. 재현에 도움이 됩니다. 암종 같은 건강정보는 담지 않습니다.
  app_version  text,

  status       text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer       text,
  answered_at  timestamptz
);

create index if not exists of_inquiries_user_idx on public.of_inquiries (user_id, created_at desc);
create index if not exists of_inquiries_status_idx on public.of_inquiries (status, created_at desc);

alter table public.of_inquiries enable row level security;

-- 로그인한 사람은 자기 문의만 읽는다
drop policy if exists of_inq_select_own on public.of_inquiries;
create policy of_inq_select_own on public.of_inquiries
  for select to authenticated
  using (user_id = auth.uid());

-- 로그인한 사람은 자기 이름으로만 쓴다
drop policy if exists of_inq_insert_auth on public.of_inquiries;
create policy of_inq_insert_auth on public.of_inquiries
  for insert to authenticated
  with check (user_id = auth.uid());

-- 로그인하지 않은 사람도 문의는 남길 수 있다. 다만 남의 글을 읽지는 못한다.
drop policy if exists of_inq_insert_anon on public.of_inquiries;
create policy of_inq_insert_anon on public.of_inquiries
  for insert to anon
  with check (user_id is null and contact_email is not null);

-- 수정·삭제는 아무도 못 한다. 관리자는 service_role 로 대시보드에서 처리한다.


-- ── 관리자가 답변할 때 쓰는 함수 ───────────────────────────────
-- 대시보드 SQL Editor 에서 아래처럼 부르면 됩니다.
--   select public.of_answer('문의 id', '답변 내용');
create or replace function public.of_answer(p_id uuid, p_answer text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.of_inquiries
     set answer = p_answer,
         answered_at = now(),
         status = 'answered'
   where id = p_id;
$$;

revoke all on function public.of_answer(uuid, text) from public, anon, authenticated;


-- ── 안 읽은 답변이 있는지 확인용 뷰 ────────────────────────────
create or replace view public.of_my_inquiries as
  select id, created_at, kind, subject, body, status, answer, answered_at
    from public.of_inquiries
   where user_id = auth.uid()
   order by created_at desc;
