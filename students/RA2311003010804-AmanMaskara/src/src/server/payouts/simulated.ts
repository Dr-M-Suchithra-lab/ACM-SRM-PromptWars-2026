import "server-only";
import type { Repos } from "@/server/repos/types";
import type { CheckoutProvider } from "./provider";

/**
 * A stand-in for Cashfree's hosted checkout when no test keys are set: the "checkout" is a
 * FairShift page where the employer chooses whether the payment succeeds or fails. The outcome
 * is stored on the batch itself, so it survives restarts and works across server instances.
 * No money moves, and the page never asks for bank or card details.
 */
export const simulatedCheckoutPath = (batchId: string) => `/a/payroll/checkout/${batchId}`;

export function createSimulatedCheckout(repos: Repos): CheckoutProvider {
  return {
    name: "simulated",
    async create(request) {
      return { url: simulatedCheckoutPath(request.batchId) };
    },
    async status(batchId) {
      return (await repos.payoutBatches.getById(batchId))?.simulatedStatus ?? "pending";
    },
    async cancel(batchId) {
      await repos.payoutBatches.update(batchId, { simulatedStatus: "failed" });
    },
  };
}
