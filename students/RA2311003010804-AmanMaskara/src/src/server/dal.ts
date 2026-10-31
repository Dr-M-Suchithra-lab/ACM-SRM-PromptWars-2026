import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export { getSession };

export const HOME_FOR_ROLE: Record<SessionPayload["role"], string> = {
  worker: "/w",
  admin: "/a",
};

/**
 * Real authorization check for every page, Server Action and Route Handler.
 * proxy.ts only does an optimistic cookie-presence redirect.
 * - no/invalid session → /login
 * - wrong role → that user's own home (a worker can never render admin pages)
 */
export async function requireRole(role: SessionPayload["role"]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== role) redirect(HOME_FOR_ROLE[session.role]);
  return session;
}
