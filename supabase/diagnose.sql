-- ═══════════════════════════════════════════════════════════
--  진단 함수 추가 — 실행 후 제가 원격에서 상태를 확인합니다
--  전체를 드래그하지 말고 그냥 Run 을 눌러 주세요.
-- ═══════════════════════════════════════════════════════════

-- 표에 걸린 정책과 권한을 조회하는 함수
create or replace function public.of_diag()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'rls_enabled', (select relrowsecurity from pg_class where oid = 'public.of_inquiries'::regclass),
    'policies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', policyname, 'roles', roles::text, 'cmd', cmd, 'check', with_check
      ) order by policyname)
      from pg_policies where schemaname='public' and tablename='of_inquiries'
    ), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(distinct grantee || ':' || privilege_type)
      from information_schema.role_table_grants
      where table_schema='public' and table_name='of_inquiries'
        and grantee in ('anon','authenticated')
    ), '[]'::jsonb)
  )
$$;

grant execute on function public.of_diag() to anon, authenticated;

-- 확인용 (화면에도 표시됩니다)
select public.of_diag();
