/**
 * Removes details that could identify the person giving anonymous feedback.
 * Deterministic on purpose: anonymity must not depend on an AI call succeeding.
 */
const PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.]+/g, // emails
  /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g, // Indian mobile numbers
  /\b\d{4,}\b/g, // employee codes, PINs, IDs
];

export const REDACTED = "▇▇▇";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** @param names people to hide (e.g. every worker and admin in the org), full names and first names */
export function redactPII(text: string, names: string[] = []): string {
  let out = text;
  for (const pattern of PATTERNS) out = out.replace(pattern, REDACTED);
  const tokens = new Set(names.flatMap((n) => [n, ...n.split(/\s+/)]).filter((n) => n.length >= 3));
  // Longest first so "Ramesh Kumar" is replaced before "Ramesh".
  for (const name of [...tokens].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{M}])${escapeRegExp(name)}(?![\\p{L}\\p{M}])`, "giu"), REDACTED);
  }
  return out;
}
