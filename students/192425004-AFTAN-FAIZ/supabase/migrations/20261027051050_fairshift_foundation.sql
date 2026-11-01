-- FairShift: synthetic demonstration / production foundation.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create extension if not exists pgcrypto with schema extensions;

create table public.sector_configurations (
 id text primary key check(id in ('construction','healthcare')), label text not null, hazard_categories text[] not null, training_categories text[] not null
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null, sector_id text not null references public.sector_configurations(id), is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id), role text not null check(role in ('worker','admin')), display_name text not null, primary key(organization_id,user_id)
);
create table public.pay_policies (
 organization_id uuid primary key references public.organizations(id), hourly_paise integer not null check(hourly_paise between 1 and 10000000), regular_minutes integer not null check(regular_minutes between 1 and 1440), overtime_bps integer not null check(overtime_bps between 10000 and 50000), min_rest_minutes integer not null check(min_rest_minutes between 0 and 2880), max_shift_minutes integer not null check(max_shift_minutes between 60 and 1440), max_consecutive_days integer not null default 6 check(max_consecutive_days between 1 and 30), timezone text not null default 'Asia/Kolkata'
);
create table public.shifts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null,
 starts_at timestamptz not null, ends_at timestamptz not null, break_minutes integer not null check(break_minutes>=0), location text not null,
 confirmed boolean not null default false, created_at timestamptz not null default now(),
 foreign key(organization_id,worker_id) references public.organization_members(organization_id,user_id),
 unique(id,organization_id,worker_id),
 check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours'),
 check(extract(epoch from (ends_at-starts_at))/60>break_minutes),
 check(extract(epoch from starts_at)::bigint % 60=0 and extract(epoch from ends_at)::bigint % 60=0)
);
create table public.payroll_entries (
 shift_id uuid primary key references public.shifts(id), gross_paise integer not null check(gross_paise between 0 and 100000000), updated_at timestamptz not null default now()
);
create table public.pay_disputes (
 id uuid primary key default gen_random_uuid(), shift_id uuid not null, organization_id uuid not null, worker_id uuid not null,
 reason text not null check(length(reason) between 10 and 1000),
 status text not null default 'requested' check(status in ('requested','responded','closed')), created_at timestamptz not null default now(), resolved_at timestamptz,
 foreign key(shift_id,organization_id,worker_id) references public.shifts(id,organization_id,worker_id)
);
create unique index one_open_dispute_per_shift on public.pay_disputes(shift_id) where status<>'closed';
create table public.dispute_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), shift_id uuid not null references public.shifts(id), dispute_id uuid references public.pay_disputes(id),
 event_type text not null, actor_role text not null, explanation text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.safety_reports (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 reference text unique not null, category text not null check(category in ('equipment','fall_hazard','sanitation','workload','other')),
 description text not null check(length(description) between 20 and 4000), priority text not null check(priority in ('normal','high')),
 status text not null default 'submitted' check(status in ('submitted','acknowledged','under_review','action_assigned','mitigated','closed')),
 created_at timestamptz not null default now(), closed_at timestamptz
);
create table public.safety_case_events (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.safety_reports(id), status text not null, note text not null, created_at timestamptz not null default now()
);
create table private.safety_credentials (
 report_id uuid primary key references public.safety_reports(id), token_hash text not null
);
create table private.gateway_accounts (user_id uuid primary key references auth.users(id));
alter table private.safety_credentials enable row level security;
alter table private.gateway_accounts enable row level security;
revoke all on all tables in schema private from public,anon,authenticated;
create index shifts_org_time on public.shifts(organization_id,starts_at);
create index shifts_worker on public.shifts(worker_id,starts_at);
create index disputes_org_status on public.pay_disputes(organization_id,status);
create index events_shift_time on public.dispute_events(shift_id,created_at);
create index safety_org_status on public.safety_reports(organization_id,status);
create index safety_events_report on public.safety_case_events(report_id,created_at);
create index members_user on public.organization_members(user_id);

-- Narrow membership lookup in an unexposed schema avoids recursive RLS.
create function private.is_member(org uuid, admin_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=auth.uid() and (not admin_only or m.role='admin'))
$$;
revoke all on function private.is_member(uuid,boolean) from public,anon;
grant execute on function private.is_member(uuid,boolean) to authenticated;

alter table public.sector_configurations enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.pay_policies enable row level security;
alter table public.shifts enable row level security;
alter table public.payroll_entries enable row level security;
alter table public.pay_disputes enable row level security;
alter table public.dispute_events enable row level security;
alter table public.safety_reports enable row level security;
alter table public.safety_case_events enable row level security;
revoke all on all tables in schema public from anon,authenticated;
grant select on public.sector_configurations,public.organizations,public.organization_members,public.pay_policies,public.shifts,public.payroll_entries,public.pay_disputes,public.dispute_events,public.safety_reports,public.safety_case_events to authenticated;
create policy sectors_read on public.sector_configurations for select to authenticated using (true);
create policy org_read on public.organizations for select to authenticated using(private.is_member(id));
create policy members_read on public.organization_members for select to authenticated using(user_id=auth.uid() or private.is_member(organization_id,true));
create policy policy_read on public.pay_policies for select to authenticated using(private.is_member(organization_id));
create policy shift_read on public.shifts for select to authenticated using(private.is_member(organization_id) and (worker_id=auth.uid() or private.is_member(organization_id,true)));
create policy payroll_read on public.payroll_entries for select to authenticated using(exists(select 1 from public.shifts s where s.id=shift_id));
create policy dispute_read on public.pay_disputes for select to authenticated using(private.is_member(organization_id) and (worker_id=auth.uid() or private.is_member(organization_id,true)));
create policy event_read on public.dispute_events for select to authenticated using(exists(select 1 from public.shifts s where s.id=shift_id));
create policy safety_admin on public.safety_reports for select to authenticated using(private.is_member(organization_id,true));
create policy safety_events_admin on public.safety_case_events for select to authenticated using(exists(select 1 from public.safety_reports r where r.id=report_id));

-- Guarded transactional operations live in private; public RPC wrappers are invokers.
create function private.request_review(p_shift uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.shifts; d uuid;
begin
 select * into s from public.shifts where id=p_shift for update;
 if s.id is null or s.worker_id<>auth.uid() or not private.is_member(s.organization_id) or not s.confirmed then raise exception 'Forbidden or unconfirmed shift'; end if;
 if length(trim(p_reason)) not between 10 and 1000 then raise exception 'Invalid reason'; end if;
 insert into public.pay_disputes(shift_id,organization_id,worker_id,reason) values(s.id,s.organization_id,s.worker_id,trim(p_reason)) returning id into d;
 insert into public.dispute_events(organization_id,shift_id,dispute_id,event_type,actor_role,explanation) values(s.organization_id,s.id,d,'review_requested','worker',trim(p_reason));
 return d;
end $$;
create function public.request_review(p_shift uuid,p_reason text) returns uuid language sql security invoker set search_path='' as $$ select private.request_review(p_shift,p_reason) $$;

create function private.confirm_shift(p_shift uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.shifts;
begin
 select * into s from public.shifts where id=p_shift for update;
 if s.id is null or s.worker_id<>auth.uid() or not private.is_member(s.organization_id) then raise exception 'Forbidden'; end if;
 if s.confirmed then return; end if;
 update public.shifts set confirmed=true where id=p_shift;
 insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation) values(s.organization_id,s.id,'hours_confirmed','worker','Worker confirmed the recorded shift hours and unpaid break.');
end $$;
create function public.confirm_shift(p_shift uuid) returns void language sql security invoker set search_path='' as $$ select private.confirm_shift(p_shift) $$;

create function private.resolve_review(p_dispute uuid,p_paise integer,p_explanation text) returns void language plpgsql security definer set search_path='' as $$
declare d public.pay_disputes; old_paise integer;
begin
 select * into d from public.pay_disputes where id=p_dispute for update;
 if d.id is null or not private.is_member(d.organization_id,true) or d.status<>'requested' then raise exception 'Forbidden or invalid case status'; end if;
 if p_paise not between 0 and 100000000 or length(trim(p_explanation)) not between 10 and 2000 then raise exception 'Invalid correction'; end if;
 select gross_paise into old_paise from public.payroll_entries where shift_id=d.shift_id for update;
 insert into public.payroll_entries(shift_id,gross_paise) values(d.shift_id,p_paise) on conflict(shift_id) do update set gross_paise=excluded.gross_paise,updated_at=now();
 update public.pay_disputes set status='responded' where id=d.id;
 insert into public.dispute_events(organization_id,shift_id,dispute_id,event_type,actor_role,explanation,details) values(d.organization_id,d.shift_id,d.id,'employer_response','admin',trim(p_explanation),jsonb_build_object('previous_paise',old_paise,'corrected_paise',p_paise));
end $$;
create function public.resolve_review(p_dispute uuid,p_paise integer,p_explanation text) returns void language sql security invoker set search_path='' as $$ select private.resolve_review(p_dispute,p_paise,p_explanation) $$;

create function private.confirm_resolution(p_dispute uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.pay_disputes;
begin
 select * into d from public.pay_disputes where id=p_dispute for update;
 if d.id is null or d.worker_id<>auth.uid() or not private.is_member(d.organization_id) or d.status<>'responded' then raise exception 'Forbidden or invalid case status'; end if;
 update public.pay_disputes set status='closed',resolved_at=now() where id=d.id;
 insert into public.dispute_events(organization_id,shift_id,dispute_id,event_type,actor_role,explanation) values(d.organization_id,d.shift_id,d.id,'worker_confirmed_resolution','worker','Worker confirmed the response. Review closed with its history retained.');
end $$;
create function public.confirm_resolution(p_dispute uuid) returns void language sql security invoker set search_path='' as $$ select private.confirm_resolution(p_dispute) $$;

create function private.submit_safety(p_org uuid,p_reference text,p_token_hash text,p_category text,p_description text,p_priority text) returns uuid language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 if not exists(select 1 from private.gateway_accounts where user_id=auth.uid()) then raise exception 'Forbidden'; end if;
 if p_reference !~ '^FS-[A-F0-9]{16}$' or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid tracking credentials'; end if;
 insert into public.safety_reports(organization_id,reference,category,description,priority) values(p_org,p_reference,p_category,p_description,p_priority) returning id into r;
 insert into private.safety_credentials(report_id,token_hash) values(r,p_token_hash);
 insert into public.safety_case_events(report_id,status,note) values(r,'submitted','Concern received. Awaiting review by the organization.');
 return r;
end $$;
create function public.submit_safety(p_org uuid,p_reference text,p_token_hash text,p_category text,p_description text,p_priority text) returns uuid language sql security invoker set search_path='' as $$ select private.submit_safety(p_org,p_reference,p_token_hash,p_category,p_description,p_priority) $$;

create function private.track_safety(p_reference text,p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from private.gateway_accounts where user_id=auth.uid()) then raise exception 'Forbidden'; end if;
 select jsonb_build_object('reference',r.reference,'category',r.category,'status',r.status,'created_at',r.created_at,'events',coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'note',e.note,'created_at',e.created_at) order by e.created_at) from public.safety_case_events e where e.report_id=r.id),'[]'::jsonb))
 into result from public.safety_reports r join private.safety_credentials c on c.report_id=r.id where r.reference=p_reference and c.token_hash=p_token_hash;
 return result;
end $$;
create function public.track_safety(p_reference text,p_token_hash text) returns jsonb language sql security invoker set search_path='' as $$ select private.track_safety(p_reference,p_token_hash) $$;

create function private.update_safety(p_report uuid,p_status text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.safety_reports; states text[]:=array['submitted','acknowledged','under_review','action_assigned','mitigated','closed'];
begin
 select * into r from public.safety_reports where id=p_report for update;
 if r.id is null or not private.is_member(r.organization_id,true) then raise exception 'Forbidden'; end if;
 if length(trim(p_note)) not between 10 and 2000 or array_position(states,p_status) is distinct from array_position(states,r.status)+1 then raise exception 'Invalid next status or note'; end if;
 update public.safety_reports set status=p_status,closed_at=case when p_status='closed' then now() else null end where id=r.id;
 insert into public.safety_case_events(report_id,status,note) values(r.id,p_status,trim(p_note));
end $$;
create function public.update_safety(p_report uuid,p_status text,p_note text) returns void language sql security invoker set search_path='' as $$ select private.update_safety(p_report,p_status,p_note) $$;

create function private.save_shift(p_id uuid,p_org uuid,p_worker uuid,p_start timestamptz,p_end timestamptz,p_break integer,p_location text) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.shifts; result uuid;
begin
 if not private.is_member(p_org,true) then raise exception 'Forbidden'; end if;
 if length(trim(p_location)) not between 2 and 100 then raise exception 'Invalid location'; end if;
 if p_id is not null then
 select * into s from public.shifts where id=p_id for update;
 if s.id is null or s.organization_id<>p_org or s.confirmed or exists(select 1 from public.payroll_entries where shift_id=s.id) then raise exception 'Cannot alter verified or payroll-linked shift'; end if;
 update public.shifts set starts_at=p_start,ends_at=p_end,break_minutes=p_break,location=trim(p_location) where id=s.id returning id into result;
 else
 insert into public.shifts(organization_id,worker_id,starts_at,ends_at,break_minutes,location) values(p_org,p_worker,p_start,p_end,p_break,trim(p_location)) returning id into result;
 end if;
 insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,details) values(p_org,result,'schedule_saved','admin','Schedule saved after human confirmation.',jsonb_build_object('starts_at',p_start,'ends_at',p_end,'previous_start',s.starts_at));
 return result;
end $$;
create function public.save_shift(p_id uuid,p_org uuid,p_worker uuid,p_start timestamptz,p_end timestamptz,p_break integer,p_location text) returns uuid language sql security invoker set search_path='' as $$ select private.save_shift(p_id,p_org,p_worker,p_start,p_end,p_break,p_location) $$;

create function private.save_policy(p_org uuid,p_hourly integer,p_regular integer,p_ot integer,p_rest integer,p_max integer,p_days integer,p_timezone text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_member(p_org,true) then raise exception 'Forbidden'; end if;
 -- Freeze a policy once shifts are verified: historical calculations must not change.
 if exists(select 1 from public.shifts where organization_id=p_org and confirmed) then raise exception 'Policy locked by confirmed shifts. Create a versioned policy before changing historical rates.'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Invalid timezone'; end if;
 update public.pay_policies set hourly_paise=p_hourly,regular_minutes=p_regular,overtime_bps=p_ot,min_rest_minutes=p_rest,max_shift_minutes=p_max,max_consecutive_days=p_days,timezone=p_timezone where organization_id=p_org;
end $$;
create function public.save_policy(p_org uuid,p_hourly integer,p_regular integer,p_ot integer,p_rest integer,p_max integer,p_days integer,p_timezone text) returns void language sql security invoker set search_path='' as $$ select private.save_policy(p_org,p_hourly,p_regular,p_ot,p_rest,p_max,p_days,p_timezone) $$;

create function private.record_payroll(p_shift uuid,p_paise integer,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare s public.shifts;
begin
 select * into s from public.shifts where id=p_shift for update;
 if s.id is null or not private.is_member(s.organization_id,true) then raise exception 'Forbidden'; end if;
 if length(trim(p_note)) not between 10 and 2000 then raise exception 'Invalid note'; end if;
 if exists(select 1 from public.payroll_entries where shift_id=p_shift) then raise exception 'Use the review workflow to correct existing payroll'; end if;
 insert into public.payroll_entries(shift_id,gross_paise) values(p_shift,p_paise);
 insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,details) values(s.organization_id,p_shift,'payroll_recorded','admin',trim(p_note),jsonb_build_object('gross_paise',p_paise));
end $$;
create function public.record_payroll(p_shift uuid,p_paise integer,p_note text) returns void language sql security invoker set search_path='' as $$ select private.record_payroll(p_shift,p_paise,p_note) $$;

-- Explicitly revoke PostgreSQL's default PUBLIC execute grant for every application function.
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on all functions in schema private to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.request_review(uuid,text),public.confirm_shift(uuid),public.resolve_review(uuid,integer,text),public.confirm_resolution(uuid),public.submit_safety(uuid,text,text,text,text,text),public.track_safety(text,text),public.update_safety(uuid,text,text),public.save_shift(uuid,uuid,uuid,timestamptz,timestamptz,integer,text),public.save_policy(uuid,integer,integer,integer,integer,integer,integer,text),public.record_payroll(uuid,integer,text) to authenticated;
