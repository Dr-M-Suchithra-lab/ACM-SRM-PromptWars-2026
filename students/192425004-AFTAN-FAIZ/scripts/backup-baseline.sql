-- Read-only manifest for an operator-controlled backup rehearsal. No row values,
-- passwords, tokens or credential hashes are printed. Keep its output private.
begin transaction read only;
select jsonb_build_object(
  'database_version', current_setting('server_version'),
  'required_counts', jsonb_build_object(
    'auth.users', (select count(*) from auth.users),
    'auth.identities', (select count(*) from auth.identities),
    'organizations', (select count(*) from public.organizations),
    'organization_members', (select count(*) from public.organization_members),
    'sector_configurations', (select count(*) from public.sector_configurations),
    'pay_policies', (select count(*) from public.pay_policies),
    'shifts', (select count(*) from public.shifts),
    'payroll_entries', (select count(*) from public.payroll_entries),
    'pay_disputes', (select count(*) from public.pay_disputes),
    'dispute_events', (select count(*) from public.dispute_events),
    'safety_reports', (select count(*) from public.safety_reports),
    'safety_case_events', (select count(*) from public.safety_case_events),
    'pay_policy_events', (select count(*) from public.pay_policy_events),
    'private.gateway_accounts', (select count(*) from private.gateway_accounts),
    'private.safety_credentials', (select count(*) from private.safety_credentials)
  ),
  'record_digests', jsonb_build_object(
    'auth.users', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from auth.users t),
    'auth.identities', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from auth.identities t),
    'organizations', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.organizations t),
    'organization_members', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by organization_id,user_id),'')) from public.organization_members t),
    'pay_policies', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by organization_id),'')) from public.pay_policies t),
    'shifts', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.shifts t),
    'payroll_entries', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by shift_id),'')) from public.payroll_entries t),
    'pay_disputes', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.pay_disputes t),
    'dispute_events', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.dispute_events t),
    'safety_reports', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.safety_reports t),
    'safety_case_events', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.safety_case_events t),
    'private.gateway_accounts', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text),'')) from private.gateway_accounts t),
    'private.safety_credentials', (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text),'')) from private.safety_credentials t)
  ),
  'functions', (select jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'name', p.proname,
    'arguments', pg_get_function_identity_arguments(p.oid),
    'definition_md5', md5(pg_get_functiondef(p.oid)),
    'security_definer', p.prosecdef
  ) order by n.nspname,p.proname,p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prokind in ('f','p')),
  'row_security', (select jsonb_agg(jsonb_build_object(
    'schema',n.nspname,'table',c.relname,'enabled',c.relrowsecurity,
    'forced',c.relforcerowsecurity
  ) order by n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','private') and c.relkind='r'),
  'policies', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema',schemaname,'table',tablename,'name',policyname,
    'roles',roles,'command',cmd,'using',qual,'check',with_check
  ) order by schemaname,tablename,policyname),'[]'::jsonb)
    from pg_policies where schemaname in ('public','private')),
  'grants', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema',table_schema,'table',table_name,'role',grantee,
    'privilege',privilege_type
  ) order by table_schema,table_name,grantee,privilege_type),'[]'::jsonb)
    from information_schema.table_privileges where table_schema in ('public','private')),
  'extensions', (select jsonb_agg(jsonb_build_object('name',extname,'version',extversion) order by extname) from pg_extension)
) as backup_baseline;
commit;
