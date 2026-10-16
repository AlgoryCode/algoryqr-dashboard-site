import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ layoutId: string }> },
) {
  const { layoutId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/waiter-panel/catalog/layouts/${layoutId}/assign`,
    "POST",
  );
}
