import { NextResponse } from "next/server";

import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

const JOB_ID = /^[0-9a-fA-F-]{36}$/;

type Context = { params: Promise<{ jobId: string }> };

/** Upstream: GET analytics/smart-reports/{jobId}/feedback (204 when not answered yet). */
export async function GET(request: Request, context: Context) {
  const { jobId } = await context.params;
  if (!JOB_ID.test(jobId)) {
    return NextResponse.json({ message: "Gecersiz jobId" }, { status: 400 });
  }
  return proxyAuthenticatedRequest(request, `/analytics/smart-reports/${jobId}/feedback`, "GET");
}

/** Upstream: PUT analytics/smart-reports/{jobId}/feedback */
export async function PUT(request: Request, context: Context) {
  const { jobId } = await context.params;
  if (!JOB_ID.test(jobId)) {
    return NextResponse.json({ message: "Gecersiz jobId" }, { status: 400 });
  }
  return proxyAuthenticatedRequest(request, `/analytics/smart-reports/${jobId}/feedback`, "PUT");
}
