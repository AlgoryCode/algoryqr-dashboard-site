import { NextResponse } from "next/server";

import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

/** Upstream: GET analytics/smart-reports/usage?days=7|30 */
export async function GET(request: Request) {
  const days = new URL(request.url).searchParams.get("days") ?? "7";
  if (days !== "7" && days !== "30") {
    return NextResponse.json({ message: "days 7 veya 30 olmali" }, { status: 400 });
  }
  return proxyAuthenticatedRequest(request, `/analytics/smart-reports/usage?days=${days}`, "GET");
}
