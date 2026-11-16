import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

/** All detailed reports of the merchant (visits, revenue, waiters) across every branch. */
export async function GET(request: Request) {
  return proxyAuthenticatedRequest(request, "/analytics/merchant/detailed-report", "GET", {
    timeoutMs: 30_000,
  });
}
