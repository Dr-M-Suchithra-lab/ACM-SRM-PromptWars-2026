import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { mapLinkStatus, paiseToRupees } from "@/core/payouts";
import type { CheckoutProvider, CheckoutRequest, CheckoutSplit } from "./provider";

/**
 * Cashfree Payment Gateway, sandbox only: one payment link for the total, with Easy Split
 * sending each worker's share to their bank account. Going live needs the employer's KYC and a
 * KYC'd vendor per worker, and is a deliberate change of this URL, not a setting.
 */
export const CASHFREE_PG_SANDBOX_URL = "https://sandbox.cashfree.com/pg";
const API_VERSION = "2026-01-01";
const TIMEOUT_MS = 10_000;
/** How long the employer has to pay before the link expires. */
const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * Sandbox stand-ins for details FairShift does not collect: Cashfree requires a payer phone,
 * and a vendor email, phone and PAN. Real values are needed before going live.
 */
const SANDBOX_PHONE = "9999999999";
const SANDBOX_PAN = "ABCPV1234D";
/** One of Cashfree's accepted business types (it rejects anything else). */
const SANDBOX_BUSINESS_TYPE = "Miscellaneous";

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

/** Only ever send the browser to Cashfree's own pages, over HTTPS. */
const isCashfreePage = (url: string) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (hostname === "cashfree.com" || hostname.endsWith(".cashfree.com"));
  } catch {
    return false;
  }
};

const Link = z.object({ link_url: z.string().optional(), link_status: z.string() });

/**
 * A vendor is one worker's bank account in Cashfree. The id includes a fingerprint of the account
 * and IFSC, so when an employer corrects a worker's bank details the next checkout registers the
 * new account instead of paying the old one.
 */
export const vendorIdFor = (split: Pick<CheckoutSplit, "workerId" | "account" | "ifsc">) =>
  `fairshift_${split.workerId.replace(/[^A-Za-z0-9_]/g, "")}_${createHash("sha256")
    .update(`${split.account}:${split.ifsc}`)
    .digest("hex")
    .slice(0, 12)}`;

/** Cashfree vendor names allow letters, spaces and . / - & only. */
const vendorName = (split: CheckoutSplit) =>
  split.holder.replace(/[^A-Za-z .\/&-]/g, "").trim() || `Worker ${split.workerId.replace(/[^A-Za-z0-9]/g, "")}`;

async function failure(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return new Error((body.message ?? `HTTP ${response.status}`).slice(0, 120));
}

/** The sandbox answers a missing vendor with 400 "vendor does not exist" (sometimes 404). */
async function vendorMissing(response: Response): Promise<boolean> {
  if (response.status === 404) return true;
  if (response.status !== 400) return false;
  const body = (await response
    .clone()
    .json()
    .catch(() => ({}))) as { message?: string };
  return /does not exist|not found/i.test(body.message ?? "");
}

export function createCashfreeCheckout(config: CashfreeConfig): CheckoutProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());

  function call(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}) {
    return fetchImpl(`${CASHFREE_PG_SANDBOX_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "content-type": "application/json",
        "x-api-version": API_VERSION,
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
        ...(init.idempotencyKey ? { "x-idempotency-key": init.idempotencyKey } : {}),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  }

  /** Each worker must exist as an Easy Split vendor with their bank account before a split can name them. */
  async function ensureVendor(split: CheckoutSplit): Promise<void> {
    const vendorId = vendorIdFor(split);
    const existing = await call(`/easy-split/vendors/${vendorId}`);
    if (existing.ok) return;
    if (!(await vendorMissing(existing))) throw await failure(existing);
    const created = await call("/easy-split/vendors", {
      method: "POST",
      idempotencyKey: `vendor_${vendorId}`,
      body: {
        vendor_id: vendorId,
        status: "ACTIVE",
        name: vendorName(split),
        email: `${vendorId}@example.com`,
        phone: SANDBOX_PHONE,
        verify_account: false,
        dashboard_access: false,
        schedule_option: 1,
        bank: { account_number: split.account, account_holder: vendorName(split), ifsc: split.ifsc },
        kyc_details: { account_type: "INDIVIDUAL", business_type: SANDBOX_BUSINESS_TYPE, pan: SANDBOX_PAN },
      },
    });
    if (!created.ok) throw await failure(created);
  }

  return {
    name: "cashfree",

    async create(request: CheckoutRequest) {
      for (const split of request.splits) await ensureVendor(split);
      const response = await call("/links", {
        method: "POST",
        idempotencyKey: request.batchId,
        body: {
          link_id: request.batchId,
          link_amount: paiseToRupees(request.amount),
          link_currency: "INR",
          link_purpose: request.purpose.slice(0, 500),
          link_partial_payments: false,
          link_expiry_time: new Date(now().getTime() + LINK_LIFETIME_MS).toISOString(),
          customer_details: { customer_phone: SANDBOX_PHONE, customer_name: request.payer.name.slice(0, 100) },
          link_meta: { return_url: request.returnUrl },
          link_notify: { send_sms: false, send_email: false },
          order_splits: request.splits.map((s) => ({
            vendor_id: vendorIdFor(s),
            amount: paiseToRupees(s.amount),
          })),
        },
      });
      if (!response.ok) throw await failure(response);
      const link = Link.safeParse(await response.json());
      if (!link.success || !link.data.link_url || !isCashfreePage(link.data.link_url)) {
        throw new Error("Cashfree did not return a payment link");
      }
      return { url: link.data.link_url };
    },

    async status(batchId: string) {
      const response = await call(`/links/${encodeURIComponent(batchId)}`);
      if (!response.ok) throw await failure(response);
      const link = Link.safeParse(await response.json());
      if (!link.success) throw new Error("Cashfree link status: unexpected response");
      return mapLinkStatus(link.data.link_status);
    },

    async cancel(batchId: string) {
      const response = await call(`/links/${encodeURIComponent(batchId)}/cancel`, { method: "POST" });
      if (!response.ok) throw await failure(response);
    },
  };
}
