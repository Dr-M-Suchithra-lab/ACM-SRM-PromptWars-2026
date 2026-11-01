import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our theme colours (globals.css @theme) so `bg-primary` correctly overrides `bg-surface`, etc.
const THEME_COLORS = [
  "paper",
  "surface",
  "surface-2",
  "line",
  "ink",
  "ink-2",
  "primary",
  "primary-strong",
  "primary-soft",
  "on-primary",
  "accent",
  "accent-soft",
  "on-accent",
  "danger",
  "danger-soft",
  "success",
  "success-soft",
  "warning",
  "warning-ink",
  "warning-soft",
  "info",
  "info-soft",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: { color: THEME_COLORS, radius: ["card", "tile"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
