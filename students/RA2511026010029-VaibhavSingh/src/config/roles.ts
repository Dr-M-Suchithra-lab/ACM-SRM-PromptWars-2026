export interface RoleOption {
  id: string;
  labelKey: string;
  defaultLabel: string;
  systemRole: 'worker' | 'contractor' | 'admin';
  descriptionKey: string;
  defaultDescription: string;
}

export const ROLES_BY_SECTOR: Record<string, RoleOption[]> = {
  construction: [
    {
      id: 'worker',
      labelKey: 'role.worker',
      defaultLabel: 'Worker',
      systemRole: 'worker',
      descriptionKey: 'role.worker.desc',
      defaultDescription: 'Track my shifts, check pay, and report safety issues',
    },
    {
      id: 'thekedar',
      labelKey: 'role.thekedar',
      defaultLabel: 'Thekedar (Contractor)',
      systemRole: 'contractor',
      descriptionKey: 'role.thekedar.desc',
      defaultDescription: 'Manage my crew, log attendance, and disburse wages',
    },
  ],
  metro: [
    {
      id: 'worker',
      labelKey: 'role.worker',
      defaultLabel: 'Site Worker',
      systemRole: 'worker',
      descriptionKey: 'role.worker.desc',
      defaultDescription: 'Track my shifts, check pay, and report safety issues',
    },
    {
      id: 'thekedar',
      labelKey: 'role.thekedar',
      defaultLabel: 'Thekedar (Contractor)',
      systemRole: 'contractor',
      descriptionKey: 'role.thekedar.desc',
      defaultDescription: 'Manage my crew, log attendance, and disburse wages',
    },
  ],
  srmist: [
    {
      id: 'staff',
      labelKey: 'role.staff',
      defaultLabel: 'Facility / Hostel Staff',
      systemRole: 'worker',
      descriptionKey: 'role.staff.desc',
      defaultDescription: 'Sanitation, housekeeping, security, and facility crew',
    },
    {
      id: 'contractor',
      labelKey: 'role.contractor',
      defaultLabel: 'Contractor / Agency Supervisor',
      systemRole: 'contractor',
      descriptionKey: 'role.contractor.desc',
      defaultDescription: 'Supervise campus agency staff and wage records',
    },
  ],
  hospital: [
    {
      id: 'staff',
      labelKey: 'role.staff',
      defaultLabel: 'Hospital Support Staff',
      systemRole: 'worker',
      descriptionKey: 'role.staff.desc',
      defaultDescription: 'Ward sanitation, patient transport, waste handling',
    },
    {
      id: 'contractor',
      labelKey: 'role.contractor',
      defaultLabel: 'Agency Contractor',
      systemRole: 'contractor',
      descriptionKey: 'role.contractor.desc',
      defaultDescription: 'Manage support staff shifts and approvals',
    },
  ],
  office: [
    {
      id: 'employee',
      labelKey: 'role.employee',
      defaultLabel: 'Employee',
      systemRole: 'worker',
      descriptionKey: 'role.employee.desc',
      defaultDescription: 'Clock in, review overtime receipts and rights',
    },
    {
      id: 'manager',
      labelKey: 'role.manager',
      defaultLabel: 'Facility / HR Manager',
      systemRole: 'contractor',
      descriptionKey: 'role.manager.desc',
      defaultDescription: 'Approve hours and wage records',
    },
  ],
  factory: [
    {
      id: 'worker',
      labelKey: 'role.worker',
      defaultLabel: 'Factory Worker',
      systemRole: 'worker',
      descriptionKey: 'role.worker.desc',
      defaultDescription: 'Floor shifts, hazard flagging, shift receipts',
    },
    {
      id: 'contractor',
      labelKey: 'role.contractor',
      defaultLabel: 'Contractor',
      systemRole: 'contractor',
      descriptionKey: 'role.contractor.desc',
      defaultDescription: 'Line muster rolls and worker settlements',
    },
  ],
  other: [
    {
      id: 'worker',
      labelKey: 'role.worker',
      defaultLabel: 'Worker',
      systemRole: 'worker',
      descriptionKey: 'role.worker.desc',
      defaultDescription: 'Track my shifts, check pay, and report safety issues',
    },
    {
      id: 'employer',
      labelKey: 'role.employer',
      defaultLabel: 'Employer',
      systemRole: 'contractor',
      descriptionKey: 'role.employer.desc',
      defaultDescription: 'Approve hours and ensure fair shift records',
    },
  ],
};

export function getRolesForSector(sectorIdOrCategory: string): RoleOption[] {
  const normalized = sectorIdOrCategory.toLowerCase();
  return (
    ROLES_BY_SECTOR[normalized] ||
    ROLES_BY_SECTOR.srmist ||
    ROLES_BY_SECTOR.construction
  );
}
