import axios from "axios";
import { NextResponse } from "next/server";

import { getExpFromAccessToken, isoToEpochSeconds } from "@/lib/auth-user";
import { authUrl } from "@/lib/config";
import { setAuthCookies, setTokenExpiryCookies } from "@/lib/server/auth-cookies";
import { clientContextHeaders } from "@/lib/server/client-headers";
import { fetchCurrentSessionRefreshExpiresAt } from "@/lib/server/session-expiry";

type DemoRegisterBody = {
  username?: string;
  password?: string;
  passwordConfirm?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DemoRegisterBody;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const passwordConfirm =
      typeof body?.passwordConfirm === "string" ? body.passwordConfirm : password;

    if (!username || !password) {
      return NextResponse.json({ message: "Kullanıcı adı ve şifre gerekli" }, { status: 400 });
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ message: "Şifreler eşleşmiyor" }, { status: 400 });
    }

    const upstream = await axios.post<Record<string, unknown>>(
      authUrl("demoRegister"),
      { username, password, passwordConfirm },
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
      userId?: number;
      username?: string;
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
      accessExpiresAt?: string;
      refreshExpiresAt?: string;
    };

    if (upstream.status < 200 || upstream.status >= 300) {
      const message = typeof data?.message === "string" ? data.message : "Demo kayıt başarısız";
      return NextResponse.json({ message }, { status: upstream.status || 400 });
    }

    const accessToken = data?.accessToken ?? data?.access_token;
    const refreshToken = data?.refreshToken ?? data?.refresh_token;
    const accessTokenExpiresAt =
      getExpFromAccessToken(typeof accessToken === "string" ? accessToken : undefined) ??
      isoToEpochSeconds(data.accessExpiresAt) ??
      undefined;
    const refreshTokenExpiresAt =
      isoToEpochSeconds(data.refreshExpiresAt) ??
      (typeof accessToken === "string"
        ? await fetchCurrentSessionRefreshExpiresAt(accessToken)
        : undefined);

    const response = NextResponse.json(
      {
        ...data,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        message: data.message ?? "Demo hesap oluşturuldu",
      },
      { status: 200 },
    );
    setAuthCookies(
      response,
      typeof accessToken === "string" ? accessToken : undefined,
      typeof refreshToken === "string" ? refreshToken : undefined,
      typeof data.userId === "number" ? data.userId : undefined,
    );
    setTokenExpiryCookies(response, accessTokenExpiresAt, refreshTokenExpiresAt);
    return response;
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
