export type DayPart = "morning" | "midday" | "evening";

/** Part of the day for greetings and the welcome gradient: before 11, before 16, then evening. */
export function dayPart(hour: number): DayPart {
  if (hour < 11) return "morning";
  return hour < 16 ? "midday" : "evening";
}

/** The hour (0–23) in India, where FairShift's workplaces are. */
export function istHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(now),
  );
}
