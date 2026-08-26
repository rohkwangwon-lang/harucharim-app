-- ═══════════════════════════════════════════════════════════
--  이용 통계 — 가입자의 상황과 쓰임새를 본다
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

-- ───────────────────────────────────────────────────────────
-- 1) 이용자 — 한 기기(설치)당 한 줄
-- ───────────────────────────────────────────────────────────
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
  cond_n       smallint,      -- 증상 '가짓수' 만. 어떤 증상인지는 아래 집계로만 본다
  med_n        smallint,
  -- 계정을 만드셨는지 (누구인지는 모른다)
  signed_in    boolean     not null default false,
  provider     text,
  app_version  text,
  consent_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────
-- 2) 접속한 날 — 재방문율을 보려면 날짜별로 필요하다
-- ───────────────────────────────────────────────────────────
create table if not exists public.of_active (
  pid  uuid not null references public.of_users(pid) on delete cascade,
  day  date not null,
  primary key (pid, day)
);
create index if not exists of_active_day on public.of_active (day);

-- ───────────────────────────────────────────────────────────
-- 3) 무엇을 하셨는지 — 하루 단위로 세어서 올린다
--
--    낱낱의 행동을 시각까지 적어 두면 그 자체가 사람을 따라다니는 기록이 된다.
--    "이 사람이 8월 12일에 추천을 4번 눌렀다" 까지만 알면 충분하다.
-- ───────────────────────────────────────────────────────────
create table if not exists public.of_events (
  pid   uuid not null references public.of_users(pid) on delete cascade,
  day   date not null,
  name  text not null,
  n     integer not null default 0,
  primary key (pid, day, name)
);
create index if not exists of_events_day_name on public.of_events (day, name);

-- ───────────────────────────────────────────────────────────
-- 4) 영양제 수요 — 사람에 붙이지 않는 순수 집계
--
--    "이 분류가 며칠에 걸쳐 몇 사람에게 권고되었나". 개인과 잇지 않으므로
--    pid 를 두지 않는다. 어떤 분류가 실제로 필요한지 보는 자리다.
-- ───────────────────────────────────────────────────────────
create table if not exists public.of_demand (
  day       date not null,
  category  text not null,
  level     text not null check (level in ('recommend', 'consider', 'shortfall')),
  n         integer not null default 0,
  primary key (day, category, level)
);

-- ═══════════════════════════════════════════════════════════
--  올리기 — 익명 사용자가 자기 줄만 쓴다
-- ═══════════════════════════════════════════════════════════
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
    cond_n, med_n, signed_in, provider, app_version, last_seen, updated_at
  ) values (
    p_pid, p_cancer, p_phase, p_sex, p_age_band, p_bmi_band, p_subtypes,
    p_cond_n, p_med_n, coalesce(p_signed_in, false), p_provider, p_version, d, now()
  )
  on conflict (pid) do update set
    cancer = excluded.cancer, phase = excluded.phase, sex = excluded.sex,
    age_band = excluded.age_band, bmi_band = excluded.bmi_band,
    subtypes = excluded.subtypes, cond_n = excluded.cond_n, med_n = excluded.med_n,
    signed_in = excluded.signed_in or u.signed_in,
    provider = coalesce(excluded.provider, u.provider),
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
  boolean, text, text, jsonb, jsonb
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


-- ═══════════════════════════════════════════════════════════
--  보기 — 관리자만, 그리고 집계만
-- ═══════════════════════════════════════════════════════════

/*
 * 다섯 명 미만인 칸은 숫자를 내주지 않는다.
 *
 * 암종·연령대·성별을 함께 놓고 보면 칸이 잘게 쪼개진다.
 * "50대 여성 담도암 1명" 은 통계가 아니라 특정 개인이다.
 * 통계청과 개인정보위가 가명정보 결합에서 쓰는 것과 같은 방식이다.
 */
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

/* 다시 오시는지 — 처음 오신 날로부터 며칠 뒤에 다시 오셨나 */
create or replace function public.of_stat_return()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.of_is_admin() then null else jsonb_build_object(
    'd1', public.of_return_rate(1),
    'd7', public.of_return_rate(7),
    'd30', public.of_return_rate(30)
  ) end
$$;

create or replace function public.of_return_rate(p_gap int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  /* 그 간격을 지날 만큼 시간이 흐른 분들만 분모에 넣는다 */
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

/* 영양제 수요 — 수익 사업을 가늠하는 자리 */
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

grant execute on function public.of_stat_overview()   to authenticated;
grant execute on function public.of_stat_daily(int)   to authenticated;
grant execute on function public.of_stat_who()        to authenticated;
grant execute on function public.of_stat_use(int)     to authenticated;
grant execute on function public.of_stat_return()     to authenticated;
grant execute on function public.of_return_rate(int)  to authenticated;
grant execute on function public.of_stat_demand(int)  to authenticated;
