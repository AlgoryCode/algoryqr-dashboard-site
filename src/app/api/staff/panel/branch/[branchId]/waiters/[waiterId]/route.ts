import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ branchId: string; waiterId: string }> },
) {
  const { branchId, waiterId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/branch/${branchId}/staff/${waiterId}`,
    "PATCH",
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ branchId: string; waiterId: string }> },
) {
  const { branchId, waiterId } = await context.params;
  return proxyAuthenticatedRequest(
    request,
    `/staff/panel/branch/${branchId}/staff/${waiterId}`,
    "DELETE",
  );
}
