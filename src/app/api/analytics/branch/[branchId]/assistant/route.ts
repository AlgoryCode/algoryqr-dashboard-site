import { NextResponse } from "next/server";

import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ branchId: string }> },
) {
  const { branchId } = await context.params;
  if (!/^\d+$/.test(branchId)) {
    return NextResponse.json({ message: "Geçersiz şube" }, { status: 400 });
  }
  return proxyAuthenticatedRequest(request, `/analytics/branch/${branchId}/assistant`, "GET");
}
