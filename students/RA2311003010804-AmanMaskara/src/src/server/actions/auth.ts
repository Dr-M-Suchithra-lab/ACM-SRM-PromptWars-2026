"use server";

import { cookies, headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import { locales } from "@/i18n/locales";
import { getRepos } from "@/server/repos";
import { createSession, deleteSession, type SessionPayload } from "@/server/session";
import { verifySecret } from "@/server/password";
import { loginRateLimiter } from "@/server/rate-limit";
import { isDemoMode } from "@/server/config";
import { HOME_FOR_ROLE } from "@/server/dal";

export type LoginState = { error?: "invalid" | "locked" | "general" };

const ONE_YEAR_S = 60 * 60 * 24 * 365;

/**
 * Change language in place: sets the cookie and returns. The caller refreshes the page, so
 * switching language never adds a browser history entry.
 */
export async function setLocaleAction(locale: unknown): Promise<void> {
  const parsed = z.enum(locales).safeParse(locale);
  if (!parsed.success) return;
  (await cookies()).set("locale", parsed.data, { path: "/", maxAge: ONE_YEAR_S, sameSite: "lax" });
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Both the account key and the IP must have attempts left. */
async function allowAttempt(accountKey: string): Promise<boolean> {
  const ip = await clientIp();
  const byAccount = loginRateLimiter.check(`acct:${accountKey}`);
  const byIp = loginRateLimiter.check(`ip:${ip}`);
  return byAccount && byIp;
}

/**
 * Start the session and go home with `replace`, so Back never returns to the PIN screen.
 * `?welcome=1` plays the one-time welcome moment; the page removes it from the URL.
 */
async function enter(session: Omit<SessionPayload, "exp">): Promise<never> {
  await createSession(session);
  redirect(`${HOME_FOR_ROLE[session.role]}?welcome=1`, RedirectType.replace);
}

const WorkerLogin = z.object({
  code: z.string().regex(/^\d{4,6}$/),
  pin: z.string().regex(/^\d{4}$/),
});

export async function loginWorker(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = WorkerLogin.safeParse({ code: formData.get("code"), pin: formData.get("pin") });
  if (!parsed.success) return { error: "invalid" };
  if (!(await allowAttempt(`worker:${parsed.data.code}`))) return { error: "locked" };

  const worker = await getRepos().workers.getByCode(parsed.data.code);
  const ok = worker ? await verifySecret(parsed.data.pin, worker.pinHash, worker.pinSalt) : false;
  if (!worker || !ok) return { error: "invalid" };
  return enter({ uid: worker.id, role: "worker", orgId: worker.orgId, siteId: worker.siteId });
}

const AdminLogin = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = AdminLogin.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "invalid" };
  const email = parsed.data.email.toLowerCase();
  if (!(await allowAttempt(`admin:${email}`))) return { error: "locked" };

  const admin = await getRepos().admins.getByEmail(email);
  const ok = admin ? await verifySecret(parsed.data.password, admin.passwordHash, admin.passwordSalt) : false;
  if (!admin || !ok) return { error: "invalid" };
  return enter({ uid: admin.id, role: "admin", orgId: admin.orgId });
}

const DEMO_PERSONAS = {
  ramesh: { kind: "worker", code: "1001" },
  sunita: { kind: "worker", code: "2001" },
  priya: { kind: "admin", email: "priya@buildright.demo" },
  arjun: { kind: "admin", email: "arjun@citycare.demo" },
} as const;

/** One-tap demo logins (demo mode only), so judges reach each role instantly. */
export async function demoLogin(formData: FormData): Promise<void> {
  if (!isDemoMode()) redirect("/login", RedirectType.replace);
  const parsed = z.enum(["ramesh", "sunita", "priya", "arjun"]).safeParse(formData.get("persona"));
  if (!parsed.success) redirect("/login", RedirectType.replace);

  const persona = DEMO_PERSONAS[parsed.data];
  const repos = getRepos();
  if (persona.kind === "worker") {
    const worker = await repos.workers.getByCode(persona.code);
    if (!worker) redirect("/login", RedirectType.replace);
    return enter({ uid: worker.id, role: "worker", orgId: worker.orgId, siteId: worker.siteId });
  }
  const admin = await repos.admins.getByEmail(persona.email);
  if (!admin) redirect("/login", RedirectType.replace);
  return enter({ uid: admin.id, role: "admin", orgId: admin.orgId });
}

/** Logs out. A form may send role=admin so "use a different account" lands on the employer tab. */
export async function logout(formData?: FormData): Promise<void> {
  await deleteSession();
  redirect(formData?.get("role") === "admin" ? "/login?role=admin" : "/login", RedirectType.replace);
}
