import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const { staffId } = await context.params;
  return proxyAuthenticatedRequest(request, `/staff/panel/staff/${staffId}/branch`, "PATCH");
}
