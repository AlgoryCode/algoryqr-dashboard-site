import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ menuId: string; areaId: string }> },
) {
  const { menuId, areaId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/waiter-panel/menu/${menuId}/areas/${areaId}`,
    "PATCH",
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ menuId: string; areaId: string }> },
) {
  const { menuId, areaId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/waiter-panel/menu/${menuId}/areas/${areaId}`,
    "DELETE",
  );
}
