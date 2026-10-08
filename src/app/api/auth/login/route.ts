import axios from "axios";
import { NextResponse } from "next/server";

import { getExpFromAccessToken, isoToEpochSeconds } from "@/lib/auth-user";
import { authUrl } from "@/lib/config";
import { applyActivePackageCookie, resolveLoginUserId } from "@/lib/server/active-package";
import { setAuthCookies, setTokenExpiryCookies, setTwoFactorPendingCookie } from "@/lib/server/auth-cookies";
import { applyPersonalDemoTrialCookie } from "@/lib/server/apply-demo-onboarding-cookies";
import { clientContextHeaders } from "@/lib/server/client-headers";
import { resolveRefreshCookieExpiry } from "@/lib/server/session-expiry";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const loginPayload = {
      identifier: email,
      email,
      password: typeof body?.password === "string" ? body.password : "",
    };

    if (!email || !loginPayload.password) {
      return NextResponse.json({ message: "E-posta/kullanıcı adı ve şifre gerekli" }, { status: 400 });
    }

    const upstream = await axios.post<Record<string, unknown>>(
      authUrl("login"),
      loginPayload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...clientContextHeaders(req),
        },
        validateStatus: () => true,
        timeout: 20_000,
      },
    );

    const data = (typeof upstream.data === "object" && upstream.data != null ? upstream.data : {}) as Record<
      string,
      unknown
    > & {
      message?: string;
      code?: string;
      requiresTwoFactor?: boolean;
      twoFactorToken?: string;
      userId?: number;
      email?: string;
      firstName?: string;
      lastName?: string;
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
      accessExpiresAt?: string;
      refreshExpiresAt?: string;
    };

    if (upstream.status < 200 || upstream.status >= 300) {
      const payload: { message: string; code?: string } = {
        message: typeof data?.message === "string" ? data.message : "Giriş başarısız",
      };
      if (typeof data?.code === "string" && data.code.trim()) {
        payload.code = data.code;
      }
      return NextResponse.json(payload, { status: upstream.status || 401 });
    }

    if (data?.requiresTwoFactor === true && data?.twoFactorToken) {
      const response = NextResponse.json(
        {
          requiresTwoFactor: true,
          userId: data.userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        { status: 200 },
      );
      setTwoFactorPendingCookie(response, String(data.twoFactorToken));
      return response;
    }

    const accessToken = data?.accessToken ?? data?.access_token;
    const refreshToken = data?.refreshToken ?? data?.refresh_token;
    const accessTokenValue = typeof accessToken === "string" ? accessToken : undefined;
    const refreshTokenValue = typeof refreshToken === "string" ? refreshToken : undefined;
    const userId = resolveLoginUserId(data.userId, accessTokenValue);
    const accessTokenExpiresAt =
      getExpFromAccessToken(accessTokenValue) ??
      isoToEpochSeconds(data.accessExpiresAt) ??
      undefined;
    const refreshTokenExpiresAt = await resolveRefreshCookieExpiry(
      refreshTokenValue,
      data.refreshExpiresAt,
      accessTokenValue,
    );

    const response = NextResponse.json(
      { ...data, userId, accessTokenExpiresAt, refreshTokenExpiresAt },
      { status: 200 },
    );
    setAuthCookies(
      response,
      accessTokenValue,
      refreshTokenValue,
      userId,
    );
    setTokenExpiryCookies(response, accessTokenExpiresAt, refreshTokenExpiresAt);
    await applyActivePackageCookie(response, userId, typeof accessToken === "string" ? accessToken : undefined);
    await applyPersonalDemoTrialCookie(response, typeof accessToken === "string" ? accessToken : undefined);
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
