import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ menuId: string; orderId: string }> },
) {
  const { menuId, orderId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/menu/${menuId}/orders/${orderId}/kitchen-note`,
    "PATCH",
  );
}
