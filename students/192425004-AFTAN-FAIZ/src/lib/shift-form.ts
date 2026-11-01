import { shiftInput } from "../../shared/engines";
import { zonedDateTimeToIso } from "../../shared/timezone";

export function shiftTimes(
  start: string,
  end: string,
  unpaidBreak: number,
  timezone: string,
) {
  for (const [value, label] of [
    [start, "start"],
    [end, "end"],
  ])
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
      throw new Error(`Please select a complete ${label} date and time.`);
  const starts_at = zonedDateTimeToIso(start, timezone);
  const ends_at = zonedDateTimeToIso(end, timezone);
  if (Date.parse(ends_at) <= Date.parse(starts_at))
    throw new Error(
      "Shift end must be later than shift start. An overnight shift must use the correct end date.",
    );
  const duration = (Date.parse(ends_at) - Date.parse(starts_at)) / 60000;
  if (duration > 1440) throw new Error("A shift cannot exceed 24 hours.");
  if (
    !Number.isInteger(unpaidBreak) ||
    unpaidBreak < 0 ||
    unpaidBreak >= duration
  )
    throw new Error(
      "Break duration must be a whole number of minutes and shorter than the shift.",
    );
  return shiftInput.parse({ starts_at, ends_at, break_minutes: unpaidBreak });
}
