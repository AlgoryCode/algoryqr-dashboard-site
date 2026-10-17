import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ layoutId: string; tableId: string }> },
) {
  const { layoutId, tableId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/catalog/layouts/${layoutId}/tables/${tableId}`,
    "PATCH",
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ layoutId: string; tableId: string }> },
) {
  const { layoutId, tableId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/catalog/layouts/${layoutId}/tables/${tableId}`,
    "DELETE",
  );
}
