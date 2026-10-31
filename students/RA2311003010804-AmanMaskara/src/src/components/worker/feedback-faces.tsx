"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type FaceValue = 1 | 2 | 3;
type Mood = "bad" | "okay" | "good";

const MOOD: Record<FaceValue, Mood> = { 1: "bad", 2: "okay", 3: "good" };
const VALUES: FaceValue[] = [1, 2, 3];
const REACTION_MS = 950;

const FILL: Record<Mood, { face: string; line: string; ring: string }> = {
  bad: { face: "#ffd9d4", line: "#8f2a26", ring: "ring-danger bg-danger-soft" },
  okay: { face: "#f6e7c8", line: "#5c4a2a", ring: "ring-ink-2 bg-surface-2" },
  good: { face: "#ffe2a3", line: "#7a4f00", ring: "ring-primary bg-primary-soft" },
};

/**
 * Hand-drawn SVG face (system emojis look different on every phone and can't animate).
 * Idle: a slow breathe and blink. On tap each face reacts in its own way — see `.face-*`
 * in globals.css. Only transform and opacity animate.
 */
function Face({ mood }: { mood: Mood }) {
  const { face, line } = FILL[mood];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="face-svg size-16 overflow-visible">
      <circle cx="32" cy="33" r="27" fill={face} stroke={line} strokeWidth="2.5" />
      {mood === "bad" && (
        <g className="face-brows" stroke={line} strokeWidth="2.8" strokeLinecap="round">
          <path d="M19 21 L27 24" />
          <path d="M45 21 L37 24" />
        </g>
      )}
      <g className="face-eyes" fill={line}>
        <ellipse cx="24" cy="30" rx="3" ry="3.6" />
        <ellipse cx="40" cy="30" rx="3" ry="3.6" />
      </g>
      {mood === "good" && (
        <g className="face-eyes-happy" fill="none" stroke={line} strokeWidth="2.8" strokeLinecap="round">
          <path d="M20 31 Q24 26 28 31" />
          <path d="M36 31 Q40 26 44 31" />
        </g>
      )}
      <g className="face-mouth" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round">
        {mood === "bad" && <path d="M22 47 Q32 39 42 47" />}
        {mood === "okay" && <path d="M23 44 L41 44" />}
        {mood === "good" && <path d="M21 40 Q32 51 43 40" />}
      </g>
      {mood === "bad" && <path className="face-tear" d="M43 35 q3 5 0 7 q-3 -2 0 -7z" fill="#5b9bd5" />}
      {mood === "good" && (
        <g className="face-sparkles" fill="#f5a524">
          <path d="M7 14 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2z" />
          <path d="M52 8 l1.5 -3.5 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5z" />
          <circle cx="57" cy="24" r="2" />
        </g>
      )}
    </svg>
  );
}

interface FacePickerProps {
  label: string;
  value: FaceValue | undefined;
  onChange: (value: FaceValue) => void;
  faceLabel: (mood: Mood) => string;
}

/** One question as an accessible radiogroup: arrow keys move, roving tabindex, haptic tap. */
export function FacePicker({ label, value, onChange, faceLabel }: FacePickerProps) {
  const [reacting, setReacting] = useState<FaceValue | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pick(next: FaceValue) {
    navigator.vibrate?.(10);
    onChange(next);
    setReacting(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setReacting(null), REACTION_MS);
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + VALUES.length) % VALUES.length;
    buttons.current[next]?.focus();
    pick(VALUES[next]);
  }

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
      {VALUES.map((v, i) => {
        const mood = MOOD[v];
        const selected = value === v;
        return (
          <button
            key={v}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={faceLabel(mood)}
            tabIndex={selected || (value === undefined && i === 0) ? 0 : -1}
            onClick={() => pick(v)}
            onKeyDown={(e) => onKeyDown(e, i)}
            data-react={reacting === v ? mood : undefined}
            style={{ ["--face-delay" as string]: `${i * -1.3}s` }}
            className={cn(
              "face flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-transparent transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
              selected ? cn("scale-105 ring-4", FILL[mood].ring) : "bg-surface-2/60 hover:bg-surface-2",
              value !== undefined && !selected && "opacity-55",
            )}
          >
            <Face mood={mood} />
            <span className="text-sm font-bold">{faceLabel(mood)}</span>
          </button>
        );
      })}
    </div>
  );
}
