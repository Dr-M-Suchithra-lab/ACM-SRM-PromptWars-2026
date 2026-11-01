import { createClient } from "@supabase/supabase-js";
export function userClient(token?: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY)
    throw new Error("Supabase configuration missing");
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
    },
  );
}
let gatewaySession: { token: string; expires: number } | undefined;
export async function safetyGateway() {
  if (gatewaySession && gatewaySession.expires > Date.now() + 60000)
    return userClient(gatewaySession.token);
  if (!process.env.SAFETY_GATEWAY_EMAIL || !process.env.SAFETY_GATEWAY_PASSWORD)
    throw new Error("Safety gateway not configured");
  const c = userClient();
  const { data, error } = await c.auth.signInWithPassword({
    email: process.env.SAFETY_GATEWAY_EMAIL,
    password: process.env.SAFETY_GATEWAY_PASSWORD,
  });
  if (error || !data.session) throw new Error("Safety service unavailable");
  gatewaySession = {
    token: data.session.access_token,
    expires: (data.session.expires_at ?? 0) * 1000,
  };
  return userClient(gatewaySession.token);
}
