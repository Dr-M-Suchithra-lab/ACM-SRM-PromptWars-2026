import { axisTicks } from "@/lib/axis";
import { Card } from "@/components/ui/card";

interface Point {
  label: string;
  value: number;
}

/** Enough day labels to read the axis without them touching on a phone. */
const MAX_X_LABELS = 7;

const percent = (value: number, top: number) => `${(value / top) * 100}%`;

/**
 * Single-series bar chart, rendered on the server as plain HTML (no chart library, no client JS).
 * No legend (the title names the series), thin bars with 4px rounded data-ends on the
 * baseline, a recessive grid, the value on hover, and a table alternative for screen readers.
 */
export function BarChartCard({
  title,
  unit,
  data,
  tableLabel,
}: {
  title: string;
  unit: string;
  data: Point[];
  tableLabel: string;
}) {
  const ticks = axisTicks(Math.max(0, ...data.map((d) => d.value)));
  const top = ticks[ticks.length - 1];
  const every = Math.ceil(data.length / MAX_X_LABELS);
  const edge = (i: number) => (i < 2 ? "left-0" : i >= data.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2");

  return (
    <Card className="p-4 md:p-5">
      <h2 className="font-display mb-4 text-lg font-extrabold">{title}</h2>
      <div className="grid h-56 grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-x-2" aria-hidden="true">
        <div className="figure relative min-w-5 text-right text-xs text-ink-2">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: percent(tick, top) }}>
              {tick}
            </span>
          ))}
        </div>
        <div className="relative">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-line"
              style={{ bottom: percent(tick, top) }}
            />
          ))}
          <div className="absolute inset-0 flex items-end">
            {data.map((d, i) => (
              <div
                key={i}
                className="group relative flex h-full flex-1 items-end justify-center rounded-t-md hover:bg-surface-2"
              >
                <div
                  className="w-3/5 max-w-[30px] rounded-t-[4px] bg-primary"
                  style={{ height: percent(d.value, top) }}
                />
                <span
                  className={`figure pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-bold whitespace-nowrap text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 ${edge(i)}`}
                  style={{ bottom: `calc(${percent(d.value, top)} + 6px)` }}
                >
                  {d.value} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div />
        <div className="flex pt-1.5 text-xs text-ink-2">
          {data.map((d, i) => (
            <span key={i} className="flex-1 text-center whitespace-nowrap">
              {i % every === 0 ? d.label : ""}
            </span>
          ))}
        </div>
      </div>
      {/* The wrapper is what's visually hidden: a table ignores sr-only's 1px height and would stretch the page. */}
      <div className="sr-only">
        <table>
          <caption>{tableLabel}</caption>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <th scope="row">{d.label}</th>
                <td>
                  {d.value} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
