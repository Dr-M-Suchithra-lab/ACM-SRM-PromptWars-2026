export interface SectorRules {
  dailyStandardHours: number;
  overtimeMultiplier: number;
  minRestHoursBetweenShifts: number;
  maxConsecutiveDays: number;
  heatWarningThreshold: number; // in Celsius or Heat Index
}

export interface SectorConfig {
  id: string;
  name: string;
  category: 'construction' | 'facility' | 'hospital' | 'office' | 'factory' | 'other';
  icon: string;
  defaultCoordinates: {
    lat: number;
    lon: number;
    name: string;
  };
  rules: SectorRules;
  zones: string[];
  roles: string[];
}

export const SECTORS: Record<string, SectorConfig> = {
  srmist: {
    id: 'srmist',
    name: 'SRMIST Campus Facility & Hostel Staff',
    category: 'facility',
    icon: 'GraduationCap',
    defaultCoordinates: {
      lat: 12.823,
      lon: 80.045,
      name: 'Kattankulathur, Chennai',
    },
    rules: {
      dailyStandardHours: 8,
      overtimeMultiplier: 2.0,
      minRestHoursBetweenShifts: 10,
      maxConsecutiveDays: 6,
      heatWarningThreshold: 38,
    },
    zones: [
      'Hostel Block A & B (Sanitation)',
      'Tech Park Towers Floor 3-6',
      'Central Library & Grounds',
      'Main Dining & Food Court',
      'Biotech Labs Maintenance',
    ],
    roles: ['Worker', 'Contractor', 'Supervisor', 'Facility Head'],
  },
  metro: {
    id: 'metro',
    name: 'Metro Rail Construction Site (Line 4)',
    category: 'construction',
    icon: 'HardHat',
    defaultCoordinates: {
      lat: 13.0827,
      lon: 80.2707,
      name: 'Chennai Metro Corridor',
    },
    rules: {
      dailyStandardHours: 8,
      overtimeMultiplier: 2.0,
      minRestHoursBetweenShifts: 10,
      maxConsecutiveDays: 6,
      heatWarningThreshold: 36,
    },
    zones: [
      'Pier 42 Substructure Excavation',
      'Precast Casting Yard North',
      'Station Box Underground Level 2',
      'Rebar Fabrication Yard',
      'Batching Plant & Silos',
    ],
    roles: ['Worker', 'Thekedar', 'Safety Officer', 'Site Manager'],
  },
  hospital: {
    id: 'hospital',
    name: 'District General Hospital Support Staff',
    category: 'hospital',
    icon: 'Stethoscope',
    defaultCoordinates: {
      lat: 13.0878,
      lon: 80.2785,
      name: 'Central Hospital Zone',
    },
    rules: {
      dailyStandardHours: 8,
      overtimeMultiplier: 2.0,
      minRestHoursBetweenShifts: 10,
      maxConsecutiveDays: 6,
      heatWarningThreshold: 35,
    },
    zones: [
      'Emergency Ward & Triage Clean',
      'ICU & Operation Theatre Sanitation',
      'Bio-Waste Handling Facility',
      'Linen & Laundry Services',
      'Inpatient Ward Block C',
    ],
    roles: ['Staff', 'Contractor', 'Nursing Head', 'Facility Manager'],
  },
  office: {
    id: 'office',
    name: 'Commercial Tech Park & Offices',
    category: 'office',
    icon: 'Building2',
    defaultCoordinates: {
      lat: 12.9716,
      lon: 77.5946,
      name: 'Bengaluru Tech Park',
    },
    rules: {
      dailyStandardHours: 8,
      overtimeMultiplier: 2.0,
      minRestHoursBetweenShifts: 10,
      maxConsecutiveDays: 6,
      heatWarningThreshold: 40,
    },
    zones: ['East Wing Workspaces', 'Server & Power Hub', 'Cafeteria & Pantry', 'Basement Parking Operations'],
    roles: ['Employee', 'Manager'],
  },
  factory: {
    id: 'factory',
    name: 'Automotive & Component Assembly Factory',
    category: 'factory',
    icon: 'Factory',
    defaultCoordinates: {
      lat: 12.9915,
      lon: 79.9882,
      name: 'Sriperumbudur Industrial Area',
    },
    rules: {
      dailyStandardHours: 8,
      overtimeMultiplier: 2.0,
      minRestHoursBetweenShifts: 10,
      maxConsecutiveDays: 6,
      heatWarningThreshold: 37,
    },
    zones: ['Chassis Welding Line', 'Paint Shop Conveyor', 'Component Warehouse', 'Inspection & QC Bay'],
    roles: ['Worker', 'Contractor'],
  },
};

export const DEFAULT_SECTOR_ID = 'srmist';

export function getSector(id?: string): SectorConfig {
  if (id && SECTORS[id]) return SECTORS[id];
  return SECTORS[DEFAULT_SECTOR_ID];
}
