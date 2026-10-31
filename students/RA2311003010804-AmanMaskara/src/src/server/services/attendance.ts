import { peekQRSiteId, verifyQRToken } from "@/core/qr-token";
import type { Repos, Shift } from "@/server/repos/types";

export type AttendanceResult =
  | { ok: true; status: "checked_in" | "checked_out" | "duplicate"; shift: Shift }
  | { ok: false; error: "invalid_qr" | "expired_qr" | "wrong_site" | "already_in" | "not_in" };

interface CheckInInput {
  workerId: string;
  orgId: string;
  token: string;
  clientOpId: string;
  now: Date;
  /** Set when the scan was queued offline and synced later */
  scannedAt?: Date;
  secretFor: (siteId: string) => Promise<string | null>;
}

export async function checkIn(repos: Repos, input: CheckInInput): Promise<AttendanceResult> {
  const shifts = await repos.shifts.getByWorker(input.workerId);
  const replay = shifts.find((s) => s.clientOpId === input.clientOpId);
  if (replay) return { ok: true, status: "duplicate", shift: replay };

  const siteId = peekQRSiteId(input.token);
  const site = siteId ? await repos.sites.getById(siteId) : undefined;
  const secret = site ? await input.secretFor(site.id) : null;
  if (!site || !secret) return { ok: false, error: "invalid_qr" };

  const offline = input.scannedAt && input.now.getTime() - input.scannedAt.getTime() > 60_000;
  const verdict = verifyQRToken(
    input.token,
    input.now,
    secret,
    offline ? { offlineScannedAt: input.scannedAt } : undefined,
  );
  if (!verdict.valid) return { ok: false, error: verdict.reason === "tampered" ? "invalid_qr" : "expired_qr" };
  if (site.orgId !== input.orgId) return { ok: false, error: "wrong_site" };
  if (shifts.some((s) => !s.outAt)) return { ok: false, error: "already_in" };

  const shift: Shift = {
    id: `shift-${input.clientOpId}`,
    workerId: input.workerId,
    siteId: site.id,
    inAt: offline ? input.scannedAt! : input.now,
    method: "qr",
    clientOpId: input.clientOpId,
    syncedFromOffline: Boolean(offline),
  };
  await repos.shifts.create(shift);
  return { ok: true, status: "checked_in", shift };
}

interface CheckOutInput {
  workerId: string;
  clientOpId: string;
  now: Date;
  /** Time of the tap when queued offline */
  at?: Date;
}

export async function checkOut(repos: Repos, input: CheckOutInput): Promise<AttendanceResult> {
  const shifts = await repos.shifts.getByWorker(input.workerId);
  const replay = shifts.find((s) => s.outOpId === input.clientOpId);
  if (replay) return { ok: true, status: "duplicate", shift: replay };

  const open = shifts.find((s) => !s.outAt);
  if (!open) return { ok: false, error: "not_in" };

  // An offline tap keeps its own time, but never before check-in or after now.
  const tapped = input.at ?? input.now;
  const outAt = new Date(Math.min(input.now.getTime(), Math.max(open.inAt.getTime(), tapped.getTime())));
  await repos.shifts.update(open.id, { outAt, outOpId: input.clientOpId });
  return { ok: true, status: "checked_out", shift: { ...open, outAt, outOpId: input.clientOpId } };
}
