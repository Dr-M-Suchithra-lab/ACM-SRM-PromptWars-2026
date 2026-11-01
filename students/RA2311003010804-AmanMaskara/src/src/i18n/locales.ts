/** App languages. Kept free of server imports so core logic and client components can use it. */
export const locales = ["en", "hi", "ta", "te"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Native name first (what a reader recognises), English second. */
export const LANGUAGE_LABELS: Record<Locale, { native: string; english: string; short: string }> = {
  en: { native: "English", english: "English", short: "EN" },
  hi: { native: "हिन्दी", english: "Hindi", short: "हि" },
  ta: { native: "தமிழ்", english: "Tamil", short: "த" },
  te: { native: "తెలుగు", english: "Telugu", short: "తె" },
};
