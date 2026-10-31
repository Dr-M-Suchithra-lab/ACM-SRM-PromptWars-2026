import { useState } from "react";
import { Button } from "./ui/button";
import type { Workspace } from "../types";

export function ShiftCalendar({
  workspace,
  onSelect,
}: {
  workspace: Workspace;
  onSelect: (date: string) => void;
}) {
  const zone = workspace.pay_policies[0].timezone;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, setMonth] = useState(() => date.format(new Date()).slice(0, 7));
  const [year, index] = month.split("-").map(Number),
    first = new Date(Date.UTC(year, index - 1, 1)),
    days = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);
  const change = (delta: number) =>
    setMonth(
      new Date(Date.UTC(year, index - 1 + delta, 1)).toISOString().slice(0, 7),
    );
  return (
    <section className="card shift-calendar" aria-label="Shift calendar">
      <div className="section-head">
        <div>
          <h2>Shift calendar</h2>
          <p aria-live="polite">
            {label} · {zone}
          </p>
        </div>
        <div className="button-row">
          <Button
            variant="outline"
            aria-label="Previous month"
            onClick={() => change(-1)}
          >
            ←
          </Button>
          <Button
            variant="outline"
            aria-label="Next month"
            onClick={() => change(1)}
          >
            →
          </Button>
        </div>
      </div>
      <div className="calendar-week" aria-hidden="true">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-days">
        {Array.from({ length: first.getUTCDay() }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = month + "-" + String(i + 1).padStart(2, "0"),
            count = workspace.shifts.filter(
              (s) => date.format(new Date(s.starts_at)) === day,
            ).length;
          return (
            <button
              key={day}
              type="button"
              className={count ? "has-shifts" : ""}
              aria-label={`${day}, ${count} shifts`}
              onClick={() => onSelect(day)}
            >
              <strong>{i + 1}</strong>
              <small>{count ? `${count} shifts` : "—"}</small>
            </button>
          );
        })}
      </div>
      <small>
        Select a day to filter the schedule below. Cancelled shifts remain in
        the audit history.
      </small>
    </section>
  );
}
