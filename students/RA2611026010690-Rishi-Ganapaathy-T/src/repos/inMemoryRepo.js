/**
 * In-Memory Repository Implementation
 * Loads initial seed data and operates purely in-memory. Zero database setup needed.
 * Thread-safe for single Node.js event-loop instance.
 */

const fs = require('fs');
const path = require('path');
const seedData = require('../data/seedData.json');

class InMemoryRepo {
  constructor() {
    this.reset();
  }

  /**
   * Reset or re-seed in-memory collections
   */
  reset() {
    this.users = JSON.parse(JSON.stringify(seedData.users || []));
    this.shifts = JSON.parse(JSON.stringify(seedData.shifts || []));
    this.grievances = JSON.parse(JSON.stringify(seedData.grievances || []));
    this.anonymousFeedback = JSON.parse(JSON.stringify(seedData.anonymousFeedback || []));
    this.passports = JSON.parse(JSON.stringify(seedData.passports || []));
    this.tasks = JSON.parse(JSON.stringify(seedData.tasks || []));

    // Load per-person tasks from tasks/<folderSlug>/tasks.json if available
    for (const user of this.users) {
      if (!user.folderSlug) continue;
      try {
        const filePath = path.join(__dirname, '..', '..', 'tasks', user.folderSlug, 'tasks.json');
        if (fs.existsSync(filePath)) {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(parsed.tasks)) {
            for (const t of parsed.tasks) {
              if (!this.tasks.some((existing) => existing.id === t.id)) {
                this.tasks.push(t);
              }
            }
          }
        }
      } catch {
        // Ignore read error in restricted environments
      }
    }

    // Rate-limit lookup table: token -> timestamp (never contains worker ID or feedback ID)
    this.feedbackRateLimitTokens = new Set();
  }

  syncPersonTasksFolder(workerId) {
    const user = this.users.find((u) => u.id === workerId);
    if (!user || !user.folderSlug) return;
    try {
      const dirPath = path.join(__dirname, '..', '..', 'tasks', user.folderSlug);
      fs.mkdirSync(dirPath, { recursive: true });
      const filePath = path.join(dirPath, 'tasks.json');
      const userTasks = this.tasks.filter((t) => t.workerId === workerId);
      const payload = {
        workerId: user.id,
        name: user.name,
        roleTitle: user.roleTitle,
        industry: user.industry,
        department: user.department,
        folderPath: `tasks/${user.folderSlug}`,
        tasks: userTasks,
      };
      fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    } catch {
      // Ignore write error in read-only container
    }
  }

  // --- Users ---
  async findUserById(id) {
    return this.users.find((u) => u.id === id) || null;
  }

  async findUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  async listUsers(filter = {}) {
    return this.users.filter((u) => {
      if (filter.industry && u.industry !== filter.industry) return false;
      if (filter.role && u.role !== filter.role) return false;
      return true;
    });
  }

  async createUser(userData) {
    const newUser = { id: `usr-${Date.now()}`, ...userData, createdAt: new Date().toISOString() };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id, updates) {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.users[idx];
  }

  // --- Shifts & Attendance ---
  async findShiftById(id) {
    return this.shifts.find((s) => s.id === id) || null;
  }

  async listShiftsByWorker(workerId) {
    return this.shifts
      .filter((s) => s.workerId === workerId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async listShiftsByIndustry(industry) {
    return this.shifts
      .filter((s) => !industry || s.industry === industry)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async getActiveShift(workerId) {
    return this.shifts.find((s) => s.workerId === workerId && s.status === 'active') || null;
  }

  async createShift(shiftData) {
    const newShift = {
      id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...shiftData,
      createdAt: new Date().toISOString(),
    };
    this.shifts.push(newShift);
    return newShift;
  }

  async updateShift(id, updates) {
    const idx = this.shifts.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.shifts[idx] = { ...this.shifts[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.shifts[idx];
  }

  // --- Grievances & Safety Reports ---
  async listGrievances(filter = {}) {
    return this.grievances
      .filter((g) => {
        if (filter.industry && g.industry !== filter.industry) return false;
        if (filter.workerId && g.workerId !== filter.workerId) return false;
        if (filter.status && g.status !== filter.status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  async findGrievanceById(id) {
    return this.grievances.find((g) => g.id === id) || null;
  }

  async createGrievance(data) {
    const newGrievance = {
      id: `grv-${Date.now()}`,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      replies: [],
      ...data,
    };
    this.grievances.push(newGrievance);
    return newGrievance;
  }

  async updateGrievanceStatus(id, status, replyMeta = null) {
    const grv = await this.findGrievanceById(id);
    if (!grv) return null;

    grv.status = status;
    const now = new Date().toISOString();
    if (status === 'Acknowledged' && !grv.acknowledgedAt) grv.acknowledgedAt = now;
    if (status === 'Resolved' && !grv.resolvedAt) grv.resolvedAt = now;

    if (replyMeta) {
      grv.replies.push({
        author: replyMeta.author,
        authorRole: replyMeta.authorRole || 'admin',
        message: replyMeta.message,
        timestamp: now,
      });
    }
    return grv;
  }

  // --- Anonymous Feedback ---
  // HARD PRIVACY REQUIREMENT:
  // The feedback record MUST NEVER contain workerId, name, IP, or any reversible trace.
  async recordRateLimitToken(token) {
    this.feedbackRateLimitTokens.add(token);
  }

  async hasRateLimitToken(token) {
    return this.feedbackRateLimitTokens.has(token);
  }

  async createAnonymousFeedback(cleanRecord) {
    // Assert no workerId exists
    const sanitized = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      industry: cleanRecord.industry,
      department: cleanRecord.department,
      shiftName: cleanRecord.shiftName || 'Standard',
      category: cleanRecord.category,
      sentiment: cleanRecord.sentiment || 'neutral',
      rating: cleanRecord.rating || 3,
      comment: cleanRecord.comment,
      submittedPeriod: cleanRecord.submittedPeriod || new Date().toISOString().slice(0, 10),
      submittedAt: new Date().toISOString(),
    };
    this.anonymousFeedback.push(sanitized);
    return sanitized;
  }

  async listAnonymousFeedback(filter = {}) {
    return this.anonymousFeedback
      .filter((f) => {
        if (filter.industry && f.industry !== filter.industry) return false;
        if (filter.department && f.department !== filter.department) return false;
        return true;
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  // --- Skill Passports ---
  async findPassportById(id) {
    return this.passports.find((p) => p.id === id) || null;
  }

  async findPassportByWorkerId(workerId) {
    return this.passports.find((p) => p.workerId === workerId) || null;
  }

  async createPassport(passportData) {
    const passport = {
      id: `FS-SKILL-${Math.floor(1000 + Math.random() * 9000)}`,
      verificationStatus: 'verified',
      issuedDate: new Date().toISOString().slice(0, 10),
      ...passportData,
    };
    this.passports.push(passport);
    return passport;
  }

  async updatePassport(id, updates) {
    const idx = this.passports.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.passports[idx] = { ...this.passports[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.passports[idx];
  }

  // --- Per-Person Tasks Folder ---
  async listTasks(filter = {}) {
    return this.tasks
      .filter((t) => {
        if (filter.workerId && t.workerId !== filter.workerId) return false;
        if (filter.industry && t.industry !== filter.industry) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async createTask(taskData) {
    const newTask = {
      id: `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      ...taskData,
    };
    this.tasks.push(newTask);
    this.syncPersonTasksFolder(newTask.workerId);
    return newTask;
  }

  async updateTaskStatus(id, status) {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.tasks[idx].status = status;
    this.tasks[idx].updatedAt = new Date().toISOString();
    this.syncPersonTasksFolder(this.tasks[idx].workerId);
    return this.tasks[idx];
  }

  async deleteTask(id) {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    const workerId = this.tasks[idx].workerId;
    this.tasks.splice(idx, 1);
    this.syncPersonTasksFolder(workerId);
    return true;
  }
}

module.exports = InMemoryRepo;

