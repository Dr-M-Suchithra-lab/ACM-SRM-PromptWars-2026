"use client";

import { useEffect, useRef, useState } from "react";
import { formatRupees } from "@/lib/format";

const DURATION_MS = 900;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A rupee amount that counts up to its value on load, and from the old value to the new one
 * after a change (e.g. checkout). Screen readers get the final amount only; reduced motion
 * shows it at once.
 */
export function CountUp({ paise, className }: { paise: number; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || start === paise) {
      from.current = paise;
      setShown(paise);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / DURATION_MS);
      setShown(Math.round(start + (paise - start) * easeOut(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = paise;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paise]);

  return (
    <span className={className}>
      <span aria-hidden="true">{formatRupees(shown)}</span>
      <span className="sr-only">{formatRupees(paise)}</span>
    </span>
  );
}
