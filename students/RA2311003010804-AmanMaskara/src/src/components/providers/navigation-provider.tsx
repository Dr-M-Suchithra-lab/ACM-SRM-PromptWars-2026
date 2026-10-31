"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { backTarget, navDirection, recordVisit } from "@/core/nav-stack";

const STORAGE_KEY = "fs-nav-stack";

interface Navigation {
  /** Go to the last page opened in the app, or the logical parent when the page was opened directly. */
  goBack: () => void;
}

const NavigationContext = createContext<Navigation>({ goBack: () => {} });

export const useNavigation = () => useContext(NavigationContext);

function readStack(): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    // Private mode or storage blocked: Back falls back to the logical parent.
  }
}

/** Tells the page-transition CSS which way to slide (html[data-nav-dir]). */
function setDirection(from: string, to: string): void {
  document.documentElement.dataset.navDir = navDirection(from, to);
}

/**
 * Tracks real page navigations (pathnames only — tabs and steps use replace or local state)
 * so the in-app Back button and the browser Back button always agree.
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = useRef(pathname);

  useEffect(() => {
    current.current = pathname;
    writeStack(recordVisit(readStack(), pathname));
  }, [pathname]);

  useEffect(() => {
    // Link clicks: decide the slide direction before Next starts the transition.
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const href = anchor?.getAttribute("href");
      if (href?.startsWith("/")) setDirection(current.current, new URL(href, location.origin).pathname);
    }
    // Browser Back/Forward: assume back unless the target is deeper (the common case).
    function onPopState() {
      setDirection(current.current, location.pathname);
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const goBack = useCallback(() => {
    const target = backTarget(readStack(), current.current);
    if (!target) return;
    document.documentElement.dataset.navDir = "back";
    // History: real browser back, so both Back buttons walk the same path.
    if (target.kind === "history") router.back();
    else router.replace(target.path);
  }, [router]);

  return <NavigationContext value={{ goBack }}>{children}</NavigationContext>;
}
