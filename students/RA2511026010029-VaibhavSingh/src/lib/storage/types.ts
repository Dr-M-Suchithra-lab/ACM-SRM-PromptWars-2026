import { WorkReceipt } from '@/core/receipt';
import { EscalationStage } from '@/core/escalation';
import { AiVisionAdvisory } from '@/core/closure';

export interface UserProfile {
  id: string;
  name: string;
  role: 'worker' | 'contractor' | 'admin';
  sectorId: string;
  siteName: string;
  hourlyRate: number;
  phone?: string;
  avatar?: string;
  safeHoursLogged?: number;
}

export interface ShiftRecordData {
  id: string;
  workerId: string;
  workerName: string;
  siteId: string;
  zone: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO
  endTime: string; // ISO
  totalHours: number;
  ratePerHour: number;
  isStillWorkingPinged?: boolean;
}

export interface HazardTicketData {
  id: string;
  siteId: string;
  zone: string;
  title: string;
  description: string;
  category: 'electrical' | 'chemical' | 'height' | 'structural' | 'heat' | 'sanitation';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reportedBy: string;
  reportedByName: string;
  createdAt: string; // ISO
  status: 'OPEN' | 'IN_PROGRESS' | 'VERIFIED_CLOSED';
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  reporterConfirmed: boolean;
  corroboratorCount: number;
  corroborators: string[];
  aiAdvisory?: AiVisionAdvisory;
  currentEscalationStage?: EscalationStage;
}

export interface EscrowComplaintData {
  id: string;
  workerId: string; // hashed/anonymized
  siteId: string;
  targetType: 'zone' | 'supervisor';
  targetId: string;
  category: 'wage_theft' | 'unsafe_equipment' | 'harassment' | 'injury' | 'life_risk' | 'general';
  rawSummary: string;
  sanitizedSummary: string;
  timestamp: string; // ISO
  isUrgent: boolean;
}

export interface CorrectionRequestData {
  id: string;
  receiptId: string;
  workerId: string;
  workerName: string;
  siteId: string;
  shiftDate: string;
  claimedHours: number;
  paidHours: number;
  claimedDifferenceRupees: number;
  workerNote: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  contractorComment?: string;
  submittedAt: string;
}

export interface StorageAdapter {
  getUsers(): Promise<UserProfile[]>;
  getUserById(id: string): Promise<UserProfile | null>;
  saveUser(user: UserProfile): Promise<void>;

  getShifts(workerId?: string): Promise<ShiftRecordData[]>;
  addShift(shift: ShiftRecordData): Promise<void>;

  getReceipts(workerId?: string): Promise<WorkReceipt[]>;
  getReceiptById(id: string): Promise<WorkReceipt | null>;
  saveReceipt(receipt: WorkReceipt): Promise<void>;

  getHazards(siteId?: string): Promise<HazardTicketData[]>;
  getHazardById(id: string): Promise<HazardTicketData | null>;
  saveHazard(hazard: HazardTicketData): Promise<void>;

  getComplaints(siteId?: string): Promise<EscrowComplaintData[]>;
  addComplaint(complaint: EscrowComplaintData): Promise<void>;

  getCorrections(siteId?: string): Promise<CorrectionRequestData[]>;
  addCorrection(correction: CorrectionRequestData): Promise<void>;
  updateCorrection(id: string, status: 'APPROVED' | 'REJECTED', comment?: string): Promise<void>;

  resetToSeedData(): Promise<void>;
}
