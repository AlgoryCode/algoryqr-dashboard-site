import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ layoutId: string }> },
) {
  const { layoutId } = await context.params;
  return proxyAuthenticatedRequest(request, `/waiter-panel/catalog/layouts/${layoutId}`, "PATCH");
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ layoutId: string }> },
) {
  const { layoutId } = await context.params;
  return proxyAuthenticatedRequest(request, `/waiter-panel/catalog/layouts/${layoutId}`, "DELETE");
}
