/** Intl tag for each app locale (Indian number grouping everywhere). */
export const INTL_LOCALE: Record<string, string> = { en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN" };

/**
 * Format paise as INR with paise, e.g. "₹4,200.50". Indian grouping (lakhs/crores).
 * Digits stay Latin in every language: payslips and bank statements use them too.
 */
export function formatINR(paise: number, locale: string = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/** Whole rupees for headline figures, e.g. "₹11,240" (rounded to the nearest rupee). */
export function formatRupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Math.round(paise / 100),
  );
}

/** Format minutes as "Xh Ym". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Compact age of an open item, e.g. "3d 4h", "5h 20m", "12m". */
export function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/** A day 'YYYY-MM-DD' (or month 'YYYY-MM') as "30 Oct 2026" / "Oct 2026" in the app language. */
export function formatDay(day: string, locale = "en"): string {
  const isMonth = /^\d{4}-\d{2}$/.test(day);
  const date = new Date(`${isMonth ? `${day}-01` : day}T00:00:00Z`);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-IN", {
    ...(isMonth ? {} : { day: "numeric" }),
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** A moment as "30 Oct, 2:15 pm" in IST. */
export function formatWhen(date: Date, locale = "en"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** Month key 'YYYY-MM' as "Oct 2026" in the app language. */
export function formatMonth(month: string, locale = "en"): string {
  return formatDay(month, locale);
}
