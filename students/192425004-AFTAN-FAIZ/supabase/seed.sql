-- Apply after scripts/provision.ts creates synthetic Auth users. Run once on a fresh dedicated project.
insert into public.sector_configurations values
('construction','Construction',array['equipment','fall_hazard','workload','other'],array['Fall prevention','Equipment safety']),
('healthcare','Healthcare',array['sanitation','equipment','workload','other'],array['Infection prevention','Patient handling']) on conflict do nothing;
insert into public.organizations(id,name,sector_id,is_demo) values
('10000000-0000-4000-8000-000000000001','Buildwell Construction','construction',true),
('10000000-0000-4000-8000-000000000002','Lotus Care Hospital','healthcare',true) on conflict do nothing;
insert into public.organization_members(organization_id,user_id,role,display_name) values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','worker','Arun Kumar'),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','admin','Meera Sharma'),
('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','worker','Kavya Raman'),
('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004','admin','Dr. Ravi Menon') on conflict do nothing;
insert into public.pay_policies(organization_id,hourly_paise,regular_minutes,overtime_bps,min_rest_minutes,max_shift_minutes,max_consecutive_days,timezone) values
('10000000-0000-4000-8000-000000000001',10000,480,15000,660,720,6,'Asia/Kolkata'),
('10000000-0000-4000-8000-000000000002',15000,480,15000,660,720,6,'Asia/Kolkata') on conflict do nothing;
insert into public.shifts(id,organization_id,worker_id,starts_at,ends_at,break_minutes,location,confirmed) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','2026-10-26T08:00:00+05:30','2026-10-26T18:30:00+05:30',30,'Marina Heights · Site A',true),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','2026-10-25T08:00:00+05:30','2026-10-25T18:30:00+05:30',30,'Marina Heights · Site A',true),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','2026-10-27T08:00:00+05:30','2026-10-27T16:30:00+05:30',30,'Marina Heights · Site A',false),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','2026-10-26T19:00:00+05:30','2026-10-27T07:00:00+05:30',60,'Emergency · Ward B',true),
('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','2026-10-27T13:00:00+05:30','2026-10-27T21:30:00+05:30',30,'Emergency · Ward B',false) on conflict do nothing;
insert into public.payroll_entries(shift_id,gross_paise) values
('30000000-0000-4000-8000-000000000001',95000),
('30000000-0000-4000-8000-000000000002',95000),
('30000000-0000-4000-8000-000000000004',187500) on conflict do nothing;
insert into public.pay_disputes(id,shift_id,organization_id,worker_id,reason) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Please review the overtime component for my confirmed ten-hour shift.') on conflict do nothing;
insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,details,created_at)
select organization_id,id,'shift_created','admin','Synthetic demonstration shift scheduled.',jsonb_build_object('starts_at',starts_at,'ends_at',ends_at),starts_at-interval '1 day' from public.shifts;
insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,created_at)
select organization_id,id,'hours_confirmed','worker','Worker confirmed payable work time and unpaid break.',ends_at+interval '5 minutes' from public.shifts where confirmed;
insert into public.dispute_events(organization_id,shift_id,event_type,actor_role,explanation,details,created_at)
select s.organization_id,s.id,'payroll_recorded','admin','Employer gross payroll recorded for comparison.',jsonb_build_object('gross_paise',p.gross_paise),s.ends_at+interval '15 minutes' from public.shifts s join public.payroll_entries p on p.shift_id=s.id;
insert into public.dispute_events(organization_id,shift_id,dispute_id,event_type,actor_role,explanation,created_at)
select organization_id,shift_id,id,'review_requested','worker',reason,created_at from public.pay_disputes;
insert into public.safety_reports(id,organization_id,reference,category,description,priority) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','FS-0000000000000001','equipment','A guardrail is loose on the second-floor scaffolding near the materials lift. Please inspect before work resumes.','high'),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','FS-0000000000000002','sanitation','Hand sanitiser dispensers at the Ward B entrance have been empty since the start of the overnight shift.','normal') on conflict do nothing;
insert into public.safety_case_events(report_id,status,note) select id,'submitted','Synthetic concern received. Awaiting organization review.' from public.safety_reports;
