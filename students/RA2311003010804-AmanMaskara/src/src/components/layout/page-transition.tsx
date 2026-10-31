import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps one page so route changes play the Mac-style window switch (see `.page` in
 * globals.css). Used from template.tsx, which remounts on every navigation, so enter/exit
 * fire on page changes only — never on refreshes or in-page updates.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" update="none" default="none">
      <div className="page-enter">{children}</div>
    </ViewTransition>
  );
}
