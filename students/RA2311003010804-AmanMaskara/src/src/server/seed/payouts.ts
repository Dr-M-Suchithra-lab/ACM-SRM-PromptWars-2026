/**
 * Demo bank details where each worker's share of a checkout is settled: Cashfree's published
 * sandbox test accounts. They only work with test keys; no real bank is involved.
 */
import { encryptAccount } from "../bank-crypto";
import type { PayoutAccount, Worker } from "../repos/types";

/** Sandbox test accounts that always succeed. */
const SUCCESS: [account: string, ifsc: string][] = [
  ["026291800001191", "YESB0000262"],
  ["00011020001772", "HDFC0000001"],
  ["1233943142", "ICIC0000009"],
  ["388108022658", "ICIC0000009"],
  ["000890289871772", "SCBL0036078"],
  ["000100289877623", "SBIN0008752"],
];

/** Valli and Ramkali have no bank details yet, so the employer adds them before paying. */
export const WITHOUT_BANK_DETAILS = new Set(["w1017", "w2012"]);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ramesh's employer changed his pay account yesterday; he is asked to confirm it in his app. */
export const RAMESH_NEW_ACCOUNT: [account: string, ifsc: string] = ["00011020001772", "HDFC0000001"];

/**
 * Every demo account was entered by the employer 30 days ago and confirmed by the worker the next
 * day, and is stored encrypted like a real one. Ramesh's was changed yesterday and waits for him.
 */
export function buildPayoutAccounts(workers: Worker[], now: Date): PayoutAccount[] {
  const entered = new Date(now.getTime() - 30 * DAY_MS);
  const confirmed = new Date(entered.getTime() + DAY_MS);
  const yesterday = new Date(now.getTime() - DAY_MS);
  return workers.flatMap((worker, index): PayoutAccount[] => {
    if (WITHOUT_BANK_DETAILS.has(worker.id)) return [];
    const [first, ifscFirst] = SUCCESS[index % SUCCESS.length];
    const firstLast4 = first.slice(-4);
    const base = {
      id: worker.id,
      orgId: worker.orgId,
      holder: worker.name,
      updatedBy: worker.orgId === "org1" ? "admin1" : "admin2",
    };
    const settled = [
      { at: confirmed, by: "worker" as const, action: "confirmed" as const, last4: firstLast4 },
      { at: entered, by: "employer" as const, action: "changed" as const, last4: firstLast4 },
    ];
    if (worker.id === "w1001") {
      const [account, ifsc] = RAMESH_NEW_ACCOUNT;
      const last4 = account.slice(-4);
      return [
        {
          ...base,
          accountEncrypted: encryptAccount(account, worker.id),
          last4,
          ifsc,
          status: "pending_worker",
          changedAt: yesterday,
          updatedAt: yesterday,
          history: [{ at: yesterday, by: "employer", action: "changed", last4 }, ...settled],
        },
      ];
    }
    return [
      {
        ...base,
        accountEncrypted: encryptAccount(first, worker.id),
        last4: firstLast4,
        ifsc: ifscFirst,
        status: "confirmed",
        changedAt: entered,
        updatedAt: confirmed,
        history: settled,
      },
    ];
  });
}
