import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ layoutId: string; tableId: string }> },
) {
  const { layoutId, tableId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/catalog/layouts/${layoutId}/tables/${tableId}/regenerate-qr`,
    "POST",
  );
}
