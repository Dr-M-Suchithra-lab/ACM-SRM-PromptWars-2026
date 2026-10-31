import { openDB, type IDBPDatabase } from "idb";

export type QueuedOp =
  | { type: "checkin"; clientOpId: string; createdAt: string; payload: { token: string } }
  | { type: "checkout"; clientOpId: string; createdAt: string; payload?: Record<string, never> };

export interface SyncResult {
  clientOpId: string;
  ok: boolean;
  status?: string;
  error?: string;
}

const DB_NAME = "fairshift";
const STORE = "queue";
export const SYNC_BATCH_SIZE = 20;

// ─── Pure helpers (unit-tested) ─────────────────────────────────────

/** Oldest first, so a check-out never replays before its check-in. */
export function orderOps(ops: QueuedOp[]): QueuedOp[] {
  return [...ops].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Ops the server processed (success or a permanent rejection) leave the queue.
 * Anything without a result (e.g. the request failed mid-way) stays for the next try.
 */
export function settledOpIds(results: SyncResult[]): string[] {
  return results.map((r) => r.clientOpId);
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (typeof navigator !== "undefined" && navigator.onLine === false);
}

// ─── IndexedDB storage ──────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE, { keyPath: "clientOpId" });
    },
  });
  return dbPromise;
}

export async function enqueue(op: QueuedOp): Promise<void> {
  await (await db()).put(STORE, op);
  window.dispatchEvent(new Event("fairshift:queue"));
}

export async function pendingOps(): Promise<QueuedOp[]> {
  return orderOps(await (await db()).getAll(STORE));
}

export async function pendingCount(): Promise<number> {
  return (await db()).count(STORE);
}

/** Send queued ops to /api/sync. Returns how many were settled. Never throws. */
export async function flushQueue(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  try {
    const ops = (await pendingOps()).slice(0, SYNC_BATCH_SIZE);
    if (ops.length === 0) return 0;
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ops }),
    });
    if (!response.ok) return 0;
    const { results } = (await response.json()) as { results: SyncResult[] };
    const database = await db();
    const ids = settledOpIds(results);
    await Promise.all(ids.map((id) => database.delete(STORE, id)));
    window.dispatchEvent(new Event("fairshift:queue"));
    return ids.length;
  } catch {
    return 0;
  }
}
