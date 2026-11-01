-- Persist the comparison snapshot inside the payroll write transaction.
-- Application calculations remain in TypeScript; this integer SQL mirror records a verifiable calculation input/output snapshot.
create function private.audit_fairness_check() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.shifts; p public.pay_policies; payable bigint; regular bigint; overtime bigint; expected bigint;
begin
 select * into strict s from public.shifts where id=new.shift_id;
 select * into strict p from public.pay_policies where organization_id=s.organization_id;
 payable:=(extract(epoch from(s.ends_at-s.starts_at))/60)::bigint-s.break_minutes;
 regular:=least(payable,p.regular_minutes);
 overtime:=greatest(0,payable-p.regular_minutes);
 expected:=((regular*p.hourly_paise+30)/60)+((overtime*p.hourly_paise*p.overtime_bps+300000)/600000);
 insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,details)
 values(s.organization_id,s.id,'fairness_check','system',
 case when expected=new.gross_paise then 'Configured-policy comparison matches recorded payroll.' else 'Configured-policy comparison identified a potential pay difference. Human review is available.' end,
 jsonb_build_object('expected_paise',expected,'recorded_paise',new.gross_paise,'difference_paise',expected-new.gross_paise,'payable_minutes',payable,'hourly_paise',p.hourly_paise,'regular_threshold_minutes',p.regular_minutes,'overtime_bps',p.overtime_bps));
 return new;
end $$;
revoke all on function private.audit_fairness_check() from public,anon,authenticated;
create trigger fairness_check_after_payroll after insert or update of gross_paise on public.payroll_entries for each row execute function private.audit_fairness_check();
-- Backfill a single snapshot per existing synthetic payroll; does not change the recorded amount.
update public.payroll_entries set gross_paise=gross_paise
where not exists(select 1 from public.dispute_events e where e.shift_id=payroll_entries.shift_id and e.event_type='fairness_check');
