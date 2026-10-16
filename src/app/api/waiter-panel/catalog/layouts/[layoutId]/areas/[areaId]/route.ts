import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ layoutId: string; areaId: string }> },
) {
  const { layoutId, areaId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/waiter-panel/catalog/layouts/${layoutId}/areas/${areaId}`,
    "PATCH",
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ layoutId: string; areaId: string }> },
) {
  const { layoutId, areaId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/waiter-panel/catalog/layouts/${layoutId}/areas/${areaId}`,
    "DELETE",
  );
}
