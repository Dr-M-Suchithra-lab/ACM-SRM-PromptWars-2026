import "server-only";
import { MongoClient, type Collection, type Db, type Document, type Filter } from "mongodb";
import { getISTDay } from "@/core/time";
import { isDemoMode } from "@/server/config";
import { getSeedData, SEED_VERSION, type SeedData } from "../seed/data";
import type { AiLogEntry, Repos } from "./types";

/*
 * MongoDB implementation of the Repos interface (used when MONGODB_URI is set).
 * Documents use the entity id as _id. The demo seed is generated relative to today, so in
 * demo mode the database is re-seeded once per IST day (and whenever the seed changes):
 * judges always see a realistic last-14-days picture, never a stale one.
 */

type WithId<T> = T & { _id: string };

const SEEDED_COLLECTIONS = [
  "orgs",
  "sites",
  "workers",
  "admins",
  "shifts",
  "hazards",
  "feedback",
  "skills",
  "paidRecords",
  "payDisputes",
  "issues",
  "certificates",
  "payoutAccounts",
  "payoutBatches",
] as const satisfies readonly (keyof SeedData)[];
const GUARD_COLLECTIONS = ["feedbackGuards", "issueSigners"] as const;
const AI_LOG_LIMIT = 200;

const globalMongo = globalThis as typeof globalThis & { __fairshiftMongo?: Promise<Db> };

async function connect(): Promise<Db> {
  const client = new MongoClient(process.env.MONGODB_URI!, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "fairshift");
  await ensureSeeded(db);
  return db;
}

/** One pooled client per server instance (survives hot reloads and warm serverless invocations). */
function db(): Promise<Db> {
  globalMongo.__fairshiftMongo ??= connect().catch((error) => {
    globalMongo.__fairshiftMongo = undefined;
    throw error;
  });
  return globalMongo.__fairshiftMongo;
}

/**
 * Atomically claim the (re)seed so only one instance does it: the update matches only when
 * the stored seed is outdated; when it is current, the upsert collides on _id and we skip.
 */
async function claimReseed(database: Db, now: Date): Promise<boolean> {
  const meta = database.collection<{ _id: string; version: number; day: string }>("meta");
  const day = getISTDay(now);
  const stale: Filter<{ _id: string; version: number; day: string }> = isDemoMode()
    ? { _id: "seed", $or: [{ version: { $ne: SEED_VERSION } }, { day: { $ne: day } }] }
    : { _id: "seed", version: { $ne: SEED_VERSION } };
  try {
    await meta.updateOne(stale, { $set: { version: SEED_VERSION, day } }, { upsert: true });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false; // already current
    throw error;
  }
}

async function ensureSeeded(database: Db): Promise<void> {
  const now = new Date();
  if (!(await claimReseed(database, now))) return;
  const seed = getSeedData(now);
  await Promise.all(
    [...SEEDED_COLLECTIONS, ...GUARD_COLLECTIONS].map((name) => database.collection(name).deleteMany({})),
  );
  await Promise.all(
    SEEDED_COLLECTIONS.map(async (name) => {
      const items = seed[name] as { id: string }[];
      if (items.length)
        await database.collection(name).insertMany(items.map((item) => ({ _id: item.id, ...item }) as Document));
    }),
  );
  await Promise.all([
    database.collection("shifts").createIndex({ workerId: 1, inAt: 1 }),
    database.collection("shifts").createIndex({ siteId: 1 }),
    database.collection("hazards").createIndex({ orgId: 1 }),
    database.collection("feedback").createIndex({ orgId: 1, weekBucket: 1 }),
    database.collection("paidRecords").createIndex({ orgId: 1, month: 1 }),
    database.collection("payDisputes").createIndex({ orgId: 1 }),
    database.collection("issues").createIndex({ siteId: 1 }),
    database.collection("certificates").createIndex({ orgId: 1 }),
    database.collection("skills").createIndex({ workerId: 1 }),
    database.collection("payoutAccounts").createIndex({ orgId: 1 }),
    database.collection("payoutBatches").createIndex({ orgId: 1, month: 1 }),
    // Metadata only, kept 30 days; cached speech kept 90 days.
    database.collection("aiLog").createIndex({ at: 1 }, { expireAfterSeconds: 30 * 86_400 }),
    database.collection("ttsCache").createIndex({ at: 1 }, { expireAfterSeconds: 90 * 86_400 }),
    database.collection("workers").createIndex({ code: 1 }, { unique: true }),
    database.collection("admins").createIndex({ email: 1 }, { unique: true }),
  ]);
}

async function col(name: string): Promise<Collection<Document>> {
  return (await db()).collection(name);
}

function strip<T>(doc: WithId<T> | null): T | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc;
  void _id;
  return rest as T;
}

async function find<T>(name: string, filter: Document = {}): Promise<T[]> {
  const docs = (await (await col(name)).find(filter).toArray()) as unknown as WithId<T>[];
  return docs.map((d) => strip(d)!);
}

async function findOne<T>(name: string, filter: Document): Promise<T | undefined> {
  return strip((await (await col(name)).findOne(filter)) as unknown as WithId<T> | null);
}

async function insert<T extends { id: string }>(name: string, item: T): Promise<void> {
  await (await col(name)).insertOne({ _id: item.id, ...item } as unknown as Document);
}

async function update<T>(name: string, id: string, data: Partial<T>): Promise<void> {
  // $set ignores undefined fields; $unset clears them (e.g. a reopened hazard's dismiss reason).
  const set: Document = {};
  const unset: Document = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) unset[key] = "";
    else set[key] = value;
  }
  await (
    await col(name)
  ).updateOne({ _id: id } as Document, {
    ...(Object.keys(set).length ? { $set: set } : {}),
    ...(Object.keys(unset).length ? { $unset: unset } : {}),
  });
}

/** Standard repo methods for one collection. */
function crud<T extends { id: string }>(name: string) {
  return {
    getById: (id: string) => findOne<T>(name, { _id: id }),
    create: (item: T) => insert(name, item),
    update: (id: string, data: Partial<T>) => update<T>(name, id, data),
  };
}

function guards(name: (typeof GUARD_COLLECTIONS)[number]) {
  return {
    has: async (key: string) => (await (await col(name)).countDocuments({ _id: key } as Document, { limit: 1 })) > 0,
    add: async (key: string) => {
      await (
        await col(name)
      ).updateOne({ _id: key } as Document, { $setOnInsert: { at: new Date() } }, { upsert: true });
    },
  };
}

export function createMongoRepos(): Repos {
  return {
    orgs: { getAll: () => find("orgs"), getById: (id) => findOne("orgs", { _id: id }) },
    sites: {
      getAll: () => find("sites"),
      getByOrg: (orgId) => find("sites", { orgId }),
      getById: (id) => findOne("sites", { _id: id }),
    },
    workers: {
      getAll: () => find("workers"),
      getByOrg: (orgId) => find("workers", { orgId }),
      getByCode: (code) => findOne("workers", { code }),
      getById: (id) => findOne("workers", { _id: id }),
    },
    admins: {
      getAll: () => find("admins"),
      getByEmail: (email) => findOne("admins", { email }),
      getById: (id) => findOne("admins", { _id: id }),
    },
    shifts: {
      ...crud("shifts"),
      getAll: () => find("shifts"),
      getByWorker: (workerId) => find("shifts", { workerId }),
      getByWorkers: (workerIds) => find("shifts", { workerId: { $in: workerIds } }),
      // outAt: null matches both a stored null and a missing field.
      getOpenByWorkers: (workerIds) => find("shifts", { workerId: { $in: workerIds }, outAt: null }),
      getByWorkerInRange: (workerId, from, to) => find("shifts", { workerId, inAt: { $gte: from, $lte: to } }),
      getByWorkersInRange: (workerIds, from, to) =>
        find("shifts", { workerId: { $in: workerIds }, inAt: { $gte: from, $lte: to } }),
      getBySite: (siteId) => find("shifts", { siteId }),
    },
    hazards: { ...crud("hazards"), getAll: () => find("hazards"), getByOrg: (orgId) => find("hazards", { orgId }) },
    feedback: {
      getAll: () => find("feedback"),
      getByOrg: (orgId) => find("feedback", { orgId }),
      getByCohortAndWeek: (cohort, weekBucket) => find("feedback", { cohort, weekBucket }),
      create: (entry) => insert("feedback", entry),
    },
    skills: {
      ...crud("skills"),
      getByWorker: (workerId) => find("skills", { workerId }),
      getByWorkers: (workerIds) => find("skills", { workerId: { $in: workerIds } }),
    },
    feedbackGuards: guards("feedbackGuards"),
    paidRecords: {
      getByOrgMonth: (orgId, month) => find("paidRecords", { orgId, month }),
      get: (workerId, month) => findOne("paidRecords", { _id: `${workerId}:${month}` }),
      upsert: async (record) => {
        await (await col("paidRecords")).replaceOne({ _id: record.id } as Document, record, { upsert: true });
      },
    },
    payDisputes: {
      ...crud("payDisputes"),
      getByOrg: (orgId) => find("payDisputes", { orgId }),
      getByWorker: (workerId) => find("payDisputes", { workerId }),
    },
    issues: {
      ...crud("issues"),
      getBySite: (siteId) => find("issues", { siteId }),
      getByOrg: (orgId) => find("issues", { orgId }),
    },
    issueSigners: guards("issueSigners"),
    certificates: {
      ...crud("certificates"),
      getByOrg: (orgId) => find("certificates", { orgId }),
      getByWorker: (workerId) => find("certificates", { workerId }),
    },
    payoutAccounts: {
      getByOrg: (orgId) => find("payoutAccounts", { orgId }),
      get: (workerId) => findOne("payoutAccounts", { _id: workerId }),
      upsert: async (account) => {
        await (await col("payoutAccounts")).replaceOne({ _id: account.id } as Document, account, { upsert: true });
      },
    },
    payoutBatches: {
      ...crud("payoutBatches"),
      getByOrgMonth: (orgId, month) => find("payoutBatches", { orgId, month }),
    },
    aiLog: {
      add: async (entry) => {
        await (await col("aiLog")).insertOne(entry as unknown as Document);
      },
      recent: async (limit) => {
        const docs = await (
          await col("aiLog")
        )
          .find({}, { projection: { _id: 0 } })
          .sort({ at: -1 })
          .limit(Math.min(limit, AI_LOG_LIMIT))
          .toArray();
        return docs as unknown as AiLogEntry[];
      },
    },
    ttsCache: {
      get: async (key) => (await findOne<{ wav: string }>("ttsCache", { _id: key }))?.wav,
      set: async (key, wav) => {
        await (
          await col("ttsCache")
        ).updateOne({ _id: key } as Document, { $set: { wav, at: new Date() } }, { upsert: true });
      },
    },
  };
}
