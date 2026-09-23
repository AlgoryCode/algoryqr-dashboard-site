import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

type RouteContext = { params: Promise<{ productId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  return proxyAuthenticatedRequest(request, `/menu/products/${productId}/recipe`, "GET");
}

export async function PUT(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  return proxyAuthenticatedRequest(request, `/menu/products/${productId}/recipe`, "PUT");
}
