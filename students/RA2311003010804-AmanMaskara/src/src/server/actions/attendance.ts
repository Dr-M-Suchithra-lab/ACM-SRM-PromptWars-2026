"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { qrSecretFor, secretForSiteId } from "@/server/secrets";
import { isDemoMode } from "@/server/config";
import { checkIn, checkOut, type AttendanceResult } from "@/server/services/attendance";
import { signQRToken } from "@/core/qr-token";

export type ActionResult = { ok: true; status: string } | { ok: false; error: string };

const CheckInInput = z.object({
  token: z.string().min(10).max(500),
  clientOpId: z.uuid(),
  scannedAt: z.iso.datetime().optional(),
});

const CheckOutInput = z.object({
  clientOpId: z.uuid(),
  at: z.iso.datetime().optional(),
});

function toActionResult(result: AttendanceResult): ActionResult {
  return result.ok ? { ok: true, status: result.status } : { ok: false, error: result.error };
}

export async function checkInAction(input: unknown): Promise<ActionResult> {
  const session = await requireRole("worker");
  const parsed = CheckInInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_qr" };
  const result = await checkIn(getRepos(), {
    workerId: session.uid,
    orgId: session.orgId,
    token: parsed.data.token,
    clientOpId: parsed.data.clientOpId,
    scannedAt: parsed.data.scannedAt ? new Date(parsed.data.scannedAt) : undefined,
    now: new Date(),
    secretFor: secretForSiteId,
  });
  revalidatePath("/w");
  return toActionResult(result);
}

export async function checkOutAction(input: unknown): Promise<ActionResult> {
  const session = await requireRole("worker");
  const parsed = CheckOutInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "not_in" };
  const result = await checkOut(getRepos(), {
    workerId: session.uid,
    clientOpId: parsed.data.clientOpId,
    at: parsed.data.at ? new Date(parsed.data.at) : undefined,
    now: new Date(),
  });
  revalidatePath("/w");
  return toActionResult(result);
}

/** Demo only: the token currently shown on the worker's site kiosk, so one phone can demo the flow. */
export async function demoSiteTokenAction(): Promise<string | null> {
  const session = await requireRole("worker");
  if (!isDemoMode() || !session.siteId) return null;
  const site = await getRepos().sites.getById(session.siteId);
  return site ? signQRToken(site.id, new Date(), qrSecretFor(site)) : null;
}

/** Kiosk: a fresh token for one of the admin's own sites. */
export async function kioskTokenAction(siteId: string): Promise<string | null> {
  const session = await requireRole("admin");
  const parsed = z.string().max(100).safeParse(siteId);
  if (!parsed.success) return null;
  const site = await getRepos().sites.getById(parsed.data);
  if (!site || site.orgId !== session.orgId) return null;
  return signQRToken(site.id, new Date(), qrSecretFor(site));
}
