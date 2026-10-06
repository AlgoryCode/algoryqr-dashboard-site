import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { activePackagePath } from "@/lib/active-package-path";
import { resolveSessionUserId } from "@/lib/auth-user";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { attachActivePackageCookie } from "@/lib/server/active-package";
import { proxyAuthenticatedRequest } from "@/lib/server/authenticated-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId: rawUserId } = await context.params;
  const userId = Number(rawUserId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ message: "Geçersiz kullanıcı" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  const sessionUserId = resolveSessionUserId(accessToken, cookieStore);
  if (sessionUserId == null) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
  }
  if (sessionUserId !== userId) {
    return NextResponse.json({ message: "Aktif paket bu kullanıcıya ait değil" }, { status: 403 });
  }

  const upstream = await proxyAuthenticatedRequest(request, activePackagePath(userId), "GET");
  return attachActivePackageCookie(upstream);
}
