import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { activePackagePath } from "@/lib/active-package-path";
import { resolveSessionMerchantId } from "@/lib/auth-user";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { attachActivePackageCookie } from "@/lib/server/active-package";
import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  const userId = resolveSessionMerchantId(accessToken, cookieStore);
  if (userId == null) {
    return NextResponse.json({ message: "Token içinde userId yok" }, { status: 401 });
  }
  const upstream = await proxyAuthenticatedRequest(request, activePackagePath(userId), "GET");
  return attachActivePackageCookie(upstream);
}
