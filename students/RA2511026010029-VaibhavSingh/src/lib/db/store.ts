/**
 * FairShift Hisaab - MongoDB Memory Store & Document Engine
 * Fully compatible with MongoDB query conventions.
 * Acts as the high-availability local buffer and offline fallback for MongoDB Atlas.
 */

import {
  MongoUserDoc,
  MongoShiftDoc,
  MongoReceiptDoc,
  MongoHazardDoc,
  MongoComplaintDoc,
  MongoWorksiteDoc,
} from './types';
import { SEED_USERS, SEED_HAZARDS, SEED_COMPLAINTS, SEED_RECEIPTS } from '../storage/seedData';

class MongoCollection<T extends { _id: string }> {
  private docs = new Map<string, T>();

  constructor(initialDocs?: T[]) {
    if (initialDocs) {
      initialDocs.forEach((doc) => this.docs.set(doc._id, { ...doc }));
    }
  }

  async find(filter?: Partial<T>): Promise<T[]> {
    const all = Array.from(this.docs.values());
    if (!filter || Object.keys(filter).length === 0) {
      return all;
    }
    return all.filter((doc) => {
      return Object.entries(filter).every(([key, value]) => {
        return (doc as any)[key] === value;
      });
    });
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    const results = await this.find(filter);
    return results.length > 0 ? results[0] : null;
  }

  async findById(id: string): Promise<T | null> {
    return this.docs.get(id) || null;
  }

  async insertOne(doc: T): Promise<T> {
    const id = doc._id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const finalDoc = { ...doc, _id: id };
    this.docs.set(id, finalDoc);
    return finalDoc;
  }

  async updateOne(filter: Partial<T>, update: Partial<T>): Promise<boolean> {
    const target = await this.findOne(filter);
    if (!target) return false;

    const updated = { ...target, ...update, updatedAt: new Date().toISOString() };
    this.docs.set(target._id, updated as T);
    return true;
  }

  async deleteOne(filter: Partial<T>): Promise<boolean> {
    const target = await this.findOne(filter);
    if (!target) return false;
    return this.docs.delete(target._id);
  }

  async countDocuments(filter?: Partial<T>): Promise<number> {
    const matches = await this.find(filter);
    return matches.length;
  }
}

// Seed initial users
const initialUsers: MongoUserDoc[] = SEED_USERS.map((u) => ({
  _id: u.id,
  phone: u.phone,
  name: u.name,
  role: u.role,
  sectorId: u.sectorId,
  siteName: u.siteName,
  hourlyRate: u.hourlyRate,
  bloodGroup: 'O+',
  age: '30',
  weight: '60 kg',
  height: '165 cm',
  avatar: u.avatar,
  safeHoursLogged: u.safeHoursLogged || 0,
  createdAt: '2026-10-25T08:00:00.000Z',
  updatedAt: new Date().toISOString(),
}));

// Seed initial shifts
const initialShifts: MongoShiftDoc[] = [
  {
    _id: 'shift-sunita-today',
    workerId: 'worker-sunita',
    workerName: 'Sunita Devi',
    sectorId: 'srmist',
    zone: 'Hostel Block A & B (Sanitation)',
    shiftDate: '2026-10-30',
    shiftStart: '08:00 AM',
    hoursWorked: 7.5,
    standardHours: 8.0,
    restHoursBeforeShift: 11.5,
    coords: { lat: 12.8234, lon: 80.0451 },
    safetyPhotoStatus: 'VERIFIED',
    safetyPhotoTimestamp: '08:02 AM',
    ppeItems: [
      { name: 'Sanitation Heavy-Duty Gloves', verified: true },
      { name: 'Reflective Safety Apron / High-Vis', verified: true },
      { name: 'Slip-Resistant Work Boots', verified: true },
    ],
    twoKeyVerified: true,
    createdAt: '2026-10-30T08:02:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'shift-rajesh-today',
    workerId: 'worker-rajesh',
    workerName: 'Rajesh Kumar',
    sectorId: 'srmist',
    zone: 'Hostel Block A',
    shiftDate: '2026-10-30',
    shiftStart: '07:30 AM',
    hoursWorked: 9.2,
    standardHours: 8.0,
    restHoursBeforeShift: 8.2, // violation < 10h
    coords: { lat: 12.8236, lon: 80.0453 },
    safetyPhotoStatus: 'FLAGGED',
    safetyPhotoTimestamp: '07:35 AM',
    ppeItems: [
      { name: 'Sanitation Heavy-Duty Gloves', verified: false },
      { name: 'Reflective Safety Apron / High-Vis', verified: true },
      { name: 'Slip-Resistant Work Boots', verified: true },
    ],
    twoKeyVerified: true,
    createdAt: '2026-10-30T07:35:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

// Seed initial hazards
const initialHazards: MongoHazardDoc[] = SEED_HAZARDS.map((h) => ({
  _id: h.id,
  title: h.title,
  description: h.description,
  sectorId: h.siteId,
  zone: h.zone,
  severity: h.severity,
  corroboratorCount: h.corroboratorCount,
  status: h.status,
  slaMinutesRemaining: 42,
  createdAt: h.createdAt,
  updatedAt: new Date().toISOString(),
}));

// Seed initial complaints
const initialComplaints: MongoComplaintDoc[] = SEED_COMPLAINTS.map((c) => ({
  _id: c.id,
  targetId: c.targetId,
  sectorId: c.siteId,
  encryptedSummary: c.sanitizedSummary,
  isUrgent: c.isUrgent,
  thresholdK: 3,
  isUnlocked: true,
  createdAt: c.timestamp,
}));

// Seed initial receipts
const initialReceipts: MongoReceiptDoc[] = SEED_RECEIPTS.map((r) => ({
  _id: r.id,
  receiptId: r.id,
  workerId: r.workerId,
  workerName: 'Sunita Devi',
  sectorId: 'srmist',
  siteName: 'SRMIST Campus',
  shiftDate: r.shiftDate,
  hoursWorked: r.worked.hours,
  grossPay: r.worked.totalRupees,
  netPay: r.paid.totalRupees,
  overtimeHours: Math.max(0, r.worked.hours - r.agreed.hours),
  overtimePay: r.rupeeDifference,
  deductions: 0,
  ledgerHash: `sha256_${r.id}_${Date.now()}`,
  previousHash: 'sha256_genesis_receipt',
  status: r.status,
  explanation: r.explanation,
  createdAt: new Date().toISOString(),
}));

// Seed initial worksites
const initialWorksites: MongoWorksiteDoc[] = [
  {
    _id: 'site-srmist-main',
    name: 'SRMIST Campus Kattankulathur',
    sector: 'Campus Facilities & Sanitation',
    requiredSkills: ['Sanitation', 'Floor Maintenance', 'Waste Segregation'],
    address: 'Kattankulathur, Chengalpattu, Tamil Nadu 603203',
    activeLabourCount: 18,
    createdAt: '2026-10-20T00:00:00.000Z',
  },
  {
    _id: 'site-metro-line4',
    name: 'Chennai Metro Rail Line 4',
    sector: 'Heavy Infrastructure',
    requiredSkills: ['Bar Bending', 'Rebar Tying', 'Scaffolding', 'Rigging'],
    address: 'Poonamallee Bypass to Light House corridor',
    activeLabourCount: 42,
    createdAt: '2026-10-20T00:00:00.000Z',
  },
];

export const memoryCollections = {
  users: new MongoCollection<MongoUserDoc>(initialUsers),
  shifts: new MongoCollection<MongoShiftDoc>(initialShifts),
  receipts: new MongoCollection<MongoReceiptDoc>(initialReceipts),
  hazards: new MongoCollection<MongoHazardDoc>(initialHazards),
  complaints: new MongoCollection<MongoComplaintDoc>(initialComplaints),
  worksites: new MongoCollection<MongoWorksiteDoc>(initialWorksites),
};
