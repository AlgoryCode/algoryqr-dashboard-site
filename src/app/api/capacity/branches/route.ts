import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

/** Branches over the plan's limit, the deadline to choose, and which ones are read-only. */
export async function GET(request: Request) {
  return proxyAuthenticatedRequest(request, "/capacity/branches", "GET");
}
