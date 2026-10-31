"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

/**
 * Position of the active-tab pill under a list of nav items. The pill moves with a
 * transform transition (GPU only) instead of jumping between items.
 */
export function useSlidingPill(activeIndex: number): {
  listRef: RefObject<HTMLUListElement | null>;
  pillStyle: CSSProperties;
} {
  const listRef = useRef<HTMLUListElement>(null);
  const [pillStyle, setPillStyle] = useState<CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const list = listRef.current;
    const measure = () => {
      // The pill itself is a decorative (aria-hidden) child of the list: count only real items.
      const items = list ? [...list.children].filter((el) => !el.hasAttribute("aria-hidden")) : [];
      const item = items[activeIndex] as HTMLElement | undefined;
      if (!item) return setPillStyle({ opacity: 0 });
      setPillStyle({
        width: item.offsetWidth,
        height: item.offsetHeight,
        transform: `translate(${item.offsetLeft}px, ${item.offsetTop}px)`,
        opacity: 1,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (list) observer.observe(list);
    return () => observer.disconnect();
  }, [activeIndex]);

  return { listRef, pillStyle };
}

export const PILL_CLASS =
  "pointer-events-none absolute top-0 left-0 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none";
