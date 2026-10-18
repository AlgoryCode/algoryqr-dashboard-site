import axios from "axios";
import { NextResponse } from "next/server";

import { getExpFromAccessToken, isoToEpochSeconds, resolveRefreshExpiresAt } from "@/lib/auth-user";
import { authUrl } from "@/lib/config";
import { applyActivePackageCookie, resolveLoginMerchantId } from "@/lib/server/active-package";
import { setAuthCookies, setTokenExpiryCookies } from "@/lib/server/auth-cookies";
import { applyPersonalDemoTrialCookie } from "@/lib/server/apply-demo-onboarding-cookies";
import { clientContextHeaders } from "@/lib/server/client-headers";

type DemoLoginBody = {
  username?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DemoLoginBody;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password) {
      return NextResponse.json({ message: "Kullanıcı adı ve şifre gerekli" }, { status: 400 });
    }

    const upstream = await axios.post<Record<string, unknown>>(
      authUrl("demoLogin"),
      { username, password },
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
      merchantId?: number;
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
      accessExpiresAt?: string;
      refreshExpiresAt?: string;
    };

    if (upstream.status < 200 || upstream.status >= 300) {
      const payload: { message: string; code?: string } = {
        message: typeof data?.message === "string" ? data.message : "Demo giriş başarısız",
      };
      if (typeof data?.code === "string" && data.code.trim()) {
        payload.code = data.code;
      }
      return NextResponse.json(payload, { status: upstream.status || 401 });
    }

    const accessToken = data?.accessToken ?? data?.access_token;
    const refreshToken = data?.refreshToken ?? data?.refresh_token;
    const merchantId = resolveLoginMerchantId(
      data,
      typeof accessToken === "string" ? accessToken : undefined,
    );
    const accessTokenExpiresAt =
      getExpFromAccessToken(typeof accessToken === "string" ? accessToken : undefined) ??
      isoToEpochSeconds(data.accessExpiresAt) ??
      undefined;
    const refreshTokenExpiresAt = resolveRefreshExpiresAt(
      typeof refreshToken === "string" ? refreshToken : undefined,
      data.refreshExpiresAt,
    );

    const response = NextResponse.json(
      { ...data, merchantId, userId: undefined, accessTokenExpiresAt, refreshTokenExpiresAt },
      { status: 200 },
    );
    setAuthCookies(
      response,
      typeof accessToken === "string" ? accessToken : undefined,
      typeof refreshToken === "string" ? refreshToken : undefined,
      merchantId,
    );
    setTokenExpiryCookies(response, accessTokenExpiresAt, refreshTokenExpiresAt);
    await applyActivePackageCookie(response, merchantId, typeof accessToken === "string" ? accessToken : undefined);
    await applyPersonalDemoTrialCookie(response, typeof accessToken === "string" ? accessToken : undefined);
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
