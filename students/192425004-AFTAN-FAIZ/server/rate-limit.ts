import { createHmac } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { safetyGateway } from "./supabase.js";
export type RateScope =
  | "api"
  | "login"
  | "safety_submit"
  | "safety_track"
  | "assistant";
export type RateGuard = (
  key: string,
  scope: RateScope,
  res: Response,
) => Promise<{ allowed: boolean; retryAfter: number }>;
export const databaseRateGuard: RateGuard = async (key, scope, res) => {
  const gateway = res.locals.gateway ?? (await safetyGateway());
  res.locals.gateway = gateway;
  const { data, error } = await gateway.rpc("consume_rate_limit", {
    p_key: key,
    p_scope: scope,
  });
  if (error || typeof data?.allowed !== "boolean")
    throw new Error("Rate limit service unavailable");
  return data;
};
export function rateBucket(address: string, scope: RateScope, secret: string) {
  return createHmac("sha256", secret)
    .update(`${scope}:${address}`)
    .digest("hex");
}
export function persistentRateLimit(
  scope: RateScope,
  guard: RateGuard = databaseRateGuard,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const secret =
        process.env.RATE_LIMIT_SALT || process.env.SAFETY_GATEWAY_PASSWORD;
      if (!secret && guard === databaseRateGuard)
        throw new Error("Rate limit secret missing");
      const result = await guard(
        rateBucket(
          req.ip || req.socket.remoteAddress || "unknown",
          scope,
          secret || "test-only-injected-guard",
        ),
        scope,
        res,
      );
      if (!result.allowed) {
        res.setHeader("Retry-After", String(result.retryAfter));
        res
          .status(429)
          .json({
            error: "Too many requests. Please wait before trying again.",
          });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
