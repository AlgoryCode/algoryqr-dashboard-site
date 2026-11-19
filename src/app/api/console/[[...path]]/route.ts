import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function proxy(
  request: Request,
  method: "GET" | "POST" | "PUT" | "DELETE",
  context: RouteContext,
) {
  const path = (await context.params).path ?? [];
  const suffix = path.length > 0 ? `/${path.join("/")}` : "";
  return proxyAuthenticatedRequest(request, `/console${suffix}`, method);
}

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, "GET", context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, "POST", context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxy(request, "PUT", context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, "DELETE", context);
}
