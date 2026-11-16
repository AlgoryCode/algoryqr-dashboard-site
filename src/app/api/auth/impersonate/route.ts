import axios from "axios";
import { NextResponse } from "next/server";

import { getExpFromAccessToken, getMerchantIdFromAccessToken } from "@/lib/auth-user";
import { authUrl } from "@/lib/config";
import { applyActivePackageCookie } from "@/lib/server/active-package";
import { setAuthCookies, setTokenExpiryCookies } from "@/lib/server/auth-cookies";
import { isSameOriginRequest } from "@/lib/server/request-guards";
import { resolveRefreshCookieExpiry } from "@/lib/server/session-expiry";

type ImpersonateBody = {
  accessToken?: string;
  refreshToken?: string;
  merchantId?: number;
};

/** Ask the auth service whether the token is genuine and live before it becomes a cookie. */
async function isAcceptedByAuthService(accessToken: string): Promise<boolean> {
  try {
    const upstream = await axios.get(authUrl("access"), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      validateStatus: () => true,
      timeout: 10_000,
    });
    return upstream.status >= 200 && upstream.status < 300;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // Only the same-origin /auth/impersonate page may set a session here. A JSON content type
  // also keeps cross-site HTML forms (text/plain bodies) out.
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ message: "Geçersiz istek" }, { status: 415 });
  }

  try {
    const body = (await req.json()) as ImpersonateBody;
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ message: "Geçersiz oturum bilgisi" }, { status: 400 });
    }

    // The merchant comes from the token, never from the caller.
    const merchantId = getMerchantIdFromAccessToken(accessToken);
    if (merchantId == null) {
      return NextResponse.json({ message: "Geçersiz oturum bilgisi" }, { status: 400 });
    }
    if (body.merchantId != null && body.merchantId !== merchantId) {
      return NextResponse.json({ message: "Oturum bilgisi eşleşmiyor" }, { status: 400 });
    }

    if (!(await isAcceptedByAuthService(accessToken))) {
      return NextResponse.json({ message: "Oturum doğrulanamadı" }, { status: 401 });
    }

    const accessTokenExpiresAt = getExpFromAccessToken(accessToken) ?? undefined;
    const refreshTokenExpiresAt = await resolveRefreshCookieExpiry(refreshToken, null, accessToken);

    const response = NextResponse.json({ ok: true, merchantId }, { status: 200 });
    setAuthCookies(response, accessToken, refreshToken, merchantId);
    setTokenExpiryCookies(response, accessTokenExpiresAt, refreshTokenExpiresAt);
    await applyActivePackageCookie(response, merchantId, accessToken);
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
