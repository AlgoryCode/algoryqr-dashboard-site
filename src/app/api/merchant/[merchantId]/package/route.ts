import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { activePackagePath } from "@/lib/active-package-path";
import { resolveSessionMerchantId } from "@/lib/auth-user";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { attachActivePackageCookie } from "@/lib/server/active-package";
import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  const { merchantId: rawMerchantId } = await context.params;
  const merchantId = Number(rawMerchantId);
  if (!Number.isInteger(merchantId) || merchantId <= 0) {
    return NextResponse.json({ message: "Geçersiz işletme" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  const sessionMerchantId = resolveSessionMerchantId(accessToken, cookieStore);
  if (sessionMerchantId == null) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
  }
  if (sessionMerchantId !== merchantId) {
    return NextResponse.json({ message: "Aktif paket bu işletmeye ait değil" }, { status: 403 });
  }

  const upstream = await proxyAuthenticatedRequest(request, activePackagePath(merchantId), "GET");
  return attachActivePackageCookie(upstream, accessToken);
}
