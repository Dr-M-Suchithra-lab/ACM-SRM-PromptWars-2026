"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Live hh:mm:ss since check-in. Decorative: callers give screen readers a static summary. */
export function ShiftTimer({ since }: { since: string }) {
  const start = new Date(since).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const frame = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(id);
    };
  }, []);

  // Before hydration render a stable placeholder so server and client markup match.
  const seconds = now === null ? 0 : Math.max(0, Math.floor((now - start) / 1000));
  const text =
    now === null
      ? "--:--:--"
      : `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return (
    <span aria-hidden="true" className="figure tabular-nums">
      {text}
    </span>
  );
}
