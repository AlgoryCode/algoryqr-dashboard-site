import axios from "axios";
import { NextResponse } from "next/server";

import { authUrl } from "@/lib/config";
import { clientContextHeaders } from "@/lib/server/client-headers";

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

    return NextResponse.json(
      {
        merchantId: typeof data.merchantId === "number" ? data.merchantId : data.userId,
        username: data.username ?? username,
        message: data.message ?? "Demo hesap oluşturuldu. Giriş yaparak devam edin.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
