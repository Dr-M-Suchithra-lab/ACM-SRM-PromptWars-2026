import { describe, expect, it, vi } from "vitest";
import { CASHFREE_PG_SANDBOX_URL, createCashfreeCheckout, vendorIdFor } from "@/server/payouts/cashfree";
import type { CheckoutRequest } from "@/server/payouts/provider";

const NOW = new Date("2026-10-31T10:00:00Z");
const request: CheckoutRequest = {
  batchId: "fs202610_abc123abc123",
  amount: 90_750 + 18_400_00,
  purpose: "FairShift wages 2026-10 (2 workers)",
  returnUrl: "https://fairshift.test/api/checkout/return?batch=fs202610_abc123abc123",
  payer: { id: "admin1", name: "Priya Menon" },
  splits: [
    {
      workerId: "w1001",
      holder: "Ramesh Kumar",
      account: "026291800001191",
      ifsc: "YESB0000262",
      amount: 90_750,
    },
    { workerId: "w2001", holder: "सुनीता देवी", account: "00011020001772", ifsc: "HDFC0000001", amount: 18_400_00 },
  ],
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const linkUrl = "https://payments-test.cashfree.com/links/o1tf1nvcvjhg";

const ramesh = vendorIdFor(request.splits[0]);
const sunita = vendorIdFor(request.splits[1]);

function checkout(fetchImpl: typeof fetch) {
  return createCashfreeCheckout({ appId: "APP_ID", secretKey: "SECRET", fetchImpl, now: () => NOW });
}

const body = (call: Parameters<typeof fetch>) => JSON.parse(String(call[1]?.body));

describe("Cashfree checkout (sandbox)", () => {
  it("registers missing workers as vendors, then opens one payment link split between them", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(200, { vendor_id: ramesh })) // Ramesh already a vendor
      .mockResolvedValueOnce(json(400, { code: "api_request_failed", message: "vendor does not exist" })) // Sunita is not
      .mockResolvedValueOnce(json(200, { vendor_id: sunita, status: "IN_BENE_CREATION" }))
      .mockResolvedValueOnce(json(200, { link_url: linkUrl, link_status: "ACTIVE" }));
    expect(await checkout(fetchImpl).create(request)).toEqual({ url: linkUrl });

    const calls = fetchImpl.mock.calls;
    expect(calls.map(([url, init]) => `${init?.method} ${url}`)).toEqual([
      `GET ${CASHFREE_PG_SANDBOX_URL}/easy-split/vendors/${ramesh}`,
      `GET ${CASHFREE_PG_SANDBOX_URL}/easy-split/vendors/${sunita}`,
      `POST ${CASHFREE_PG_SANDBOX_URL}/easy-split/vendors`,
      `POST ${CASHFREE_PG_SANDBOX_URL}/links`,
    ]);
    const headers = calls[3][1]?.headers as Record<string, string>;
    expect(headers).toMatchObject({
      "x-api-version": "2026-01-01",
      "x-client-id": "APP_ID",
      "x-client-secret": "SECRET",
      "x-idempotency-key": request.batchId,
    });

    expect(body(calls[2])).toMatchObject({
      vendor_id: sunita,
      status: "ACTIVE",
      // Cashfree vendor names allow Latin letters only, so a name in Devanagari falls back to the worker.
      name: "Worker w2001",
      bank: { account_number: "00011020001772", ifsc: "HDFC0000001" },
    });
    expect(body(calls[3])).toEqual({
      link_id: request.batchId,
      link_amount: 18_400 + 907.5,
      link_currency: "INR",
      link_purpose: request.purpose,
      link_partial_payments: false,
      link_expiry_time: "2026-11-01T10:00:00.000Z",
      customer_details: { customer_phone: "9999999999", customer_name: "Priya Menon" },
      link_meta: { return_url: request.returnUrl },
      link_notify: { send_sms: false, send_email: false },
      order_splits: [
        { vendor_id: ramesh, amount: 907.5 },
        { vendor_id: sunita, amount: 18_400 },
      ],
    });
  });

  it("explains why a checkout could not be opened", async () => {
    const refused = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json(200, {}))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(400, { message: "easy split is not enabled for this merchant" }));
    await expect(checkout(refused).create(request)).rejects.toThrow("easy split is not enabled");

    const otherBadRequest = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(400, { message: "x-api-version is invalid" }));
    await expect(checkout(otherBadRequest).create(request)).rejects.toThrow("x-api-version is invalid");

    const vendorDown = vi.fn<typeof fetch>().mockResolvedValue(new Response("no", { status: 503 }));
    await expect(checkout(vendorDown).create(request)).rejects.toThrow("HTTP 503");

    const vendorRefused = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(404, {}))
      .mockResolvedValueOnce(json(422, { message: "kyc_details.pan_missing" }));
    await expect(checkout(vendorRefused).create(request)).rejects.toThrow("pan_missing");

    const noUrl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, { link_status: "ACTIVE" }));
    await expect(checkout(noUrl).create(request)).rejects.toThrow("did not return a payment link");
  });

  it("reads whether the link was paid", async () => {
    const answer = (status: string) => vi.fn<typeof fetch>().mockResolvedValue(json(200, { link_status: status }));
    expect(await checkout(answer("PAID")).status(request.batchId)).toBe("paid");
    expect(await checkout(answer("ACTIVE")).status(request.batchId)).toBe("pending");
    expect(await checkout(answer("EXPIRED")).status(request.batchId)).toBe("failed");
    const paid = answer("PAID");
    await checkout(paid).status(request.batchId);
    expect(paid.mock.calls[0][0]).toBe(`${CASHFREE_PG_SANDBOX_URL}/links/${request.batchId}`);

    await expect(checkout(vi.fn<typeof fetch>().mockResolvedValue(json(500, {}))).status("x")).rejects.toThrow("500");
    await expect(checkout(vi.fn<typeof fetch>().mockResolvedValue(json(200, { nope: 1 }))).status("x")).rejects.toThrow(
      "unexpected response",
    );
  });

  it("cancels a link", async () => {
    const ok = vi.fn<typeof fetch>().mockResolvedValue(json(200, { link_status: "CANCELLED" }));
    await checkout(ok).cancel(request.batchId);
    expect(ok.mock.calls[0][0]).toBe(`${CASHFREE_PG_SANDBOX_URL}/links/${request.batchId}/cancel`);
    expect(ok.mock.calls[0][1]?.method).toBe("POST");
    await expect(
      checkout(vi.fn<typeof fetch>().mockResolvedValue(json(400, { message: "link already paid" }))).cancel("x"),
    ).rejects.toThrow("already paid");
  });

  it("builds vendor ids Cashfree accepts, one per worker and bank account", () => {
    expect(ramesh).toMatch(/^fairshift_w1001_[a-f0-9]{12}$/);
    expect(vendorIdFor({ workerId: "w-10.01", account: "1", ifsc: "X" })).toMatch(/^fairshift_w1001_[a-f0-9]{12}$/);
    // The same account always maps to the same vendor; a corrected account maps to a new one.
    expect(vendorIdFor({ ...request.splits[0] })).toBe(ramesh);
    expect(vendorIdFor({ ...request.splits[0], account: "388108022658", ifsc: "ICIC0000009" })).not.toBe(ramesh);
  });

  it("pays a corrected bank account, never the one registered before", async () => {
    const corrected = { ...request.splits[0], account: "388108022658", ifsc: "ICIC0000009" };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(400, { message: "vendor does not exist" }))
      .mockResolvedValueOnce(json(200, { status: "IN_BANK_VALIDATION" }))
      .mockResolvedValueOnce(json(200, { link_url: linkUrl, link_status: "ACTIVE" }));
    await checkout(fetchImpl).create({ ...request, amount: corrected.amount, splits: [corrected] });
    const [, created, link] = fetchImpl.mock.calls;
    expect(body(created)).toMatchObject({
      vendor_id: vendorIdFor(corrected),
      bank: { account_number: "388108022658", ifsc: "ICIC0000009" },
    });
    expect(body(link).order_splits).toEqual([{ vendor_id: vendorIdFor(corrected), amount: 907.5 }]);
    expect(vendorIdFor(corrected)).not.toBe(ramesh);
  });

  it("only ever sends the employer to a Cashfree page over HTTPS", async () => {
    for (const url of [
      "https://evil.example/pay",
      "http://payments-test.cashfree.com/x",
      "javascript:alert(1)",
      "nope",
    ]) {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(200, {}))
        .mockResolvedValueOnce(json(200, {}))
        .mockResolvedValueOnce(json(200, { link_url: url, link_status: "ACTIVE" }));
      await expect(checkout(fetchImpl).create(request)).rejects.toThrow("did not return a payment link");
    }
  });
});

describe("getting a bank account ready before the first checkout", () => {
  it("registers a new account with Cashfree as soon as it is saved, and leaves a known one alone", async () => {
    const account = { workerId: "w1017", holder: "Valli Ammal", account: "1233943142", ifsc: "ICIC0000009" };
    const vendor = vendorIdFor(account);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(400, { message: "vendor does not exist" }))
      .mockResolvedValueOnce(json(200, { vendor_id: vendor, status: "IN_BANK_VALIDATION" }))
      .mockResolvedValueOnce(json(200, { vendor_id: vendor, status: "ACTIVE" }));
    const provider = checkout(fetchImpl);
    await provider.prepare!(account);
    expect(body(fetchImpl.mock.calls[1])).toMatchObject({
      vendor_id: vendor,
      name: "Valli Ammal",
      bank: { account_number: "1233943142", ifsc: "ICIC0000009" },
    });
    await provider.prepare!(account);
    expect(fetchImpl.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "POST", "GET"]);
  });
});
