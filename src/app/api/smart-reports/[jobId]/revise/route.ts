import { NextResponse } from "next/server";

import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

/** Upstream: POST analytics/smart-reports/{jobId}/revise — saves feedback and queues a revised report (1 credit). */
export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  if (!/^[0-9a-fA-F-]{36}$/.test(jobId)) {
    return NextResponse.json({ message: "Gecersiz jobId" }, { status: 400 });
  }
  return proxyAuthenticatedRequest(request, `/analytics/smart-reports/${jobId}/revise`, "POST");
}
