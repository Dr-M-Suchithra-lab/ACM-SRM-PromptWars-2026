/**
 * In-memory repository implementation, seeded on first use.
 * Used in development and tests; production uses MongoDB (see mongo.ts).
 */
import type { AiLogEntry, Repos } from "./types";
import { getSeedData, type SeedData } from "../seed/data";

interface MemoryStore extends SeedData {
  feedbackGuards: Set<string>;
  issueSigners: Set<string>;
  aiLog: AiLogEntry[];
  ttsCache: Map<string, string>;
}

const AI_LOG_LIMIT = 200;
const TTS_CACHE_LIMIT = 200;

// Kept on globalThis so every route bundle in the Node process shares one store.
const globalStore = globalThis as typeof globalThis & { __fairshiftStore?: MemoryStore };

function getStore(): MemoryStore {
  globalStore.__fairshiftStore ??= {
    ...getSeedData(new Date()),
    feedbackGuards: new Set(),
    issueSigners: new Set(),
    aiLog: [],
    ttsCache: new Map(),
  };
  return globalStore.__fairshiftStore;
}

/** Test helper: drop the store so the next access reseeds. */
export function resetMemoryStore(): void {
  globalStore.__fairshiftStore = undefined;
}

type Collection = {
  [K in keyof SeedData]: SeedData[K] extends (infer T)[] ? (T extends { id: string } ? K : never) : never;
}[keyof SeedData];
type Item<K extends Collection> = SeedData[K][number];

/** CRUD over one array in the store. Records are replaced, never mutated in place. */
function table<K extends Collection>(name: K) {
  const items = () => getStore()[name] as Item<K>[];
  return {
    all: async () => [...items()],
    where: async (match: (item: Item<K>) => boolean) => items().filter(match),
    byId: async (id: string) => items().find((item) => item.id === id),
    create: async (item: Item<K>) => {
      items().push(item);
    },
    update: async (id: string, data: Partial<Item<K>>) => {
      const list = items();
      const index = list.findIndex((item) => item.id === id);
      if (index !== -1) list[index] = { ...list[index], ...data };
    },
  };
}

function guards(name: "feedbackGuards" | "issueSigners") {
  return {
    has: async (key: string) => getStore()[name].has(key),
    add: async (key: string) => {
      getStore()[name].add(key);
    },
  };
}

export function createMemoryRepos(): Repos {
  const orgs = table("orgs");
  const sites = table("sites");
  const workers = table("workers");
  const admins = table("admins");
  const shifts = table("shifts");
  const hazards = table("hazards");
  const feedback = table("feedback");
  const skills = table("skills");
  const paidRecords = table("paidRecords");
  const payDisputes = table("payDisputes");
  const issues = table("issues");
  const certificates = table("certificates");

  return {
    orgs: { getAll: orgs.all, getById: orgs.byId },
    sites: { getAll: sites.all, getByOrg: (orgId) => sites.where((s) => s.orgId === orgId), getById: sites.byId },
    workers: {
      getAll: workers.all,
      getByOrg: (orgId) => workers.where((w) => w.orgId === orgId),
      getByCode: async (code) => (await workers.where((w) => w.code === code))[0],
      getById: workers.byId,
    },
    admins: {
      getAll: admins.all,
      getByEmail: async (email) => (await admins.where((a) => a.email === email))[0],
      getById: admins.byId,
    },
    shifts: {
      getAll: shifts.all,
      getByWorker: (workerId) => shifts.where((s) => s.workerId === workerId),
      getByWorkers: (workerIds) => {
        const ids = new Set(workerIds);
        return shifts.where((s) => ids.has(s.workerId));
      },
      getOpenByWorkers: (workerIds) => {
        const ids = new Set(workerIds);
        return shifts.where((s) => ids.has(s.workerId) && !s.outAt);
      },
      getByWorkerInRange: (workerId, from, to) =>
        shifts.where((s) => s.workerId === workerId && s.inAt >= from && s.inAt <= to),
      getByWorkersInRange: (workerIds, from, to) => {
        const ids = new Set(workerIds);
        return shifts.where((s) => ids.has(s.workerId) && s.inAt >= from && s.inAt <= to);
      },
      getBySite: (siteId) => shifts.where((s) => s.siteId === siteId),
      create: shifts.create,
      update: shifts.update,
    },
    hazards: {
      getAll: hazards.all,
      getByOrg: (orgId) => hazards.where((h) => h.orgId === orgId),
      getById: hazards.byId,
      create: hazards.create,
      update: hazards.update,
    },
    feedback: {
      getAll: feedback.all,
      getByOrg: (orgId) => feedback.where((f) => f.orgId === orgId),
      getByCohortAndWeek: (cohort, weekBucket) =>
        feedback.where((f) => f.cohort === cohort && f.weekBucket === weekBucket),
      create: feedback.create,
    },
    skills: {
      getByWorker: (workerId) => skills.where((s) => s.workerId === workerId),
      getByWorkers: (workerIds) => skills.where((s) => workerIds.includes(s.workerId)),
      getById: skills.byId,
      create: skills.create,
      update: skills.update,
    },
    feedbackGuards: guards("feedbackGuards"),
    paidRecords: {
      getByOrgMonth: (orgId, month) => paidRecords.where((r) => r.orgId === orgId && r.month === month),
      get: (workerId, month) => paidRecords.byId(`${workerId}:${month}`),
      upsert: async (record) => {
        if (await paidRecords.byId(record.id)) await paidRecords.update(record.id, record);
        else await paidRecords.create(record);
      },
    },
    payDisputes: {
      getByOrg: (orgId) => payDisputes.where((d) => d.orgId === orgId),
      getByWorker: (workerId) => payDisputes.where((d) => d.workerId === workerId),
      getById: payDisputes.byId,
      create: payDisputes.create,
      update: payDisputes.update,
    },
    issues: {
      getBySite: (siteId) => issues.where((i) => i.siteId === siteId),
      getByOrg: (orgId) => issues.where((i) => i.orgId === orgId),
      getById: issues.byId,
      create: issues.create,
      update: issues.update,
    },
    issueSigners: guards("issueSigners"),
    certificates: {
      getByOrg: (orgId) => certificates.where((c) => c.orgId === orgId),
      getByWorker: (workerId) => certificates.where((c) => c.workerId === workerId),
      getById: certificates.byId,
      create: certificates.create,
      update: certificates.update,
    },
    aiLog: {
      add: async (entry) => {
        const log = getStore().aiLog;
        log.unshift(entry);
        log.length = Math.min(log.length, AI_LOG_LIMIT);
      },
      recent: async (limit) => getStore().aiLog.slice(0, limit),
    },
    ttsCache: {
      get: async (key) => getStore().ttsCache.get(key),
      set: async (key, wav) => {
        const cache = getStore().ttsCache;
        if (cache.size >= TTS_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
        cache.set(key, wav);
      },
    },
  };
}
