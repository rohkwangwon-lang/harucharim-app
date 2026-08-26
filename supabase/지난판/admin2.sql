-- ═══════════════════════════════════════════════════════════
--  관리자 확장 — 이메일이 없는 계정(카카오)도 등록할 수 있게
-- ═══════════════════════════════════════════════════════════

-- 1) 계정 식별자로도 등록할 수 있도록 열을 늘린다
alter table public.of_admins add column if not exists user_id uuid;
alter table public.of_admins alter column email drop not null;

-- email 이 기본키였으므로, 둘 중 하나만 있어도 되게 바꾼다
alter table public.of_admins drop constraint if exists of_admins_pkey;
alter table public.of_admins add column if not exists id bigserial;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'of_admins_pkey'
  ) then
    alter table public.of_admins add primary key (id);
  end if;
end $$;

create unique index if not exists of_admins_email_uniq on public.of_admins (email) where email is not null;
create unique index if not exists of_admins_user_uniq  on public.of_admins (user_id) where user_id is not null;


-- 2) 관리자 추가
insert into public.of_admins (email)
values ('rohkwangwon@gmail.com')
on conflict do nothing;

insert into public.of_admins (email)
values ('drnkw@hotmail.com')
on conflict do nothing;


-- 3) 판별 함수 — 이메일 또는 계정 식별자가 맞으면 관리자
create or replace function public.of_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.of_admins a
     where (a.email is not null
            and a.email = nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
        or (a.user_id is not null and a.user_id = auth.uid())
  )
$$;

grant execute on function public.of_is_admin() to authenticated;


-- 4) 확인
select coalesce(email, user_id::text) as "등록된 관리자" from public.of_admins order by id;
