import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptAccount, encryptAccount } from "@/server/bank-crypto";

afterEach(() => vi.unstubAllEnvs());

describe("bank account encryption", () => {
  it("round-trips, and never stores the number in the clear", () => {
    const sealed = encryptAccount("026291800001191", "w1001");
    expect(sealed).toMatch(/^v1\.[\w-]{8}\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(sealed).not.toContain("026291800001191");
    expect(decryptAccount(sealed, "w1001")).toBe("026291800001191");
  });

  it("uses a fresh nonce every time", () => {
    expect(encryptAccount("026291800001191", "w1001")).not.toBe(encryptAccount("026291800001191", "w1001"));
  });

  it("won't decrypt a value copied onto another worker", () => {
    const sealed = encryptAccount("026291800001191", "w1001");
    expect(() => decryptAccount(sealed, "w1002")).toThrow();
  });

  it("detects tampering", () => {
    const parts = encryptAccount("026291800001191", "w1001").split(".");
    const body = Buffer.from(parts[4], "base64url");
    body[0] ^= 1;
    parts[4] = body.toString("base64url");
    expect(() => decryptAccount(parts.join("."), "w1001")).toThrow();
    expect(() => decryptAccount("garbage", "w1001")).toThrow("unreadable");
  });

  it("needs the right key, and supports rotating it", () => {
    vi.stubEnv("BANK_ENCRYPTION_KEY", "old-key-0123456789abcdef0123456789");
    const sealed = encryptAccount("026291800001191", "w1001");
    vi.stubEnv("BANK_ENCRYPTION_KEY", "new-key-0123456789abcdef0123456789");
    expect(() => decryptAccount(sealed, "w1001")).toThrow("unknown key");
    vi.stubEnv("BANK_ENCRYPTION_KEY_PREVIOUS", "old-key-0123456789abcdef0123456789");
    expect(decryptAccount(sealed, "w1001")).toBe("026291800001191");
    expect(encryptAccount("1", "w1").split(".")[1]).not.toBe(sealed.split(".")[1]);
  });

  it("refuses to run in production without a key", () => {
    vi.stubEnv("BANK_ENCRYPTION_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    expect(() => encryptAccount("026291800001191", "w1001")).toThrow("BANK_ENCRYPTION_KEY");
    vi.stubEnv("DEMO_MODE", "true");
    expect(() => encryptAccount("026291800001191", "w1001")).not.toThrow();
  });
});
