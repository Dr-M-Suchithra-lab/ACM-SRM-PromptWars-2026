import { readRecords } from "./records.js";
import type { Request, Response, Router } from "express";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  businessInput,
  employeeInput,
  settingsInput,
  tokenInput,
  id,
} from "../shared/saas.js";

export type Identity = {
  client: SupabaseClient;
  userId: string;
  user: User;
  memberships: {
    organization_id: string;
    role: string;
    display_name: string;
    active?: boolean;
  }[];
};
export const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function applicationOrigin() {
  const value =
    process.env.APP_ORIGIN ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:8080" : "");
  const u = new URL(value);
  if (
    u.origin !== value ||
    (u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname)
      ))
  )
    throw new Error("APP_ORIGIN must be a trusted origin");
  return value;
}
export async function sendInvitation(
  email: string,
  link: string,
  businessName = "your workplace",
) {
  if (!process.env.RESEND_API_KEY || !process.env.INVITATION_FROM_EMAIL)
    return "not_configured";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.INVITATION_FROM_EMAIL,
        to: [email],
        subject: "Your workplace invitation — NYAVERIS AI",
        text: `You have been invited to join ${businessName} on NYAVERIS AI.\n\nThis invitation is intended for ${email}. Create an account or sign in with that email address, verify it if required, and accept your invitation within seven days. Google sign-in is available when configured. The link is single-use; a replacement invitation invalidates the previous link.\n\n${link}\n\nIf you did not expect this invitation, ignore this email.`,
      }),
    });
    return response.ok ? "provider_accepted" : "failed";
  } catch {
    return "failed";
  }
}
export function registerSaas(
  app: Router,
  identity: (req: Request) => Identity,
) {
  async function action(
    req: Request,
    res: Response,
    name: string,
    org: string | null,
    data: unknown,
  ) {
    const i = identity(req);
    if (!i.user.email_confirmed_at) {
      res.status(403).json({ error: "Verify your email before continuing." });
      return null;
    }
    const result = await i.client.rpc("saas_action", {
      p_action: name,
      p_org: org,
      p_data: data,
    });
    if (result.error) {
      const missing = ["PGRST202", "42883"].includes(result.error.code);
      res
        .status(missing ? 503 : result.error.code === "23505" ? 409 : 403)
        .json({
          error: missing
            ? "Business onboarding requires the approved database migration. Existing workspaces remain available."
            : "Action unavailable. Check your permissions, input, and invitation status.",
        });
      return null;
    }
    return result.data as Record<string, unknown>;
  }
  app.get("/api/account", async (req, res) => {
    const i = identity(req);
    let pendingInvitations: unknown[] = [];
    if (process.env.ENABLE_SAAS === "true" && i.user.email_confirmed_at) {
      const pending = await i.client.rpc("saas_action", {
        p_action: "my_invitations",
        p_org: null,
        p_data: {},
      });
      if (pending.error)
        return res.status(503).json({
          error:
            "Invitation discovery requires the approved database migration.",
        });
      pendingInvitations = Array.isArray(pending.data) ? pending.data : [];
    }
    res.json({
      pendingInvitations,
      memberships: i.memberships.filter((m) => m.active !== false),
      verified: !!i.user.email_confirmed_at,
      saasEnabled: process.env.ENABLE_SAAS === "true",
    });
  });
  // Registration and invitation acceptance require identity, but intentionally no prior membership.
  app.use(
    [
      "/api/businesses",
      "/api/employees",
      "/api/invitations",
      "/api/business-settings",
      "/api/administrator-access",
      "/api/shifts/cancel",
    ],
    (_req, res, next) => {
      if (process.env.ENABLE_SAAS !== "true")
        return res.status(503).json({
          error:
            "Business onboarding is awaiting database and email configuration approval.",
        });
      next();
    },
  );
  app.post("/api/businesses", async (req, res) => {
    const b = businessInput.parse(req.body);
    const data = await action(req, res, "create_business", null, {
      ...b,
      owner_name: String(identity(req).user.user_metadata?.full_name ?? "")
        .trim()
        .slice(0, 100),
    });
    if (data) res.status(201).json(data);
  });
  app.post("/api/businesses/review", async (req, res) => {
    const b = z.object({ organization_id: id }).strict().parse(req.body);
    const result = await action(
      req,
      res,
      "review_dashboard",
      b.organization_id,
      {},
    );
    if (result) res.json(result);
  });
  app.get("/api/employees", async (req, res) => {
    const org = id.parse(req.query.org),
      i = identity(req);
    if (
      !i.memberships.some(
        (m) =>
          m.organization_id === org && m.role === "admin" && m.active !== false,
      )
    )
      return res.status(403).json({ error: "Management permission required" });
    const names = [
      "employee_profiles",
      "organization_invitations",
      "business_settings",
      "business_events",
    ] as const;
    const r = await Promise.all(
      names.map((n) =>
        readRecords((offset) =>
          i.client
            .from(n)
            .select("*")
            .eq("organization_id", org)
            .order(n === "business_settings" ? "organization_id" : "id")
            .range(offset, offset + 499),
        ),
      ),
    );
    if (r.some((x) => x.error))
      return res.status(503).json({ error: "Workforce records unavailable" });
    res.json(Object.fromEntries(names.map((n, k) => [n, r[k].data])));
  });
  app.post("/api/employees", async (req, res) => {
    const { organization_id, employee_id, ...b } = employeeInput
      .extend({ organization_id: id, employee_id: id.optional() })
      .strict()
      .parse(req.body);
    const result = await action(req, res, "save_employee", organization_id, {
      ...b,
      id: employee_id ?? null,
    });
    if (result) res.json(result);
  });
  for (const [path, name] of [
    ["/api/invitations", "invite_employee"],
    ["/api/invitations/resend", "rotate_invitation"],
  ] as const) {
    app.post(path, async (req, res) => {
      const b = z
        .object({
          organization_id: id,
          employee_id: id.optional(),
          invitation_id: id.optional(),
        })
        .strict()
        .parse(req.body);
      if (name === "invite_employee" ? !b.employee_id : !b.invitation_id)
        return res
          .status(400)
          .json({ error: "Select the employee or invitation" });
      // Validate trusted origin before committing anything. Never use the request Host header.
      const origin = applicationOrigin(),
        token = randomBytes(32).toString("hex");
      // Resolve the business through the caller's RLS-protected client. Never
      // accept employer identity from a frontend field or incoming Host header.
      const business = await identity(req)
        .client.from("organizations")
        .select("name")
        .eq("id", b.organization_id)
        .maybeSingle();
      if (business.error || !business.data?.name)
        return res.status(business.error ? 503 : 403).json({
          error: "Invitation business is unavailable for this account.",
        });
      const result = await action(req, res, name, b.organization_id, {
        ...b,
        token_hash: digest(token),
      });
      if (!result) return;
      const link = origin + "/invite#token=" + token;
      const delivery = await sendInvitation(
        String(result.email),
        link,
        String(business.data.name),
      );
      res.status(201).json({
        invitation_id: result.invitation_id,
        link,
        delivery,
        message:
          delivery === "provider_accepted"
            ? "Email provider accepted the invitation. Delivery is not guaranteed."
            : delivery === "failed"
              ? "Invitation saved, but email sending failed. Share the link securely or retry."
              : "Invitation saved. Email delivery is not configured; share the link securely.",
      });
    });
  }
  app.post("/api/invitations/revoke", async (req, res) => {
    const b = z
      .object({ organization_id: id, invitation_id: id })
      .strict()
      .parse(req.body);
    const result = await action(
      req,
      res,
      "revoke_invitation",
      b.organization_id,
      b,
    );
    if (result) res.json(result);
  });
  for (const [path, name] of [
    ["preview", "preview_invitation"],
    ["accept", "accept_invitation"],
  ] as const)
    app.post("/api/invitations/" + path, async (req, res) => {
      const b = tokenInput.parse(req.body);
      const result = await action(req, res, name, null, {
        token_hash: digest(b.token),
      });
      if (result) res.json(result);
    });
  app.post("/api/business-settings", async (req, res) => {
    const { organization_id, ...b } = settingsInput
      .extend({ organization_id: id })
      .strict()
      .parse(req.body);
    const result = await action(req, res, "save_settings", organization_id, b);
    if (result) res.json(result);
  });
  app.post("/api/administrator-access", async (req, res) => {
    const { organization_id, ...b } = z
      .object({ organization_id: id, user_id: id, admin: z.boolean() })
      .strict()
      .parse(req.body);
    const result = await action(req, res, "set_admin", organization_id, b);
    if (result) res.json(result);
  });
  app.post("/api/shifts/cancel", async (req, res) => {
    const { organization_id, ...b } = z
      .object({
        organization_id: id,
        shift_id: id,
        note: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(req.body);
    const result = await action(req, res, "cancel_shift", organization_id, b);
    if (result) res.json(result);
  });
}
