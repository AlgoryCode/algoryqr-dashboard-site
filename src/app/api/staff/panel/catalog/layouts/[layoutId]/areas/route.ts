import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ layoutId: string }> },
) {
  const { layoutId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/catalog/layouts/${layoutId}/areas`,
    "GET",
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ layoutId: string }> },
) {
  const { layoutId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/catalog/layouts/${layoutId}/areas`,
    "POST",
  );
}
