import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ branchId: string; staffId: string }> },
) {
  const { branchId, staffId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/branch/${branchId}/staff/${staffId}`,
    "PATCH",
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ branchId: string; staffId: string }> },
) {
  const { branchId, staffId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/branch/${branchId}/staff/${staffId}`,
    "DELETE",
  );
}
