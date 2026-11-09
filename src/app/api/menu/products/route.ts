import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedRequest(request, "/menu/products", "GET");
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest(request, "/menu/products", "POST");
}
