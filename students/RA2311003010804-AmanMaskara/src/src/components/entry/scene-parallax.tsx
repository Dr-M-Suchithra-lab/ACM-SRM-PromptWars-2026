"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MAX_SHIFT_PX = 14;

/**
 * Moves the scene's depth layers a little with the pointer (desktop only). Writes two CSS
 * variables once per animation frame; the layers translate by them × their depth.
 * Off for touch screens and prefers-reduced-motion.
 */
export function SceneParallax({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * -2 * MAX_SHIFT_PX;
        const y = (event.clientY / window.innerHeight - 0.5) * -MAX_SHIFT_PX;
        root.current?.style.setProperty("--px", x.toFixed(1));
        root.current?.style.setProperty("--py", y.toFixed(1));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={root} className="h-full w-full">
      {children}
    </div>
  );
}
