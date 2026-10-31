/**
 * Whole-number ticks from 0 up to a "nice" top (1, 2 or 5 × 10ⁿ steps) that covers `max`.
 * Charts count people and hours, so a step is never below 1.
 */
export function axisTicks(max: number, count = 4): number[] {
  const raw = Math.max(max, 1) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(
    1,
    [1, 2, 5, 10].map((n) => n * magnitude).find((s) => s >= raw)!,
  );
  const top = Math.ceil(max / step) * step || step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}
