import { cn } from "@/lib/utils";

/** Placeholder block shown while a page renders on the server. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-2xl bg-surface-2", className)} />;
}

/** Visually hidden live text so screen readers hear that content is loading. */
export function LoadingAnnouncement({ label }: { label: string }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}
