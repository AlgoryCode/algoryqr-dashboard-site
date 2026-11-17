import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

/** The member's pick of branches that stay active; the rest become read-only. */
export async function POST(request: Request) {
  return proxyAuthenticatedRequest(request, "/capacity/branches/keep", "POST");
}
