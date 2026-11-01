import "server-only";

/** Demo mode shows one-tap demo logins. On by default in development, opt-in elsewhere. */
export function isDemoMode(): boolean {
  const flag = process.env.DEMO_MODE;
  if (flag === undefined) return process.env.NODE_ENV !== "production";
  return flag === "true";
}
