import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ branchId: string }> },
) {
  const { branchId } = await context.params;
  return proxyAuthenticatedRequest(request, `/staff/panel/branch/${branchId}/staff`, "GET");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ branchId: string }> },
) {
  const { branchId } = await context.params;
  return proxyAuthenticatedRequest(request, `/staff/panel/branch/${branchId}/staff`, "POST");
}
