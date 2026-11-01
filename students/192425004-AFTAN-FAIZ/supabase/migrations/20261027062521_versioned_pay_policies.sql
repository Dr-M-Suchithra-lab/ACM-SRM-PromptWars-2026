alter table public.pay_policies add column basis text not null default 'hourly' check(basis in ('hourly','daily'));
alter table public.pay_policies add column daily_paise integer not null default 80000 check(daily_paise between 1 and 100000000);
alter table public.pay_policies add column version integer not null default 1;
alter table public.shifts add column policy_snapshot jsonb;
update public.shifts s set policy_snapshot=to_jsonb(p) from public.pay_policies p
where p.organization_id=s.organization_id and (s.confirmed or exists(select 1 from public.payroll_entries e where e.shift_id=s.id));

create table public.pay_policy_events(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 previous_policy jsonb not null,updated_policy jsonb not null,explanation text not null,created_at timestamptz not null default now()
);
alter table public.pay_policy_events enable row level security;
revoke all on public.pay_policy_events from public,anon,authenticated;
grant select on public.pay_policy_events to authenticated;
create policy policy_history_read on public.pay_policy_events for select to authenticated using(private.is_member(organization_id));

create function private.snapshot_shift_policy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.policy_snapshot is not null then
  if new.policy_snapshot is distinct from old.policy_snapshot then raise exception 'Historical policy snapshot is protected'; end if;
 end if;
 if new.confirmed and new.policy_snapshot is null then
  select to_jsonb(p) into new.policy_snapshot from public.pay_policies p where p.organization_id=new.organization_id;
 end if;
 return new;
end $$;
revoke all on function private.snapshot_shift_policy() from public,anon,authenticated;
create trigger snapshot_confirmed_shift before insert or update on public.shifts for each row execute function private.snapshot_shift_policy();

create function private.configure_pay_policy(p_org uuid,p_policy jsonb,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare previous public.pay_policies; updated public.pay_policies;
begin
 if not private.is_member(p_org,true) then raise exception 'Forbidden'; end if;
 if length(trim(p_note)) not between 10 and 2000 or p_policy->>'basis' not in ('hourly','daily') then raise exception 'Invalid policy'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_policy->>'timezone') then raise exception 'Invalid timezone'; end if;
 select * into strict previous from public.pay_policies where organization_id=p_org for update;
 update public.pay_policies set hourly_paise=(p_policy->>'hourly_paise')::integer,regular_minutes=(p_policy->>'regular_minutes')::integer,
 overtime_bps=(p_policy->>'overtime_bps')::integer,min_rest_minutes=(p_policy->>'min_rest_minutes')::integer,
 max_shift_minutes=(p_policy->>'max_shift_minutes')::integer,max_consecutive_days=(p_policy->>'max_consecutive_days')::integer,
 timezone=p_policy->>'timezone',basis=p_policy->>'basis',daily_paise=(p_policy->>'daily_paise')::integer,version=version+1
 where organization_id=p_org returning * into updated;
 insert into public.pay_policy_events(organization_id,previous_policy,updated_policy,explanation) values(p_org,to_jsonb(previous),to_jsonb(updated),trim(p_note));
end $$;
create function public.configure_pay_policy(p_org uuid,p_policy jsonb,p_note text) returns void language sql security invoker set search_path='' as $$ select private.configure_pay_policy(p_org,p_policy,p_note) $$;
revoke all on function private.configure_pay_policy(uuid,jsonb,text),public.configure_pay_policy(uuid,jsonb,text) from public,anon;
grant execute on function private.configure_pay_policy(uuid,jsonb,text),public.configure_pay_policy(uuid,jsonb,text) to authenticated;

create or replace function private.audit_fairness_check() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.shifts; p public.pay_policies; payable bigint; regular bigint; overtime bigint; expected bigint; rate bigint; denominator bigint;
begin
 select * into strict s from public.shifts where id=new.shift_id for update;
 if s.policy_snapshot is null then
  select to_jsonb(policy) into s.policy_snapshot from public.pay_policies policy where policy.organization_id=s.organization_id;
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

create function private.reopen_review(p_dispute uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare d public.pay_disputes;
begin
 select * into d from public.pay_disputes where id=p_dispute for update;
 if d.id is null or d.worker_id<>auth.uid() or not private.is_member(d.organization_id) or d.status<>'responded' then raise exception 'Forbidden or invalid case state'; end if;
 if length(trim(p_reason)) not between 10 and 1000 then raise exception 'Invalid reason'; end if;
 update public.pay_disputes set status='requested' where id=d.id;
 insert into public.dispute_events(organization_id,shift_id,dispute_id,event_type,actor_role,explanation,details)
 values(d.organization_id,d.shift_id,d.id,'worker_requested_clarification','worker',trim(p_reason),jsonb_build_object('previous_status','responded','updated_status','requested'));
end $$;
create function public.reopen_review(p_dispute uuid,p_reason text) returns void language sql security invoker set search_path='' as $$ select private.reopen_review(p_dispute,p_reason) $$;
revoke all on function private.reopen_review(uuid,text),public.reopen_review(uuid,text) from public,anon;
grant execute on function private.reopen_review(uuid,text),public.reopen_review(uuid,text) to authenticated;
