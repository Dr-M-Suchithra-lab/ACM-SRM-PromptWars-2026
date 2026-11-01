"use client";

import { useEffect } from "react";

/**
 * Pauses every looping CSS animation while the tab is hidden (html[data-hidden]), so
 * background scenes cost no battery when the worker switches apps. Starts the entry scene
 * (html[data-scene-live]) only once the page has loaded and the main thread is idle.
 */
export function MotionPolicy() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (document.hidden) root.dataset.hidden = "";
      else delete root.dataset.hidden;
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const goLive = () => {
      root.dataset.sceneLive = "";
    };
    let cancel = () => {};
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === "function") {
        const id = requestIdleCallback(goLive, { timeout: 2000 });
        cancel = () => cancelIdleCallback(id);
      } else {
        // Safari has no requestIdleCallback; a short timeout after load is close enough there.
        const id = window.setTimeout(goLive, 300);
        cancel = () => window.clearTimeout(id);
      }
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      window.removeEventListener("load", whenIdle);
      cancel();
    };
  }, []);
  return null;
}
