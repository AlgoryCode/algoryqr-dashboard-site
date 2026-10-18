import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { activePackagePath } from "@/lib/active-package-path";
import { getAccessProfileFromToken, resolveSessionMerchantId } from "@/lib/auth-user";
import { mergePackagePayloadWithProfile } from "@/lib/package-access";
import { readAccessTokenFromCookies, setActivePackageCookie } from "@/lib/server/auth-cookies";
import { attachActivePackageCookie, parseActivePackageSnapshot } from "@/lib/server/active-package";
import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  const merchantId = resolveSessionMerchantId(accessToken, cookieStore);
  if (merchantId == null || !accessToken) {
    return NextResponse.json({ message: "Token içinde merchantId yok" }, { status: 401 });
  }
  const upstream = await proxyAuthenticatedRequest(request, activePackagePath(merchantId), "GET");
  if (upstream.status >= 200 && upstream.status < 300) {
    return attachActivePackageCookie(upstream, accessToken);
  }
  const fallbackPayload = mergePackagePayloadWithProfile({}, getAccessProfileFromToken(accessToken));
  const fallback = NextResponse.json(fallbackPayload);
  setActivePackageCookie(fallback, parseActivePackageSnapshot(fallbackPayload));
  return fallback;
}
