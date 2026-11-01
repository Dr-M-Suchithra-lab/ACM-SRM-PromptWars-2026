import { test, expect } from "@playwright/test";
test("confirmed schedule adjustment persists and is recorded in ProofLoop", async ({
  request,
}) => {
  const auth = await request.post("/api/demo-session", {
    data: { role: "admin", sector: "healthcare" },
  });
  expect(auth.ok()).toBeTruthy();
  const headers = {
    Authorization: `Bearer ${(await auth.json()).access_token}`,
  };
  const before = await (
    await request.get("/api/workspace", { headers })
  ).json();
  const shift = before.shifts.find(
    (s: { id: string }) => s.id === "30000000-0000-4000-8000-000000000005",
  );
  expect(shift).toBeTruthy();
  const original = {
    id: shift.id,
    organization_id: shift.organization_id,
    worker_id: shift.worker_id,
    starts_at: shift.starts_at,
    ends_at: shift.ends_at,
    break_minutes: shift.break_minutes,
    location: shift.location,
  };
  const adjusted = {
    ...original,
    starts_at: "2026-10-27T18:00:00+05:30",
    ends_at: "2026-10-28T02:30:00+05:30",
  };
  try {
    expect(
      (await request.post("/api/shifts", { headers, data: adjusted })).ok(),
    ).toBeTruthy();
    const after = await (
      await request.get("/api/workspace", { headers })
    ).json();
    expect(
      Date.parse(
        after.shifts.find((s: { id: string }) => s.id === shift.id).starts_at,
      ),
    ).toBe(Date.parse(adjusted.starts_at));
    expect(
      after.risks.some(
        (r: { shiftId: string; type: string }) =>
          r.shiftId === shift.id && r.type === "short_rest",
      ),
    ).toBe(false);
    expect(
      after.dispute_events.some(
        (e: {
          shift_id: string;
          event_type: string;
          details: { starts_at: string };
        }) =>
          e.shift_id === shift.id &&
          e.event_type === "schedule_saved" &&
          Date.parse(e.details.starts_at) === Date.parse(adjusted.starts_at),
      ),
    ).toBe(true);
  } finally {
    expect(
      (await request.post("/api/shifts", { headers, data: original })).ok(),
    ).toBeTruthy();
  }
});
