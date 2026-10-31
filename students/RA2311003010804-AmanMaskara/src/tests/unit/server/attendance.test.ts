import { beforeEach, describe, expect, it } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { checkIn, checkOut } from "@/server/services/attendance";
import { signQRToken } from "@/core/qr-token";

const SECRET = "site-secret";
const secretFor = async () => SECRET;
const NOW = new Date("2026-10-27T08:00:00+05:30");
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function clearOpenShift(workerId: string) {
  for (const s of await getRepos().shifts.getByWorker(workerId)) {
    if (!s.outAt) await getRepos().shifts.update(s.id, { outAt: NOW });
  }
}

describe("attendance service", () => {
  beforeEach(async () => {
    resetMemoryStore();
    await clearOpenShift("w1001");
  });

  const input = (overrides = {}) => ({
    workerId: "w1001",
    orgId: "org1",
    token: signQRToken("site1", NOW, SECRET),
    clientOpId: uuid(1),
    now: NOW,
    secretFor,
    ...overrides,
  });

  it("checks in with a valid site token, then checks out", async () => {
    const result = await checkIn(getRepos(), input());
    expect(result).toMatchObject({ ok: true, status: "checked_in" });
    const out = await checkOut(getRepos(), {
      workerId: "w1001",
      clientOpId: uuid(2),
      now: new Date(NOW.getTime() + 8 * 3_600_000),
    });
    expect(out).toMatchObject({ ok: true, status: "checked_out" });
  });

  it("is idempotent: replaying the same check-in creates one shift", async () => {
    await checkIn(getRepos(), input());
    const replay = await checkIn(getRepos(), input());
    expect(replay).toMatchObject({ ok: true, status: "duplicate" });
    const open = (await getRepos().shifts.getByWorker("w1001")).filter((s) => !s.outAt);
    expect(open).toHaveLength(1);
  });

  it("is idempotent for check-out too", async () => {
    await checkIn(getRepos(), input());
    const op = { workerId: "w1001", clientOpId: uuid(3), now: new Date(NOW.getTime() + 3_600_000) };
    await checkOut(getRepos(), op);
    expect(await checkOut(getRepos(), op)).toMatchObject({ ok: true, status: "duplicate" });
  });

  it("rejects a second check-in while one is open", async () => {
    await checkIn(getRepos(), input());
    expect(await checkIn(getRepos(), input({ clientOpId: uuid(4) }))).toEqual({ ok: false, error: "already_in" });
  });

  it("rejects a site from another organisation", async () => {
    const token = signQRToken("site2", NOW, SECRET); // City Care Hospital
    expect(await checkIn(getRepos(), input({ token }))).toEqual({ ok: false, error: "wrong_site" });
  });

  it("rejects forged, unknown and expired tokens", async () => {
    expect(await checkIn(getRepos(), input({ token: signQRToken("site1", NOW, "wrong") }))).toEqual({
      ok: false,
      error: "invalid_qr",
    });
    expect(await checkIn(getRepos(), input({ token: "garbage-token-value" }))).toEqual({
      ok: false,
      error: "invalid_qr",
    });
    const old = signQRToken("site1", new Date(NOW.getTime() - 10 * 60_000), SECRET);
    expect(await checkIn(getRepos(), input({ token: old }))).toEqual({ ok: false, error: "expired_qr" });
  });

  it("accepts an offline scan synced hours later and keeps the scan time", async () => {
    const scannedAt = new Date(NOW.getTime() - 3 * 3_600_000);
    const token = signQRToken("site1", scannedAt, SECRET);
    const result = await checkIn(getRepos(), input({ token, scannedAt }));
    expect(result.ok && result.shift.inAt).toEqual(scannedAt);
    expect(result.ok && result.shift.syncedFromOffline).toBe(true);
  });

  it("refuses to check out when not checked in, and clamps offline check-out times", async () => {
    expect(await checkOut(getRepos(), { workerId: "w1001", clientOpId: uuid(5), now: NOW })).toEqual({
      ok: false,
      error: "not_in",
    });
    await checkIn(getRepos(), input());
    const out = await checkOut(getRepos(), {
      workerId: "w1001",
      clientOpId: uuid(6),
      now: new Date(NOW.getTime() + 3_600_000),
      at: new Date(NOW.getTime() - 3_600_000),
    });
    expect(out.ok && out.shift.outAt).toEqual(NOW); // never before check-in
  });
});
