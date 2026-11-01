import type { ClosedShift } from "@/core/types";

let seq = 0;

/** Build a closed shift from IST wall-clock strings, e.g. ist("2026-10-05", "08:00", "17:00"). */
export function ist(day: string, start: string, end: string, nextDayEnd = false): ClosedShift {
  const inAt = new Date(`${day}T${start}:00+05:30`);
  const endDay = nextDayEnd ? addDays(day, 1) : day;
  const outAt = new Date(`${endDay}T${end}:00+05:30`);
  seq++;
  return { id: `s${seq}`, workerId: "w1", siteId: "site1", inAt, outAt, method: "qr" };
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** `count` consecutive day shifts of `hours` starting at 08:00 IST. */
export function dayShifts(firstDay: string, count: number, hours: number): ClosedShift[] {
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(firstDay, i);
    const inAt = new Date(`${day}T08:00:00+05:30`);
    seq++;
    return {
      id: `s${seq}`,
      workerId: "w1",
      siteId: "site1",
      inAt,
      outAt: new Date(inAt.getTime() + hours * 3_600_000),
      method: "qr" as const,
    };
  });
}
