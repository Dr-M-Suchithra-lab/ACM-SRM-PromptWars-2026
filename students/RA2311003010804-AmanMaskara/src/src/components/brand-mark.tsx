import { cn } from "@/lib/utils";

/*
 * FairShift logo: a teal badge holding a clock face whose two hands form a check mark —
 * "every hour, fairly counted" — pivoting on a marigold dot. Drawn on a 24-unit grid with
 * 2-unit strokes so it stays legible at 16 px (favicon). scripts/gen-icons.mjs renders the
 * same geometry to PNG.
 */
export const LOGO = {
  badgeRadius: 6,
  face: { cx: 12, cy: 12.4, r: 7.4 },
  pivot: { x: 11, y: 14.6 },
  shortHand: { x: 7.6, y: 11.2 },
  longHand: { x: 16.8, y: 8 },
  dotRadius: 1.7,
} as const;

interface LogoMarkProps {
  className?: string;
  /** Single-colour outline version (currentColor), for print and monochrome contexts */
  mono?: boolean;
  /** Clock hands sweep into the check mark (landing page only) */
  animated?: boolean;
}

export function LogoMark({ className = "size-8", mono = false, animated = false }: LogoMarkProps) {
  const { face, pivot, shortHand, longHand, dotRadius, badgeRadius } = LOGO;
  const stroke = mono ? "currentColor" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn(className, animated && "logo-animated")}>
      {!mono && <rect width="24" height="24" rx={badgeRadius} fill="var(--primary)" />}
      <circle
        cx={face.cx}
        cy={face.cy}
        r={face.r}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        opacity={mono ? 1 : 0.55}
      />
      <g fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round">
        <path className="logo-hand logo-hand-short" d={`M${pivot.x} ${pivot.y} L${shortHand.x} ${shortHand.y}`} />
        <path className="logo-hand logo-hand-long" d={`M${pivot.x} ${pivot.y} L${longHand.x} ${longHand.y}`} />
      </g>
      <circle cx={pivot.x} cy={pivot.y} r={dotRadius} fill={mono ? "currentColor" : "var(--accent)"} />
    </svg>
  );
}

/**
 * "Fair" in Bricolage ExtraBold + "Shift" in Medium. The dot of the i is a marigold circle that
 * echoes the logo's pivot (a dotless ı with the dot drawn in CSS).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "wordmark font-display inline-flex items-baseline leading-none tracking-[-0.035em] text-ink",
        className,
      )}
    >
      <span className="font-extrabold">
        Fa<span className="wordmark-i">ı</span>r
      </span>
      <span className="font-medium">Shift</span>
    </span>
  );
}

/** Logo + wordmark, read as one name by screen readers. */
export function BrandMark({ className = "text-xl", animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} role="img" aria-label="FairShift">
      <LogoMark className="size-[1.35em] shrink-0" animated={animated} />
      <Wordmark />
    </span>
  );
}
