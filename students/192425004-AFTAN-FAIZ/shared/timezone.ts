// Convert wall-clock input in an organization time zone without assuming +05:30.
// Ambiguous and nonexistent DST minutes require an explicit different selection.
export function zonedDateTimeToIso(value: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Choose a whole-minute date and time.");
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const format = (n: number) => formatter.format(new Date(n)).replace(" ", "T");
  const guess = Date.parse(value + ":00Z");
  if (
    !Number.isFinite(guess) ||
    new Date(guess).toISOString().slice(0, 16) !== value
  )
    throw new Error("Invalid calendar date.");
  const offsets = new Set<number>();
  for (let h = -36; h <= 36; h += 6) {
    const n = guess + h * 3600000;
    offsets.add(Date.parse(format(n) + ":00Z") - n);
  }
  const matches = [...offsets]
    .map((offset) => guess - offset)
    .filter((n) => format(n) === value);
  if (matches.length !== 1)
    throw new Error(
      "This local time is ambiguous or unavailable because of a clock change. Choose another minute.",
    );
  return new Date(matches[0]).toISOString();
}
