import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const { staffId } = await context.params;
  return proxyAuthenticatedRequest(request, `/waiter-panel/staff/${staffId}`, "PATCH");
}
