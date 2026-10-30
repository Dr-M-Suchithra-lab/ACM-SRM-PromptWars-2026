import { afterEach, describe, expect, it, vi } from "vitest";
import { requestApi } from "../src/lib/api";

afterEach(() => vi.unstubAllGlobals());

describe("browser API transport", () => {
  it("keeps an HTTP status when a serverless proxy returns HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Private upstream diagnostic</html>", {
            status: 502,
          }),
        ),
    );
    await expect(requestApi("/workspace")).rejects.toMatchObject({
      status: 502,
      message: "Unable to complete the request",
    });
  });
  it("retains authentication status for session recovery", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Session expired" }, { status: 401 }),
        ),
    );
    await expect(requestApi("/workspace")).rejects.toMatchObject({
      status: 401,
      message: "Session expired",
    });
  });
  it("preserves authenticated GET semantics without a body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ userId: "worker" }));
    vi.stubGlobal("fetch", fetch);
    expect(
      await requestApi<{ userId: string }>("/workspace", undefined, "token"),
    ).toEqual({ userId: "worker" });
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/workspace", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  it("preserves anonymous POST bodies without adding identity", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ reference: "reference" }));
    vi.stubGlobal("fetch", fetch);
    await requestApi("/safety", { description: "Concern" });
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Concern" }),
    });
  });

  it("keeps the server's validated error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Session expired" }, { status: 401 }),
        ),
    );
    await expect(requestApi("/workspace")).rejects.toThrow("Session expired");
  });

  it.each([null, [], { error: null }, { error: {} }, { error: "" }])(
    "uses the stable fallback for an unexpected error payload: %j",
    async (body) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(Response.json(body, { status: 503 })),
      );
      await expect(requestApi("/workspace")).rejects.toThrow(
        "Unable to complete the request",
      );
    },
  );

  it("propagates network failures to the caller's error handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network unavailable")),
    );
    await expect(requestApi("/workspace")).rejects.toThrow(
      "Network unavailable",
    );
  });
});
