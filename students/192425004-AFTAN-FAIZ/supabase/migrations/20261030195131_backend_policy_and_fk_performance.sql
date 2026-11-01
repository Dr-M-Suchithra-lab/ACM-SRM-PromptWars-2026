-- NYAVERIS AI: proposed optimization, not yet applied to the hosted project.
-- Same SELECT authorization predicates, with auth.uid evaluated once per statement.
-- Apply only after owner approval, in a transaction. Existing indexes are retained.
set local lock_timeout = '3s';
set local statement_timeout = '30s';

alter policy members_read on public.organization_members
  using (user_id = (select auth.uid()) or private.is_member(organization_id, true));
alter policy shift_read on public.shifts
  using (private.is_member(organization_id)
    and (worker_id = (select auth.uid()) or private.is_member(organization_id, true)));
alter policy dispute_read on public.pay_disputes
  using (private.is_member(organization_id)
    and (worker_id = (select auth.uid()) or private.is_member(organization_id, true)));

-- Cover the actual advisor-reported foreign keys and tenant/timeline lookups.
create index if not exists events_dispute_time
  on public.dispute_events (dispute_id, created_at);
create index if not exists events_org_time
  on public.dispute_events (organization_id, created_at);
create index if not exists organizations_sector
  on public.organizations (sector_id);
create index if not exists disputes_shift_membership
  on public.pay_disputes (shift_id, organization_id, worker_id);
create index if not exists policy_events_org_time
  on public.pay_policy_events (organization_id, created_at);
create index if not exists shifts_org_worker_time
  on public.shifts (organization_id, worker_id, starts_at);
