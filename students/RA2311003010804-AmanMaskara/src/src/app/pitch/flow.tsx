import type { ReactNode } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A labelled box in a diagram. `tone` marks the role of the step. */
export function Node({
  children,
  tone = "plain",
  className,
}: {
  children: ReactNode;
  tone?: "plain" | "accent" | "brand" | "ink";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-tile border-2 px-3 py-2 text-center text-sm leading-snug font-semibold md:text-base",
        tone === "plain" && "border-ink bg-surface",
        tone === "accent" && "border-ink bg-accent text-ink",
        tone === "brand" && "border-primary bg-primary text-on-primary",
        tone === "ink" && "border-ink bg-foreground text-background",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Arrow between nodes; vertical on phones, horizontal from md up unless `vertical`. */
export function Arrow({ vertical = false, label }: { vertical?: boolean; label?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center text-ink-2",
        vertical ? "flex-col" : "flex-col md:flex-row",
      )}
    >
      {vertical ? (
        <ArrowDown className="size-5" />
      ) : (
        <>
          <ArrowDown className="size-5 md:hidden" />
          <ArrowRight className="hidden size-5 md:block" />
        </>
      )}
      {label && <span className="text-xs font-semibold">{label}</span>}
    </div>
  );
}

/** A row of steps joined by arrows. */
export function Flow({ steps, className }: { steps: ReactNode[]; className?: string }) {
  return (
    <div className={cn("flex flex-col items-stretch gap-2 md:flex-row md:items-center", className)}>
      {steps.map((step, i) => (
        <div key={i} className="contents">
          {i > 0 && <Arrow />}
          <div className="md:flex-1">{step}</div>
        </div>
      ))}
    </div>
  );
}
