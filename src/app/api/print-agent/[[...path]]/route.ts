import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function upstreamPath(context: RouteContext) {
  const path = (await context.params).path ?? [];
  const suffix = path.length > 0 ? `/${path.join("/")}` : "";
  return `/print-agent${suffix}`;
}

export async function GET(request: Request, context: RouteContext) {
  return proxyAuthenticatedRequest(request, await upstreamPath(context), "GET");
}

export async function POST(request: Request, context: RouteContext) {
  return proxyAuthenticatedRequest(request, await upstreamPath(context), "POST");
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyAuthenticatedRequest(request, await upstreamPath(context), "PUT");
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyAuthenticatedRequest(request, await upstreamPath(context), "PATCH");
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyAuthenticatedRequest(request, await upstreamPath(context), "DELETE");
}
