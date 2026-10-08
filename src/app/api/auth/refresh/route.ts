import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getExpFromAccessToken, resolveRefreshExpiresAt } from "@/lib/auth-user";
import { authUrl } from "@/lib/config";
import { applyActivePackageCookie, resolveLoginUserId } from "@/lib/server/active-package";
import {
  clearAuthCookies,
  readRefreshTokenFromCookies,
  setAuthCookies,
  setTokenExpiryCookies,
} from "@/lib/server/auth-cookies";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = readRefreshTokenFromCookies(cookieStore);

    if (!refreshToken) {
      const res = NextResponse.json({ message: "Refresh token yok" }, { status: 401 });
      clearAuthCookies(res);
      return res;
    }

    const upstream = await axios.post<Record<string, unknown>>(
      authUrl("refresh"),
      { refreshToken },
      {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        validateStatus: () => true,
        timeout: 20_000,
      },
    );

    const raw = upstream.data;
    const data = (typeof raw === "object" && raw != null ? raw : {}) as {
      message?: string;
      accessToken?: string;
      refreshToken?: string;
      access_token?: string;
      refresh_token?: string;
      userId?: number;
      accessExpiresAt?: string;
      refreshExpiresAt?: string;
    };

    if (upstream.status < 200 || upstream.status >= 300) {
      const status = upstream.status || 401;
      const response = NextResponse.json(
        { message: typeof data?.message === "string" ? data.message : "Token yenilenemedi" },
        { status },
      );
      if (status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    const accessToken = data?.accessToken ?? data?.access_token;
    const newRefresh = data?.refreshToken ?? data?.refresh_token;
    const userId = resolveLoginUserId(data.userId, typeof accessToken === "string" ? accessToken : undefined);
    const accessTokenExpiresAt = getExpFromAccessToken(
      typeof accessToken === "string" ? accessToken : undefined,
    );
    const refreshTokenExpiresAt = resolveRefreshExpiresAt(
      typeof newRefresh === "string" ? newRefresh : undefined,
      data.refreshExpiresAt,
    );

    const response = NextResponse.json(
      { ...data, userId, accessTokenExpiresAt, refreshTokenExpiresAt },
      { status: 200 },
    );

    setAuthCookies(
      response,
      typeof accessToken === "string" ? accessToken : undefined,
      typeof newRefresh === "string" ? newRefresh : undefined,
      userId,
    );
    await applyActivePackageCookie(response, userId, typeof accessToken === "string" ? accessToken : undefined);
    setTokenExpiryCookies(
      response,
      accessTokenExpiresAt ?? undefined,
      refreshTokenExpiresAt,
    );

    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
