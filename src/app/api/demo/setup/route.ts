import { NextResponse } from "next/server";

import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";
import { setDemoSetupDoneCookie } from "@/lib/server/demo-onboarding-cookies";

export async function POST(request: Request) {
  const upstream = await proxyAuthenticatedRequest(request, "/demo/setup", "POST");
  if (upstream.status < 200 || upstream.status >= 300) {
    return upstream;
  }

  const body = await upstream.text();
  const response = new NextResponse(body || null, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
  setDemoSetupDoneCookie(response);
  return response;
}
