/**
 * FairShift Hisaab - MongoDB Document Schemas & Types
 * Target Database: fairshift_hisaab
 * Registered Account: vaibhavnr06@gmail.com
 */

export interface MongoUserDoc {
  _id: string;
  phone?: string;
  name: string;
  role: 'worker' | 'contractor' | 'admin';
  sectorId: string;
  siteName: string;
  hourlyRate: number;
  bloodGroup: string;
  age: string;
  weight: string;
  height: string;
  passwordHash?: string;
  passwordSalt?: string;
  avatar?: string;
  safeHoursLogged: number;
  createdAt: string;
  updatedAt: string;
}

export interface MongoShiftDoc {
  _id: string;
  workerId: string;
  workerName: string;
  sectorId: string;
  zone: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd?: string;
  hoursWorked: number;
  standardHours: number;
  restHoursBeforeShift: number;
  coords: { lat: number; lon: number };
  safetyPhotoUrl?: string;
  safetyPhotoTimestamp?: string;
  safetyPhotoStatus: 'VERIFIED' | 'PENDING' | 'FLAGGED';
  ppeItems: { name: string; verified: boolean }[];
  twoKeyVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MongoReceiptDoc {
  _id: string;
  receiptId: string;
  workerId: string;
  workerName: string;
  sectorId: string;
  siteName: string;
  shiftDate: string;
  hoursWorked: number;
  grossPay: number;
  netPay: number;
  overtimeHours: number;
  overtimePay: number;
  deductions: number;
  ledgerHash: string;
  previousHash: string;
  status: string;
  explanation?: string;
  createdAt: string;
}

export interface MongoHazardDoc {
  _id: string;
  title: string;
  description: string;
  sectorId: string;
  zone: string;
  severity: string;
  corroboratorCount: number;
  status: string;
  photoUrl?: string;
  slaMinutesRemaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface MongoComplaintDoc {
  _id: string;
  targetId: string;
  sectorId: string;
  encryptedSummary: string;
  salt?: string;
  hash?: string;
  isUrgent: boolean;
  thresholdK: number;
  isUnlocked: boolean;
  createdAt: string;
}

export interface MongoWorksiteDoc {
  _id: string;
  name: string;
  sector: string;
  requiredSkills: string[];
  address: string;
  activeLabourCount: number;
  createdAt: string;
}

export interface DbHealthStatus {
  status: 'connected' | 'fallback_ready';
  databaseName: string;
  atlasCluster: string;
  registeredUser: string;
  latencyMs: number;
  collections: {
    users: number;
    shifts: number;
    receipts: number;
    hazards: number;
    complaints: number;
    worksites: number;
  };
  security: {
    sslEnabled: boolean;
    ipWhitelisted: boolean;
    authMechanism: 'SCRAM-SHA-256' | 'REST-HMAC';
  };
  timestamp: string;
}
