import "server-only";
import type { PayoutStatus } from "@/core/payouts";
import { isDemoMode } from "@/server/config";
import { getRepos } from "@/server/repos";
import { createCashfreeCheckout } from "./cashfree";
import { createSimulatedCheckout } from "./simulated";

/** One worker's share of the checkout, settled to their bank account. */
export interface CheckoutSplit {
  workerId: string;
  holder: string;
  account: string;
  ifsc: string;
  /** Paise */
  amount: number;
}

export interface CheckoutRequest {
  batchId: string;
  /** Paise: always the sum of the splits */
  amount: number;
  purpose: string;
  /** Absolute URL the payer comes back to after paying */
  returnUrl: string;
  payer: { id: string; name: string };
  splits: CheckoutSplit[];
}

/**
 * A hosted checkout where the employer pays the total once and it is split to each worker.
 * The browser is only ever sent to `url`; amounts and accounts go server to server.
 */
export interface CheckoutProvider {
  readonly name: "cashfree" | "simulated";
  create(request: CheckoutRequest): Promise<{ url: string }>;
  status(batchId: string): Promise<PayoutStatus>;
  cancel(batchId: string): Promise<void>;
}

/**
 * Cashfree's sandbox checkout when its payment gateway test keys are set; otherwise, in demo
 * mode, a stand-in checkout page; otherwise nothing (paying from FairShift is switched off).
 */
export function getCheckoutProvider(): CheckoutProvider | null {
  const { CASHFREE_APP_ID: appId, CASHFREE_SECRET_KEY: secretKey } = process.env;
  if (appId && secretKey) return createCashfreeCheckout({ appId, secretKey });
  return isDemoMode() ? createSimulatedCheckout(getRepos()) : null;
}
