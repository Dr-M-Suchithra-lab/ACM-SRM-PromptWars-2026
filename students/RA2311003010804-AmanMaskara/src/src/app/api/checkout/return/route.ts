import { revalidatePath } from "next/cache";
import { getSession } from "@/server/session";
import { getCheckoutProvider } from "@/server/payouts/provider";
import { getRepos } from "@/server/repos";
import { confirmCheckout } from "@/server/services/payouts";

const BATCH_ID = /^fs\d{6}_[a-f0-9]{12}$/;

/** A relative redirect, so the browser stays on the public host whatever proxy is in front. */
const seeOther = (location: string) => new Response(null, { status: 303, headers: { location } });

/**
 * Where Cashfree sends the employer after the checkout. The URL itself proves nothing: the
 * outcome is always asked of Cashfree, server to server, before anything is recorded.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return seeOther("/login");
  const batchId = new URL(request.url).searchParams.get("batch") ?? "";
  const provider = getCheckoutProvider();
  let month: string | undefined;
  if (BATCH_ID.test(batchId) && provider) {
    const result = await confirmCheckout(getRepos(), provider, { orgId: session.orgId, batchId, now: new Date() });
    if (result.ok) month = result.month;
    revalidatePath("/a/payroll");
    revalidatePath("/w/pay");
  }
  return seeOther(`${month ? `/a/payroll?m=${month}` : "/a/payroll"}#payouts-title`);
}
