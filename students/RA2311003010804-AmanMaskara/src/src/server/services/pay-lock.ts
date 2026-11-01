import { randomBytes } from "node:crypto";
import type { Repos } from "@/server/repos/types";

/** Longer than any payroll step takes; a crashed holder frees the lock after this. */
const LOCK_TTL_MS = 30_000;
/** How long a second request waits for the first before giving up ("busy"). */
const WAIT_MS = 5_000;
const RETRY_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn` while holding the payroll lock of one organisation and month, so checking who can be
 * paid and saving the result happen as one step: two checkouts can't both claim a worker, and a
 * payment can't be recorded twice. Returns "busy" if the lock stays taken.
 */
export async function withPayrollLock<T>(
  repos: Repos,
  orgId: string,
  month: string,
  fn: () => Promise<T>,
  waitMs = WAIT_MS,
): Promise<T | "busy"> {
  const key = `payroll:${orgId}:${month}`;
  const owner = randomBytes(8).toString("hex");
  const deadline = Date.now() + waitMs;
  while (!(await repos.locks.acquire(key, owner, new Date(Date.now() + LOCK_TTL_MS), new Date()))) {
    if (Date.now() >= deadline) return "busy";
    await sleep(RETRY_MS);
  }
  try {
    return await fn();
  } finally {
    await repos.locks.release(key, owner);
  }
}
