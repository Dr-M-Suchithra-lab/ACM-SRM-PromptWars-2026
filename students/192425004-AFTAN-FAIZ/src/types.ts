import type { Policy, Shift } from "../shared/engines";
export type WorkShift = Shift & {
  id: string;
  worker_id: string;
  organization_id: string;
  location: string;
  confirmed: boolean;
};
export type Dispute = {
  id: string;
  shift_id: string;
  organization_id: string;
  worker_id: string;
  status: "requested" | "responded" | "closed";
  reason: string;
  created_at: string;
  resolved_at: string | null;
};
export type AuditEvent = {
  id: string;
  shift_id: string;
  event_type: string;
  actor_role: string;
  explanation: string;
  created_at: string;
  details: Record<string, unknown>;
};
export type SafetyReport = {
  id: string;
  organization_id: string;
  reference: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  closed_at: string | null;
};
export type SafetyEvent = {
  id?: string;
  report_id?: string;
  status: string;
  note: string;
  created_at: string;
};
export type Pay = {
  shiftId: string;
  payableMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  regularPaise: number;
  overtimePaise: number;
  expectedPaise: number;
  recordedPaise: number;
  discrepancyPaise: number;
  hasPayroll: boolean;
};
export type Member = {
  user_id: string;
  organization_id: string;
  role: "worker" | "admin";
  display_name: string;
};
export type Workspace = {
  userId: string;
  member: Member;
  memberships: Member[];
  organizations: {
    id: string;
    name: string;
    sector_id: "construction" | "healthcare";
    is_demo: boolean;
  }[];
  pay_policies: Policy[];
  organization_members: Member[];
  shifts: WorkShift[];
  payroll_entries: { shift_id: string; gross_paise: number }[];
  pay_disputes: Dispute[];
  dispute_events: AuditEvent[];
  safety_reports: SafetyReport[];
  safety_case_events: SafetyEvent[];
  pay: Pay[];
  risks: { type: string; shiftId: string; detail: string }[];
};
