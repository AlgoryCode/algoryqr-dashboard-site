import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

/** Admin-published banners for the signed-in member. */
export async function GET(request: Request) {
  return proxyAuthenticatedRequest(request, "/announcements", "GET");
}
