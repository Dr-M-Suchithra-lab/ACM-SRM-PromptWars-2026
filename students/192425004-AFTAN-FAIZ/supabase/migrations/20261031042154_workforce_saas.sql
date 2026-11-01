-- PROPOSED ONLY. Apply once to the existing project after approval. No demo data is changed.
set lock_timeout='3s';
set statement_timeout='30s';
alter table public.organization_members add column active boolean not null default true;
alter table public.shifts add column cancelled_at timestamptz;
-- Keep legacy admin/worker values; ownership is a separate protected record.
create table public.business_settings (
 organization_id uuid primary key references public.organizations(id), owner_user_id uuid not null references auth.users(id),
 request_id uuid not null, email text not null, phone text not null default '', industry text not null check(industry in ('construction','healthcare','manufacturing','education','other')),
 location text not null, country text not null, state text not null, city text not null, description text not null default '',
 size integer not null check(size between 1 and 1000000), working_days integer[] not null check(cardinality(working_days) between 1 and 7),
 currency text not null default 'INR' check(currency='INR'), departments text[] not null default '{}',work_locations text[] not null default '{}',
 unique(owner_user_id,request_id)
);
create table public.user_profiles(user_id uuid primary key references auth.users(id),full_name text not null check(length(full_name) between 1 and 100));
create table public.employee_profiles (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),user_id uuid,
 name text not null check(length(name) between 1 and 100), email text not null check(length(email)<=254),phone text not null default '',employee_code text not null check(length(employee_code) between 1 and 50),
 department text not null default '',job_title text not null default '',employment_type text not null check(employment_type in ('full_time','part_time','contract')),
 start_date date not null,status text not null check(status in ('active','inactive')),rate_paise integer not null check(rate_paise between 1 and 10000000),pay_basis text not null check(pay_basis in ('hourly','daily')),
 work_location text not null default '', skills text not null default '', created_at timestamptz not null default now(),
 foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id),unique(organization_id,employee_code),unique(organization_id,email),unique(organization_id,user_id),unique(id,organization_id)
);
create table public.organization_invitations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),employee_id uuid not null,
 email text not null,role text not null default 'worker' check(role='worker'),status text not null default 'pending' check(status in ('pending','accepted','revoked')),
 expires_at timestamptz not null default now()+interval '7 days',created_by uuid not null references auth.users(id),accepted_by uuid references auth.users(id),accepted_at timestamptz,created_at timestamptz not null default now(),
 foreign key(employee_id,organization_id) references public.employee_profiles(id,organization_id)
);
create unique index invitations_pending_email on public.organization_invitations(organization_id,email) where status='pending';
create table private.invitation_credentials(invitation_id uuid primary key references public.organization_invitations(id),token_hash text unique not null check(token_hash ~ '^[a-f0-9]{64}$'));
create table public.business_events(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),actor_id uuid not null references auth.users(id),event_type text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create index employees_org_status on public.employee_profiles(organization_id,status);
create index employees_user on public.employee_profiles(user_id);
create index invitations_recipient on public.organization_invitations(email,expires_at);
create index invitations_employee on public.organization_invitations(employee_id,organization_id);
create index invitations_creator on public.organization_invitations(created_by);
create index invitations_acceptor on public.organization_invitations(accepted_by);
create index business_events_org on public.business_events(organization_id,created_at);
create unique index business_dashboard_review_once on public.business_events(organization_id,actor_id,event_type) where event_type='workforce_dashboard_reviewed';
create index business_events_actor on public.business_events(actor_id);
-- Central existing guard now revokes access immediately for inactive memberships.
create or replace function private.is_member(org uuid,admin_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=(select auth.uid()) and m.active and (not admin_only or m.role='admin'))
$$;
create function private.is_owner(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_member(org,true) and exists(select 1 from public.business_settings b where b.organization_id=org and b.owner_user_id=(select auth.uid()))
$$;
revoke all on function private.is_owner(uuid) from public,anon;
grant execute on function private.is_owner(uuid) to authenticated;
alter table private.invitation_credentials enable row level security;
revoke all on private.invitation_credentials from public,anon,authenticated;
-- New tables are read-only via RLS; writes use narrow transactional RPCs below.
alter table public.business_settings enable row level security;
revoke all on public.business_settings from public,anon,authenticated;
grant select on public.business_settings to authenticated;
create policy saas_read on public.business_settings for select to authenticated using(private.is_member(organization_id,true));
alter table public.employee_profiles enable row level security;
revoke all on public.employee_profiles from public,anon,authenticated;
grant select on public.employee_profiles to authenticated;
create policy saas_read on public.employee_profiles for select to authenticated using(private.is_member(organization_id) and (user_id=(select auth.uid()) or private.is_member(organization_id,true)));
alter table public.organization_invitations enable row level security;
revoke all on public.organization_invitations from public,anon,authenticated;
grant select on public.organization_invitations to authenticated;
create policy saas_read on public.organization_invitations for select to authenticated using(private.is_member(organization_id,true));
alter table public.business_events enable row level security;
revoke all on public.business_events from public,anon,authenticated;
grant select on public.business_events to authenticated;
create policy saas_read on public.business_events for select to authenticated using(private.is_member(organization_id,true));
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public,anon,authenticated;
grant select on public.user_profiles to authenticated;
create policy saas_read on public.user_profiles for select to authenticated using(user_id=(select auth.uid()));

create function private.saas_action(p_action text,p_org uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); verified_email text; org uuid; employee uuid; invitation public.organization_invitations; result jsonb; prior public.employee_profiles; cfg public.business_settings; s public.shifts; policy jsonb; hashed text; isowner boolean;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select lower(email) into verified_email from auth.users where id=u and email_confirmed_at is not null;
 if verified_email is null then raise exception 'Verified email required' using errcode='42501'; end if;
 if p_action='my_invitations' then
  return coalesce((select jsonb_agg(jsonb_build_object('business_name',o.name,'expires_at',i.expires_at)) from public.organization_invitations i join public.organizations o on o.id=i.organization_id where i.email=verified_email and i.status='pending' and i.expires_at>now()),'[]'::jsonb);
 end if;
 if p_action='create_business' then
  -- Serialize retries for this owner/idempotency key. No partially-created workspace.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||(p_data->>'request_id'),0));
  select organization_id into org from public.business_settings where owner_user_id=u and request_id=(p_data->>'request_id')::uuid;
  if org is not null then return jsonb_build_object('organization_id',org); end if;
  if length(trim(p_data->>'name')) not between 1 and 100 or p_data->>'industry' not in ('construction','healthcare','manufacturing','education','other') or p_data->>'currency'<>'INR' then raise exception 'Invalid business'; end if;
  policy:=p_data->'policy';
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=policy->>'timezone') then raise exception 'Invalid time zone'; end if;
  insert into public.organizations(name,sector_id) values(trim(p_data->>'name'),case when p_data->>'industry' in ('construction','healthcare') then p_data->>'industry' else 'generic' end) returning id into org;
  insert into public.organization_members(organization_id,user_id,role,display_name) values(org,u,'admin',coalesce(nullif(trim(p_data->>'owner_name'),''),split_part(verified_email,'@',1)));
  insert into public.business_settings(organization_id,owner_user_id,request_id,email,phone,industry,location,country,state,city,description,size,working_days)
  values(org,u,(p_data->>'request_id')::uuid,p_data->>'email',coalesce(p_data->>'phone',''),p_data->>'industry',p_data->>'location',p_data->>'country',p_data->>'state',p_data->>'city',coalesce(p_data->>'description',''),(p_data->>'size')::integer,array(select jsonb_array_elements_text(p_data->'working_days')::integer));
  insert into public.pay_policies(organization_id,basis,daily_paise,hourly_paise,regular_minutes,overtime_bps,min_rest_minutes,max_shift_minutes,max_consecutive_days,timezone)
  values(org,coalesce(policy->>'basis','hourly'),coalesce((policy->>'daily_paise')::integer,80000),(policy->>'hourly_paise')::integer,(policy->>'regular_minutes')::integer,(policy->>'overtime_bps')::integer,(policy->>'min_rest_minutes')::integer,(policy->>'max_shift_minutes')::integer,(policy->>'max_consecutive_days')::integer,policy->>'timezone');
  insert into public.business_events(organization_id,actor_id,event_type) values(org,u,'business_created');
  insert into public.user_profiles(user_id,full_name) select u,display_name from public.organization_members where organization_id=org and user_id=u on conflict(user_id) do nothing;
  return jsonb_build_object('organization_id',org);
 elsif p_action in ('preview_invitation','accept_invitation') then
  hashed:=p_data->>'token_hash';
  select i.* into invitation from public.organization_invitations i join private.invitation_credentials c on c.invitation_id=i.id where c.token_hash=hashed for update of i;
  if invitation.id is null or invitation.status<>'pending' or invitation.expires_at<=now() or invitation.email<>verified_email then raise exception 'Invitation unavailable for this verified account' using errcode='42501'; end if;
  select * into strict prior from public.employee_profiles where id=invitation.employee_id for update;
  if p_action='preview_invitation' then return jsonb_build_object('business_name',(select name from public.organizations where id=invitation.organization_id),'department',prior.department,'job_title',prior.job_title,'expires_at',invitation.expires_at); end if;
  if prior.status<>'active' or (prior.user_id is not null and prior.user_id<>u) or exists(select 1 from public.organization_members where organization_id=invitation.organization_id and user_id=u) then raise exception 'Existing membership or inactive profile' using errcode='42501'; end if;
  insert into public.organization_members(organization_id,user_id,role,display_name) values(invitation.organization_id,u,'worker',prior.name);
  update public.employee_profiles set user_id=u where id=prior.id;
  insert into public.user_profiles(user_id,full_name) values(u,prior.name) on conflict(user_id) do nothing;
  update public.organization_invitations set status='accepted',accepted_by=u,accepted_at=now() where id=invitation.id;
  insert into public.business_events(organization_id,actor_id,event_type,details) values(invitation.organization_id,u,'invitation_accepted',jsonb_build_object('invitation_id',invitation.id));
  return jsonb_build_object('organization_id',invitation.organization_id);
 end if;
 if not private.is_member(p_org,true) then raise exception 'Management permission required' using errcode='42501'; end if;
 isowner:=private.is_owner(p_org);
 -- Legacy demo configuration is deliberately not assigned to an arbitrary admin.
 if not exists(select 1 from public.business_settings where organization_id=p_org) then raise exception 'Business onboarding migration not enabled for this legacy workspace'; end if;
 if p_action='review_dashboard' then
  insert into public.business_events(organization_id,actor_id,event_type) values(p_org,u,'workforce_dashboard_reviewed') on conflict do nothing;
  return '{}';
 elsif p_action='save_employee' then
  if nullif(p_data->>'id','') is not null then
   select * into strict prior from public.employee_profiles where id=(p_data->>'id')::uuid and organization_id=p_org for update;
   if prior.user_id is not null and exists(select 1 from public.organization_members where organization_id=p_org and user_id=prior.user_id and role='admin') then raise exception 'Use owner permissions to manage administrators'; end if;
   if prior.user_id is not null and lower(p_data->>'email')<>prior.email then raise exception 'Linked account email cannot be changed'; end if;
  end if;
  if prior.id is not null and prior.email<>lower(p_data->>'email') then update public.organization_invitations set status='revoked' where employee_id=prior.id and status='pending'; end if;
  if p_data->>'status' not in ('active','inactive') or p_data->>'pay_basis' not in ('hourly','daily') then raise exception 'Invalid employee'; end if;
  insert into public.employee_profiles(id,organization_id,name,email,phone,employee_code,department,job_title,employment_type,start_date,status,rate_paise,pay_basis,work_location,skills)
  values(coalesce(prior.id,gen_random_uuid()),p_org,p_data->>'name',lower(p_data->>'email'),p_data->>'phone',p_data->>'employee_code',p_data->>'department',p_data->>'job_title',p_data->>'employment_type',(p_data->>'start_date')::date,p_data->>'status',(p_data->>'rate_paise')::integer,p_data->>'pay_basis',p_data->>'work_location',p_data->>'skills')
  on conflict(id) do update set name=excluded.name,email=excluded.email,phone=excluded.phone,employee_code=excluded.employee_code,department=excluded.department,job_title=excluded.job_title,employment_type=excluded.employment_type,start_date=excluded.start_date,status=excluded.status,rate_paise=excluded.rate_paise,pay_basis=excluded.pay_basis,work_location=excluded.work_location,skills=excluded.skills returning id into employee;
  if prior.user_id is not null then update public.organization_members set active=(p_data->>'status'='active'),display_name=p_data->>'name' where organization_id=p_org and user_id=prior.user_id; end if;
  insert into public.business_events(organization_id,actor_id,event_type,details) values(p_org,u,'employee_saved',jsonb_build_object('employee_id',employee,'previous',to_jsonb(prior),'updated',(select to_jsonb(e) from public.employee_profiles e where e.id=employee)));
  return jsonb_build_object('employee_id',employee);
 elsif p_action in ('invite_employee','rotate_invitation','revoke_invitation') then
  if p_action='invite_employee' then
   select * into strict prior from public.employee_profiles where id=(p_data->>'employee_id')::uuid and organization_id=p_org for update;
   if prior.user_id is not null or prior.status<>'active' then raise exception 'Employee already linked or inactive'; end if;
   insert into public.organization_invitations(organization_id,employee_id,email,created_by) values(p_org,prior.id,prior.email,u) returning * into invitation;
  else
   select * into strict invitation from public.organization_invitations where id=(p_data->>'invitation_id')::uuid and organization_id=p_org for update;
   if invitation.status<>'pending' then raise exception 'Invitation is no longer pending'; end if;
   if p_action='revoke_invitation' then
    update public.organization_invitations set status='revoked' where id=invitation.id;
   else update public.organization_invitations set expires_at=now()+interval '7 days' where id=invitation.id; end if;
  end if;
  if p_action<>'revoke_invitation' then
   if p_data->>'token_hash' !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation credential'; end if;
   insert into private.invitation_credentials(invitation_id,token_hash) values(invitation.id,p_data->>'token_hash') on conflict(invitation_id) do update set token_hash=excluded.token_hash;
  end if;
  insert into public.business_events(organization_id,actor_id,event_type,details) values(p_org,u,p_action,jsonb_build_object('invitation_id',invitation.id));
  return jsonb_build_object('invitation_id',invitation.id,'email',invitation.email);
 elsif p_action='save_settings' then
  if not isowner then raise exception 'Owner required' using errcode='42501'; end if;
  select * into strict cfg from public.business_settings where organization_id=p_org for update;
  if p_data->>'currency'<>'INR' or length(trim(p_data->>'name')) not between 1 and 100 then raise exception 'Invalid settings'; end if;
  update public.organizations set name=p_data->>'name',sector_id=case when p_data->>'industry' in ('construction','healthcare') then p_data->>'industry' else 'generic' end where id=p_org;
  update public.business_settings set email=p_data->>'email',phone=p_data->>'phone',industry=p_data->>'industry',location=p_data->>'location',country=p_data->>'country',state=p_data->>'state',city=p_data->>'city',description=p_data->>'description',size=(p_data->>'size')::integer,working_days=array(select jsonb_array_elements_text(p_data->'working_days')::integer),departments=array(select jsonb_array_elements_text(p_data->'departments')),work_locations=array(select jsonb_array_elements_text(p_data->'work_locations')) where organization_id=p_org;
  insert into public.business_events(organization_id,actor_id,event_type,details) values(p_org,u,'settings_updated',jsonb_build_object('previous',to_jsonb(cfg),'updated',(select to_jsonb(b) from public.business_settings b where b.organization_id=p_org),'organization_name',p_data->>'name'));
  return '{}';
 elsif p_action='set_admin' then
  if not isowner or (p_data->>'user_id')::uuid=(select owner_user_id from public.business_settings where organization_id=p_org) then raise exception 'Owner required; ownership is protected' using errcode='42501'; end if;
  update public.organization_members set role=case when (p_data->>'admin')::boolean then 'admin' else 'worker' end where organization_id=p_org and user_id=(p_data->>'user_id')::uuid and active;
  if not found then raise exception 'Active membership required'; end if;
  insert into public.business_events(organization_id,actor_id,event_type,details) values(p_org,u,'administrator_access_changed',jsonb_build_object('user_id',p_data->>'user_id','admin',(p_data->>'admin')::boolean));
  return '{}';
 elsif p_action='cancel_shift' then
  select * into strict s from public.shifts where id=(p_data->>'shift_id')::uuid and organization_id=p_org for update;
  if s.confirmed or s.cancelled_at is not null or exists(select 1 from public.payroll_entries where shift_id=s.id) or exists(select 1 from public.pay_disputes where shift_id=s.id) then raise exception 'Verified shift cannot be cancelled'; end if;
  update public.shifts set cancelled_at=now() where id=s.id;
  insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation) values(p_org,s.id,'shift_cancelled','admin',p_data->>'note');
  return '{}';
 end if;
 raise exception 'Unsupported action';
end $$;
create function public.saas_action(p_action text,p_org uuid,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.saas_action(p_action,p_org,p_data)$$;
revoke all on function private.saas_action(text,uuid,jsonb),public.saas_action(text,uuid,jsonb) from public,anon;
grant execute on function private.saas_action(text,uuid,jsonb),public.saas_action(text,uuid,jsonb) to authenticated;
-- Expand only the sector allowlist, preserving both original profiles.
alter table public.sector_configurations drop constraint sector_configurations_id_check;
alter table public.sector_configurations add constraint sector_configurations_id_check check(id in ('construction','healthcare','generic'));
insert into public.sector_configurations(id,label,hazard_categories,training_categories) values('generic','General workplace',array['equipment','sanitation','workload','other'],array['workplace_safety']);
-- A single guard also protects direct use of the existing RPCs, not just API callers.
create function private.saas_shift_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare employee public.employee_profiles; policy jsonb;
begin
 if tg_op='UPDATE' and old.cancelled_at is not null then raise exception 'Cancelled shift is immutable'; end if;
 if new.cancelled_at is not null then return new; end if;
 if not exists(select 1 from public.organization_members where organization_id=new.organization_id and user_id=new.worker_id and active and role='worker') then raise exception 'Active employee membership required'; end if;
 if tg_op='UPDATE' and new.worker_id<>old.worker_id and (old.confirmed or exists(select 1 from public.payroll_entries where shift_id=old.id) or exists(select 1 from public.pay_disputes where shift_id=old.id)) then raise exception 'Historical assignment is immutable'; end if;
 select * into employee from public.employee_profiles where organization_id=new.organization_id and user_id=new.worker_id;
 if employee.id is not null and (tg_op='INSERT' or old.policy_snapshot is null) then
  select to_jsonb(p) into policy from public.pay_policies p where organization_id=new.organization_id;
  -- Freeze the employee rate when confirming/recording payroll, never rewrite a snapshot.
  if new.confirmed or new.policy_snapshot is not null then
   new.policy_snapshot:=policy||jsonb_build_object('basis',employee.pay_basis,case when employee.pay_basis='daily' then 'daily_paise' else 'hourly_paise' end,employee.rate_paise);
  end if;
 end if;
 return new;
end $$;
revoke all on function private.saas_shift_guard() from public,anon,authenticated;
create trigger a_saas_shift_guard before insert or update on public.shifts for each row execute function private.saas_shift_guard();
-- Existing save_shift omitted worker reassignment on edit. Preserve audit checks and add it.
create or replace function private.save_shift(p_id uuid,p_org uuid,p_worker uuid,p_start timestamptz,p_end timestamptz,p_break integer,p_location text) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.shifts; result uuid;
begin
 if not private.is_member(p_org,true) then raise exception 'Forbidden'; end if;
 if length(trim(p_location)) not between 2 and 100 then raise exception 'Invalid location'; end if;
 if p_id is not null then
 select * into strict s from public.shifts where id=p_id and organization_id=p_org for update;
 if s.confirmed or s.cancelled_at is not null or exists(select 1 from public.payroll_entries where shift_id=s.id) then raise exception 'Cannot alter verified or payroll-linked shift'; end if;
 update public.shifts set worker_id=p_worker,starts_at=p_start,ends_at=p_end,break_minutes=p_break,location=trim(p_location) where id=s.id returning id into result;
 else insert into public.shifts(organization_id,worker_id,starts_at,ends_at,break_minutes,location) values(p_org,p_worker,p_start,p_end,p_break,trim(p_location)) returning id into result;
 end if;
 insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,details) values(p_org,result,'schedule_saved','admin','Schedule saved after human confirmation.',jsonb_build_object('starts_at',p_start,'ends_at',p_end,'previous_start',s.starts_at,'previous_worker',s.worker_id));
 return result;
end $$;

-- Freeze employee rates before the existing atomic fairness receipt calculates payroll.
create or replace function private.audit_fairness_check() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.shifts; p public.pay_policies; payable bigint; regular bigint; overtime bigint; expected bigint; rate bigint; denominator bigint; employee public.employee_profiles;
begin
 select * into strict s from public.shifts where id=new.shift_id for update;
 if s.policy_snapshot is null then
  select to_jsonb(policy) into s.policy_snapshot from public.pay_policies policy where policy.organization_id=s.organization_id;
  select * into employee from public.employee_profiles where organization_id=s.organization_id and user_id=s.worker_id;
  if employee.id is not null then s.policy_snapshot:=s.policy_snapshot||jsonb_build_object('basis',employee.pay_basis,case when employee.pay_basis='daily' then 'daily_paise' else 'hourly_paise' end,employee.rate_paise); end if;
  update public.shifts set policy_snapshot=s.policy_snapshot where id=s.id;
 end if;
 select * into p from jsonb_populate_record(null::public.pay_policies,s.policy_snapshot);
 payable:=(extract(epoch from(s.ends_at-s.starts_at))/60)::bigint-s.break_minutes;
 regular:=least(payable,p.regular_minutes);overtime:=greatest(0,payable-p.regular_minutes);
 rate:=case when p.basis='daily' then p.daily_paise else p.hourly_paise end;
 denominator:=case when p.basis='daily' then p.regular_minutes else 60 end;
 expected:=((regular*rate+denominator/2)/denominator)+((overtime*rate*p.overtime_bps+denominator*5000)/(denominator*10000));
 insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,details)
 values(s.organization_id,s.id,'fairness_check','system',
 case when expected=new.gross_paise then 'Recorded payroll matches the saved policy snapshot.' else 'The saved policy snapshot indicates a potential pay difference. Human review is available.' end,
 jsonb_build_object('expected_paise',expected,'recorded_paise',new.gross_paise,'difference_paise',expected-new.gross_paise,'payable_minutes',payable,'basis',p.basis,'policy_version',p.version));
 return new;
end $$;


alter table public.business_settings add constraint working_days_valid check(working_days <@ array[0,1,2,3,4,5,6]);
alter table public.business_settings add constraint business_text_valid check(length(email) between 3 and 254 and length(location) between 1 and 200 and length(country) between 1 and 100 and length(state) between 1 and 100 and length(city) between 1 and 100 and length(phone)<=30 and length(description)<=1000);
alter table public.employee_profiles add constraint employee_text_valid check(length(phone)<=30 and length(department)<=100 and length(job_title)<=100 and length(work_location)<=200 and length(skills)<=500);
