"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SLIDES } from "./slides";

/** Keyboard/touch slide deck. ← → / Space / Home / End to move; the URL hash keeps the current slide. */
export function Deck() {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const total = SLIDES.length;

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(total - 1, next))), [total]);

  // Open on the slide named in the URL (e.g. /pitch#demo). Deferred a frame so the server render and
  // first client render match.
  const hashRead = useRef(false);
  useEffect(() => {
    const slideFromHash = () => SLIDES.findIndex((s) => `#${s.id}` === window.location.hash);
    const fromHash = slideFromHash();
    const frame = requestAnimationFrame(() => {
      if (fromHash > 0) setIndex(fromHash);
      hashRead.current = true;
    });
    // Links like /pitch#demo opened while the deck is already showing.
    const onHashChange = () => {
      const next = slideFromHash();
      if (next >= 0) setIndex(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  useEffect(() => {
    if (hashRead.current) window.history.replaceState(null, "", `#${SLIDES[index].id}`);
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "IFRAME"].includes(e.target.tagName)) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(index + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total]);

  // Follow the browser's real state, so Esc or F11 also flips the button back.
  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullScreen = () =>
    document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();

  const slide = SLIDES[index];

  return (
    <div
      className="flex min-h-dvh flex-col"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="hazard-tape" aria-hidden="true" />
      <div className="h-1 bg-surface-2" aria-hidden="true">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8 md:px-10 md:py-12">
        <section
          key={slide.id}
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${total}: ${slide.title}`}
          className="rise-in flex flex-1 flex-col gap-6 md:gap-8"
        >
          <header className="flex flex-col gap-2">
            <p className="eyebrow">{slide.eyebrow}</p>
            <h1 className="font-display max-w-5xl text-3xl leading-[1.05] font-extrabold tracking-tight md:text-5xl">
              {slide.title}
            </h1>
          </header>
          <div className="flex-1">{slide.body}</div>
        </section>
      </main>

      <nav aria-label="Slides" className="sticky bottom-0 border-t border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous slide"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Prev
          </Button>
          <p className="figure text-sm" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullScreen}
              aria-label={fullScreen ? "Exit full screen" : "Full screen"}
              title={fullScreen ? "Exit full screen (Esc)" : "Full screen"}
            >
              {fullScreen ? (
                <Minimize2 aria-hidden="true" className="size-4" />
              ) : (
                <Maximize2 aria-hidden="true" className="size-4" />
              )}
            </Button>
            <Button size="sm" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Next slide">
              Next
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
