-- ═══════════════════════════════════════════════════════════
--  하루차림 — 서버 설치 (전부)
--
--  ▶ 이 파일 하나만 실행하시면 됩니다.
--
--    1. supabase.com 로그인 → 이 프로젝트 선택
--    2. 왼쪽 메뉴 SQL Editor → New query
--    3. 이 파일 전체를 붙여넣고 오른쪽 아래 Run (또는 Ctrl+Enter)
--    4. 맨 아래에 표가 하나 나옵니다. 다섯 줄 모두 '완료' 면 끝입니다.
--
--  ▶ 두 번, 세 번 실행해도 안전합니다.
--    이미 있는 것은 건드리지 않고, 이미 넣은 관리자도 중복되지 않습니다.
--
--  ▶ 예전에 나눠 두었던 파일들(oncofood-schema · admin · admin2 ·
--    fix-anon-policy · stats · account)을 순서대로 합친 것입니다.
--    그 파일들을 따로 실행하실 필요는 없습니다.
--    순서가 중요한 곳이 있어서 하나로 묶었습니다 —
--    예컨대 관리자 판별 함수는 두 판이 있는데 나중 판이 이겨야 하고,
--    통계 함수들은 서로를 부르므로 부르는 쪽보다 먼저 만들어져야 합니다.
--
--  ▶ 무엇이 설치되는지
--      1. 문의 (1:1 문의와 답변)
--      2. 관리자 (누가 관리자인지, 관리자만 보는 목록)
--      3. 이용 통계 (동의하신 분의 익명 집계)
--      4. 계정 삭제 (애플 심사 요건)
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════
--  1. 문의
--
--  받는 범위를 자료에 관한 것으로 한정한다.
--  개별 치료 상담을 앱으로 받으면 진료가 되어 버리고, 그건 이 앱이 할 일이 아니다.
--  자기 문의만 보이고, 남의 글은 관리자만 본다.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.of_inquiries (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  -- 로그인한 경우에만 채워진다. 익명 문의는 null.
  user_id       uuid references auth.users(id) on delete set null,
  -- 답변받을 곳. 로그인했으면 계정 이메일이 들어간다.
  contact_email text,
  kind          text not null check (kind in ('food', 'supplement', 'error', 'etc')),
  subject       text not null check (char_length(subject) between 1 and 120),
  body          text not null check (char_length(body) between 1 and 2000),
  -- 어떤 화면에서 보냈는지. 재현에 도움이 된다. 암종 같은 건강정보는 담지 않는다.
  app_version   text,
  status        text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer        text,
  answered_at   timestamptz
);

create index if not exists of_inquiries_user_idx   on public.of_inquiries (user_id, created_at desc);
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

-- 로그인하지 않은 분도 문의는 남길 수 있다. 다만 남의 글을 읽지는 못한다.
drop policy if exists of_inq_insert_anon on public.of_inquiries;
create policy of_inq_insert_anon on public.of_inquiries
  for insert to anon
  with check (user_id is null and contact_email is not null);

/*
 * 정책과 별개로 GRANT 가 없으면 아무것도 못 한다.
 * 예전에 익명 문의가 막혔던 원인이 여기였다 — 정책은 맞는데 권한이 없었다.
 */
grant insert         on public.of_inquiries to anon;
grant select, insert on public.of_inquiries to authenticated;

-- 관리자가 답변할 때 쓰는 함수 (대시보드에서만 부른다)
--   select public.of_answer('문의 id', '답변 내용');
create or replace function public.of_answer(p_id uuid, p_answer text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.of_inquiries
     set answer = p_answer, answered_at = now(), status = 'answered'
   where id = p_id;
$$;

revoke all on function public.of_answer(uuid, text) from public, anon, authenticated;

-- 내 문의 목록 (앱에서 읽는다)
create or replace view public.of_my_inquiries as
  select id, created_at, kind, subject, body, status, answer, answered_at
    from public.of_inquiries
   where user_id = auth.uid()
   order by created_at desc;


-- ═══════════════════════════════════════════════════════════
--  2. 관리자
--
--  이메일로도, 계정 식별자로도 등록할 수 있게 한다.
--  카카오 로그인은 이메일을 주지 않으므로 식별자 쪽이 필요하다.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.of_admins (
  email      text,
  created_at timestamptz not null default now()
);

alter table public.of_admins enable row level security;
-- 명단 자체는 아무도 읽지 못한다. 아래 함수만 내부적으로 본다.

alter table public.of_admins add column if not exists user_id uuid;
alter table public.of_admins alter column email drop not null;
alter table public.of_admins add column if not exists id bigserial;

-- email 이 기본키였던 판에서 넘어오는 경우
alter table public.of_admins drop constraint if exists of_admins_pkey;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'of_admins_pkey') then
    alter table public.of_admins add primary key (id);
  end if;
end $$;

create unique index if not exists of_admins_email_uniq on public.of_admins (email)   where email   is not null;
create unique index if not exists of_admins_user_uniq  on public.of_admins (user_id) where user_id is not null;

-- ⚠️ 관리자 계정. 다른 분을 더하시려면 아래를 따라 한 줄 추가하세요.
insert into public.of_admins (email) values ('rohkwangwon@gmail.com') on conflict do nothing;
insert into public.of_admins (email) values ('drnkw@hotmail.com')     on conflict do nothing;

/*
 * 지금 로그인한 사람이 관리자인지.
 *
 * 이 함수가 이 파일에서 가장 중요하다 — 통계와 문의 관리가 전부 여기에 기댄다.
 * 이메일 또는 계정 식별자 중 하나만 맞아도 관리자로 본다.
 */
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

-- 관리자는 모든 문의를 읽는다
drop policy if exists of_inq_select_admin on public.of_inquiries;
create policy of_inq_select_admin on public.of_inquiries
  for select to authenticated
  using ( public.of_is_admin() );

-- 관리자는 답변을 쓴다
drop policy if exists of_inq_update_admin on public.of_inquiries;
create policy of_inq_update_admin on public.of_inquiries
  for update to authenticated
  using ( public.of_is_admin() )
  with check ( public.of_is_admin() );

grant update (answer, answered_at, status) on public.of_inquiries to authenticated;

-- 관리자용 목록 (문의자 연락처까지 보인다)
drop view if exists public.of_admin_inquiries;
create view public.of_admin_inquiries
with (security_invoker = true) as
  select id, created_at, user_id, contact_email, kind, subject, body,
         app_version, status, answer, answered_at
    from public.of_inquiries;

grant select on public.of_admin_inquiries to authenticated;

-- 필요 없는 권한은 거둔다
revoke delete, truncate, references, trigger on public.of_inquiries from anon;
revoke delete, truncate, references, trigger on public.of_inquiries from authenticated;
revoke update on public.of_inquiries from anon;

-- 예전에 만들었던 진단용 함수 정리
drop function if exists public.of_whoami();
drop function if exists public.of_diag();


-- ═══════════════════════════════════════════════════════════
--  3. 이용 통계
--
--  이 앱이 다루는 것은 암종·치료 시기·체중이다. 개인정보보호법 제23조의
--  민감정보(건강에 관한 정보)에 해당하고, 다른 개인정보와 달리 '별도의 동의'
--  없이는 처리 자체가 금지된다. 위반은 5년 이하 징역 또는 5천만원 이하 벌금이다.
--
--  그래서 세 가지를 지킨다.
--
--  1. 동의하신 분의 것만 올린다. 기본은 꺼져 있다.
--  2. 계정과 잇지 않는다. 기기에서 만든 무작위 번호(pid)만 쓴다.
--     그 번호로는 누구인지 되짚을 수 없고, 로그인 계정과도 이어지지 않는다.
--  3. 원본을 쌓지 않는다. 나이는 연령대로, 체중은 BMI 구간으로 뭉개서 올린다.
--     식단 내용·체중 수치·문의 본문은 애초에 올리지 않는다.
--
--  관리자가 보는 것도 개인이 아니라 집계다. 다섯 명 미만인 칸은 가린다 —
--  "45~49세 남성 담도암 1명" 은 집계가 아니라 사람을 가리키기 때문이다.
-- ═══════════════════════════════════════════════════════════

-- ── 이용자 — 한 기기(설치)당 한 줄 ─────────────────────────
create table if not exists public.of_users (
  pid          uuid primary key,
  first_seen   date        not null default (now() at time zone 'Asia/Seoul')::date,
  last_seen    date        not null default (now() at time zone 'Asia/Seoul')::date,
  -- 어떤 상황인지 (뭉갠 값만)
  cancer       text,
  phase        text,
  sex          text check (sex in ('M', 'F')),
  age_band     text,          -- '40대' 처럼 열 살 단위
  bmi_band     text,          -- '저체중' '정상' '과체중' '비만'
  subtypes     text[],        -- 호르몬 수용체 등 — 그 자체로는 사람을 가리키지 못한다
  cond_n       smallint,      -- 증상 '가짓수' 만. 어떤 증상인지는 보내지 않는다
  med_n        smallint,
  -- 계정을 만드셨는지 (누구인지는 모른다)
  signed_in    boolean     not null default false,
  provider     text,
  -- 어떻게 알게 되셨는지. 처음 설정에서 고르신 항목이며, 정해진 값만 들어온다.
  -- 자유 입력을 받지 않으므로 이 칸이 신원 단서가 될 여지가 없다.
  source       text        check (source in ('cafe','search','sns','video','person','clinic','etc')),
  app_version  text,
  consent_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 예전 판에서 넘어오는 경우를 위해
alter table public.of_users add column if not exists source text;

-- ── 접속한 날 — 재방문율을 보려면 날짜별로 필요하다 ────────
create table if not exists public.of_active (
  pid  uuid not null references public.of_users(pid) on delete cascade,
  day  date not null,
  primary key (pid, day)
);
create index if not exists of_active_day on public.of_active (day);

-- ── 무엇을 하셨는지 — 하루 단위로 세어서 올린다 ────────────
--
--    낱낱의 행동을 시각까지 적어 두면 그 자체가 사람을 따라다니는 기록이 된다.
--    "이 사람이 8월 12일에 추천을 4번 눌렀다" 까지만 알면 충분하다.
create table if not exists public.of_events (
  pid   uuid not null references public.of_users(pid) on delete cascade,
  day   date not null,
  name  text not null,
  n     integer not null default 0,
  primary key (pid, day, name)
);
create index if not exists of_events_day_name on public.of_events (day, name);

-- ── 영양제 수요 — 사람에 붙이지 않는 순수 집계 ─────────────
create table if not exists public.of_demand (
  day       date not null,
  category  text not null,
  level     text not null check (level in ('recommend', 'consider', 'shortfall')),
  n         integer not null default 0,
  primary key (day, category, level)
);

alter table public.of_users  enable row level security;
alter table public.of_active enable row level security;
alter table public.of_events enable row level security;
alter table public.of_demand enable row level security;

-- 아무도 직접 읽지 못한다. 관리자도 아래 집계 함수로만 본다.
-- 쓰기도 정책 대신 함수로만 연다 — 남의 pid 줄을 고칠 수 없게 하기 위해서다.

create or replace function public.of_track(
  p_pid        uuid,
  p_cancer     text,
  p_phase      text,
  p_sex        text,
  p_age_band   text,
  p_bmi_band   text,
  p_subtypes   text[],
  p_cond_n     smallint,
  p_med_n      smallint,
  p_signed_in  boolean,
  p_provider   text,
  p_source     text,
  p_version    text,
  p_events     jsonb,   -- {"name": n, ...}
  p_demand     jsonb    -- [{"category": "...", "level": "...", "n": 1}, ...]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
  k text;
  v jsonb;
begin
  /*
   * 뭉갠 값인지 여기서 한 번 더 본다.
   * 앱이 잘못 보내더라도 원본 나이나 체중이 그대로 쌓이면 안 된다.
   */
  if p_age_band is not null and p_age_band !~ '^(10대|20대|30대|40대|50대|60대|70대|80대 이상)$' then
    raise exception '연령대 값이 뭉개지지 않았습니다';
  end if;

  insert into public.of_users as u (
    pid, cancer, phase, sex, age_band, bmi_band, subtypes,
    cond_n, med_n, signed_in, provider, source, app_version, last_seen, updated_at
  ) values (
    p_pid, p_cancer, p_phase, p_sex, p_age_band, p_bmi_band, p_subtypes,
    p_cond_n, p_med_n, coalesce(p_signed_in, false), p_provider,
    nullif(lower(trim(p_source)), ''), p_version, d, now()
  )
  on conflict (pid) do update set
    cancer = excluded.cancer, phase = excluded.phase, sex = excluded.sex,
    age_band = excluded.age_band, bmi_band = excluded.bmi_band,
    subtypes = excluded.subtypes, cond_n = excluded.cond_n, med_n = excluded.med_n,
    signed_in = excluded.signed_in or u.signed_in,
    provider = coalesce(excluded.provider, u.provider),
    /* 유입 경로는 처음 것을 지킨다 — 나중 방문으로 덮이면 유입 경로가 아니게 된다 */
    source = coalesce(u.source, excluded.source),
    app_version = excluded.app_version, last_seen = d, updated_at = now();

  insert into public.of_active (pid, day) values (p_pid, d)
  on conflict do nothing;

  if p_events is not null then
    for k, v in select * from jsonb_each(p_events) loop
      insert into public.of_events (pid, day, name, n)
      values (p_pid, d, k, (v #>> '{}')::int)
      on conflict (pid, day, name) do update set n = of_events.n + excluded.n;
    end loop;
  end if;

  if p_demand is not null then
    insert into public.of_demand (day, category, level, n)
    select d, e ->> 'category', e ->> 'level', (e ->> 'n')::int
      from jsonb_array_elements(p_demand) e
    on conflict (day, category, level) do update set n = of_demand.n + excluded.n;
  end if;
end;
$$;

grant execute on function public.of_track(
  uuid, text, text, text, text, text, text[], smallint, smallint,
  boolean, text, text, text, jsonb, jsonb
) to anon, authenticated;

-- 동의를 거두시면 지운다. 개인정보보호법 제37조(처리정지 요구권).
create or replace function public.of_forget(p_pid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.of_users where pid = p_pid;
$$;

grant execute on function public.of_forget(uuid) to anon, authenticated;


-- ── 보기 — 관리자만, 그리고 집계만 ─────────────────────────
--
-- 다섯 명 미만인 칸은 숫자를 내주지 않는다.
-- 암종·연령대·성별을 함께 놓고 보면 칸이 잘게 쪼개진다.
-- "50대 여성 담도암 1명" 은 통계가 아니라 특정 개인이다.

create or replace function public.of_stat_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else jsonb_build_object(
    'total',      (select count(*) from public.of_users),
    'signed_in',  (select count(*) from public.of_users where signed_in),
    'new_7',      (select count(*) from public.of_users
                    where first_seen > (now() at time zone 'Asia/Seoul')::date - 7),
    'new_30',     (select count(*) from public.of_users
                    where first_seen > (now() at time zone 'Asia/Seoul')::date - 30),
    'dau',        (select count(*) from public.of_active
                    where day = (now() at time zone 'Asia/Seoul')::date),
    'wau',        (select count(distinct pid) from public.of_active
                    where day > (now() at time zone 'Asia/Seoul')::date - 7),
    'mau',        (select count(distinct pid) from public.of_active
                    where day > (now() at time zone 'Asia/Seoul')::date - 30),
    'open_inq',   (select count(*) from public.of_inquiries where status = 'open')
  ) end
$$;

/* 날짜별 — 신규와 접속 */
create or replace function public.of_stat_daily(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else coalesce(
    (select jsonb_agg(jsonb_build_object('day', d, 'active', a, 'new', nu) order by d)
       from (
         select g::date as d,
                (select count(*) from public.of_active x where x.day = g::date) as a,
                (select count(*) from public.of_users u where u.first_seen = g::date) as nu
           from generate_series(
             (now() at time zone 'Asia/Seoul')::date - (p_days - 1),
             (now() at time zone 'Asia/Seoul')::date, '1 day') g
       ) t), '[]'::jsonb) end
$$;

/* 어떤 분들인지 — 칸별로 세되 작은 칸은 가린다 */
create or replace function public.of_stat_who()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else jsonb_build_object(
    'cancer',   (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
                   from (select cancer k, count(*) n from public.of_users
                          where cancer is not null group by 1 having count(*) >= 5) t),
    'phase',    (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
                   from (select phase k, count(*) n from public.of_users
                          where phase is not null group by 1 having count(*) >= 5) t),
    'age',      (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by k), '[]'::jsonb)
                   from (select age_band k, count(*) n from public.of_users
                          where age_band is not null group by 1 having count(*) >= 5) t),
    'sex',      (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
                   from (select sex k, count(*) n from public.of_users
                          where sex is not null group by 1 having count(*) >= 5) t),
    'bmi',      (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
                   from (select bmi_band k, count(*) n from public.of_users
                          where bmi_band is not null group by 1 having count(*) >= 5) t),
    'hidden',   (select count(*) from (select 1 from public.of_users
                          where cancer is not null group by cancer having count(*) < 5) t)
  ) end
$$;

/* 무엇을 쓰시는지 */
create or replace function public.of_stat_use(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else coalesce(
    (select jsonb_agg(jsonb_build_object('k', name, 'n', total, 'users', users) order by users desc)
       from (select name, sum(n) total, count(distinct pid) users
               from public.of_events
              where day > (now() at time zone 'Asia/Seoul')::date - p_days
              group by name) t), '[]'::jsonb) end
$$;

/*
 * 그 간격을 지날 만큼 시간이 흐른 분들만 분모에 넣는다.
 *
 * 아래 of_stat_return 이 이 함수를 부르므로 반드시 먼저 정의되어야 한다.
 * 순서를 바꿔 두었더니 설치가 통째로 실패했다 — PostgreSQL 은 SQL 함수의 본문을
 * 만드는 시점에 검사하므로, 아직 없는 함수를 부르면 그 자리에서 멈춘다.
 */
create or replace function public.of_return_rate(p_gap int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select pid, first_seen from public.of_users
     where first_seen <= (now() at time zone 'Asia/Seoul')::date - p_gap
  )
  select jsonb_build_object(
    'base', (select count(*) from base),
    'kept', (select count(*) from base b
              where exists (select 1 from public.of_active a
                             where a.pid = b.pid and a.day >= b.first_seen + p_gap))
  )
$$;

/* 다시 오시는지 — 처음 오신 날로부터 며칠 뒤에 다시 오셨나 */
create or replace function public.of_stat_return()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else jsonb_build_object(
    'd1',  public.of_return_rate(1),
    'd7',  public.of_return_rate(7),
    'd30', public.of_return_rate(30)
  ) end
$$;

/* 영양제 수요 — 무엇이 실제로 필요한지 보는 자리 */
create or replace function public.of_stat_demand(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else coalesce(
    (select jsonb_agg(jsonb_build_object('k', category, 'rec', rec, 'short', short) order by rec + short desc)
       from (select category,
                    sum(n) filter (where level in ('recommend', 'consider')) rec,
                    sum(n) filter (where level = 'shortfall') short
               from public.of_demand
              where day > (now() at time zone 'Asia/Seoul')::date - p_days
              group by category) t), '[]'::jsonb) end
$$;

/*
 * 어디서 오신 분들이 남으시는가.
 *
 * 사람 수만 세면 판단을 그르친다. 백 명이 들어와 다 나가는 곳보다
 * 스무 명이 들어와 남는 곳이 낫다. 그래서 유입 경로마다 7일 재방문을 함께 낸다.
 */
create or replace function public.of_stat_source()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else coalesce(
    (select jsonb_agg(jsonb_build_object('k', k, 'n', n, 'kept7', kept7, 'base7', base7) order by n desc)
       from (
         select coalesce(u.source, '(직접)') k,
                count(*) n,
                count(*) filter (
                  where u.first_seen <= (now() at time zone 'Asia/Seoul')::date - 7
                    and exists (select 1 from public.of_active a
                                 where a.pid = u.pid and a.day >= u.first_seen + 7)) kept7,
                count(*) filter (
                  where u.first_seen <= (now() at time zone 'Asia/Seoul')::date - 7) base7
           from public.of_users u
          group by 1
         having count(*) >= 5
       ) t), '[]'::jsonb) end
$$;

grant execute on function public.of_stat_overview()   to authenticated;
grant execute on function public.of_stat_daily(int)   to authenticated;
grant execute on function public.of_stat_who()        to authenticated;
grant execute on function public.of_stat_use(int)     to authenticated;
grant execute on function public.of_return_rate(int)  to authenticated;
grant execute on function public.of_stat_return()     to authenticated;
grant execute on function public.of_stat_demand(int)  to authenticated;
grant execute on function public.of_stat_source()     to authenticated;


-- ═══════════════════════════════════════════════════════════
--  4. 계정 삭제
--
--  애플 App Store Review Guideline 5.1.1(v):
--  계정을 만들 수 있는 앱은 앱 안에서 계정을 삭제할 수 있어야 한다.
--  예외가 없다. 이게 없으면 심사에서 반려된다.
--
--  개인정보보호법 제36조(개인정보의 정정·삭제)도 같은 것을 요구한다.
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
   * 외래키 설정에 기대지 않고 여기서 분명히 지운다 —
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
--  설치 확인 — 다섯 줄 모두 '완료' 여야 합니다
-- ═══════════════════════════════════════════════════════════
with chk(순번, 항목, 있어야_할_수, 실제) as (
  select 1, '문의 표', 1,
         (select count(*) from information_schema.tables
           where table_schema = 'public' and table_name = 'of_inquiries')
  union all
  select 2, '관리자 (등록된 사람 수)', 1,
         (select count(*) from public.of_admins)
  union all
  select 3, '통계 표 4종', 4,
         (select count(*) from information_schema.tables
           where table_schema = 'public'
             and table_name in ('of_users','of_active','of_events','of_demand'))
  union all
  select 4, '통계 함수 8종', 8,
         (select count(distinct proname) from pg_proc
           where pronamespace = 'public'::regnamespace
             and proname in ('of_track','of_forget','of_stat_overview','of_stat_daily',
                             'of_stat_who','of_stat_use','of_stat_return','of_stat_demand'))
  union all
  select 5, '계정 삭제', 1,
         (select count(*) from pg_proc
           where pronamespace = 'public'::regnamespace and proname = 'of_delete_me')
)
select 항목,
       실제 as "확인된 수",
       case when 실제 >= 있어야_할_수 then '완료' else '⚠ 다시 확인하세요' end as 결과
  from chk
 order by 순번;
