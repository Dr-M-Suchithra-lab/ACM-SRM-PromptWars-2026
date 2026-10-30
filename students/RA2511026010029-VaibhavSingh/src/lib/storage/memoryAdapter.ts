import {
  StorageAdapter,
  UserProfile,
  ShiftRecordData,
  HazardTicketData,
  EscrowComplaintData,
  CorrectionRequestData,
} from './types';
import { WorkReceipt } from '@/core/receipt';
import {
  SEED_USERS,
  SEED_SHIFTS,
  SEED_RECEIPTS,
  SEED_HAZARDS,
  SEED_COMPLAINTS,
  SEED_CORRECTIONS,
} from './seedData';
import { get, set } from 'idb-keyval';

export class MemoryStorageAdapter implements StorageAdapter {
  private users: UserProfile[] = [...SEED_USERS];
  private shifts: ShiftRecordData[] = [...SEED_SHIFTS];
  private receipts: WorkReceipt[] = [...SEED_RECEIPTS];
  private hazards: HazardTicketData[] = [...SEED_HAZARDS];
  private complaints: EscrowComplaintData[] = [...SEED_COMPLAINTS];
  private corrections: CorrectionRequestData[] = [...SEED_CORRECTIONS];

  private broadcastChannel: BroadcastChannel | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('fairshift-sync-channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_RELOAD') {
            this.loadFromIndexedDb();
          }
        };
      } catch (e) {
        // BroadcastChannel may not be supported in some environments
      }
      this.loadFromIndexedDb();
    }
  }

  private async loadFromIndexedDb() {
    try {
      const persistedUsers = await get<UserProfile[]>('fairshift_users');
      if (persistedUsers) this.users = persistedUsers;

      const persistedShifts = await get<ShiftRecordData[]>('fairshift_shifts');
      if (persistedShifts) this.shifts = persistedShifts;

      const persistedReceipts = await get<WorkReceipt[]>('fairshift_receipts');
      if (persistedReceipts) this.receipts = persistedReceipts;

      const persistedHazards = await get<HazardTicketData[]>('fairshift_hazards');
      if (persistedHazards) this.hazards = persistedHazards;

      const persistedComplaints = await get<EscrowComplaintData[]>('fairshift_complaints');
      if (persistedComplaints) this.complaints = persistedComplaints;

      const persistedCorrections = await get<CorrectionRequestData[]>('fairshift_corrections');
      if (persistedCorrections) this.corrections = persistedCorrections;

      this.isInitialized = true;
    } catch (e) {
      // In SSR or test environments, IDB is bypassed
    }
  }

  private async persistAndBroadcast() {
    if (typeof window !== 'undefined') {
      try {
        await set('fairshift_users', this.users);
        await set('fairshift_shifts', this.shifts);
        await set('fairshift_receipts', this.receipts);
        await set('fairshift_hazards', this.hazards);
        await set('fairshift_complaints', this.complaints);
        await set('fairshift_corrections', this.corrections);

        this.broadcastChannel?.postMessage({
          type: 'SYNC_RELOAD',
          timestamp: Date.now(),
        });
      } catch (e) {
        // Fallback or ignore in SSR
      }
    }
  }

  async getUsers(): Promise<UserProfile[]> {
    return [...this.users];
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const user = this.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  async saveUser(user: UserProfile): Promise<void> {
    const index = this.users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      this.users[index] = { ...user };
    } else {
      this.users.push({ ...user });
    }
    await this.persistAndBroadcast();
  }

  async getShifts(workerId?: string): Promise<ShiftRecordData[]> {
    if (workerId) {
      return this.shifts.filter((s) => s.workerId === workerId);
    }
    return [...this.shifts];
  }

  async addShift(shift: ShiftRecordData): Promise<void> {
    this.shifts.unshift({ ...shift });
    await this.persistAndBroadcast();
  }

  async getReceipts(workerId?: string): Promise<WorkReceipt[]> {
    if (workerId) {
      return this.receipts.filter((r) => r.workerId === workerId);
    }
    return [...this.receipts];
  }

  async getReceiptById(id: string): Promise<WorkReceipt | null> {
    const rcpt = this.receipts.find((r) => r.id === id);
    return rcpt ? { ...rcpt } : null;
  }

  async saveReceipt(receipt: WorkReceipt): Promise<void> {
    const index = this.receipts.findIndex((r) => r.id === receipt.id);
    if (index >= 0) {
      this.receipts[index] = { ...receipt };
    } else {
      this.receipts.unshift({ ...receipt });
    }
    await this.persistAndBroadcast();
  }

  async getHazards(siteId?: string): Promise<HazardTicketData[]> {
    if (siteId) {
      return this.hazards.filter((h) => h.siteId === siteId);
    }
    return [...this.hazards];
  }

  async getHazardById(id: string): Promise<HazardTicketData | null> {
    const h = this.hazards.find((item) => item.id === id);
    return h ? { ...h } : null;
  }

  async saveHazard(hazard: HazardTicketData): Promise<void> {
    const index = this.hazards.findIndex((h) => h.id === hazard.id);
    if (index >= 0) {
      this.hazards[index] = { ...hazard };
    } else {
      this.hazards.unshift({ ...hazard });
    }
    await this.persistAndBroadcast();
  }

  async getComplaints(siteId?: string): Promise<EscrowComplaintData[]> {
    if (siteId) {
      return this.complaints.filter((c) => c.siteId === siteId);
    }
    return [...this.complaints];
  }

  async addComplaint(complaint: EscrowComplaintData): Promise<void> {
    this.complaints.unshift({ ...complaint });
    await this.persistAndBroadcast();
  }

  async getCorrections(siteId?: string): Promise<CorrectionRequestData[]> {
    if (siteId) {
      return this.corrections.filter((c) => c.siteId === siteId);
    }
    return [...this.corrections];
  }

  async addCorrection(correction: CorrectionRequestData): Promise<void> {
    this.corrections.unshift({ ...correction });
    await this.persistAndBroadcast();
  }

  async updateCorrection(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    comment?: string
  ): Promise<void> {
    const corr = this.corrections.find((c) => c.id === id);
    if (corr) {
      corr.status = status;
      corr.contractorComment = comment;

      // If approved, reconcile the corresponding receipt
      if (status === 'APPROVED') {
        const rcpt = this.receipts.find((r) => r.id === corr.receiptId);
        if (rcpt) {
          rcpt.paid = {
            ...rcpt.worked,
          };
          rcpt.status = 'MATCH';
          rcpt.hourDifference = 0;
          rcpt.rupeeDifference = 0;
          rcpt.explanation = 'Approved by contractor: Shift wage mismatch fully reconciled.';
        }
      }
      await this.persistAndBroadcast();
    }
  }

  async resetToSeedData(): Promise<void> {
    this.users = [...SEED_USERS];
    this.shifts = [...SEED_SHIFTS];
    this.receipts = [...SEED_RECEIPTS];
    this.hazards = [...SEED_HAZARDS];
    this.complaints = [...SEED_COMPLAINTS];
    this.corrections = [...SEED_CORRECTIONS];
    await this.persistAndBroadcast();
  }
}
