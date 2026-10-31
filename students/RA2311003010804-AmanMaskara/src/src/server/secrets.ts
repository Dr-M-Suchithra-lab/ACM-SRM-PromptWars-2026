import "server-only";
import { getRepos } from "@/server/repos";
import type { Site } from "@/server/repos/types";

function requiredInProduction(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error(`${name} environment variable is required in production`);
  }
  return devFallback;
}

/** Per-site QR signing secret: a global secret mixed with the site id, or the seeded site secret in demo. */
export function qrSecretFor(site: Site): string {
  const global = process.env.QR_SIGNING_SECRET;
  return global ? `${global}:${site.id}` : site.qrSecret;
}

/** Looks up a site's QR secret. Never export this from a "use server" file: it would become a public endpoint. */
export async function secretForSiteId(siteId: string): Promise<string | null> {
  const site = await getRepos().sites.getById(siteId);
  return site ? qrSecretFor(site) : null;
}

export function feedbackHmacSecret(): string {
  return requiredInProduction("FEEDBACK_HMAC_SECRET", "fairshift-dev-feedback-secret");
}
