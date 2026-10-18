import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedRequest(request, "/staff/panel/catalog/layouts", "GET");
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest(request, "/staff/panel/catalog/layouts", "POST");
}
