import axios from "axios";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { getJsonErrorText } from "@/lib/api-error-text";
import { clientContextHeaders } from "@/lib/server/client-headers";

type VerifyBody = {
  email?: string;
  code?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyBody;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !code) {
      return NextResponse.json({ message: "E-posta ve doğrulama kodu gerekli" }, { status: 400 });
    }

    const upstream = await axios.post(
      `${API_BASE_URL}/auth/email-verification/verify`,
      { email, code },
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

    const data =
      typeof upstream.data === "object" && upstream.data != null
        ? (upstream.data as Record<string, unknown>)
        : {};

    if (upstream.status < 200 || upstream.status >= 300) {
      return NextResponse.json(
        { message: getJsonErrorText(upstream.data) || "Doğrulama başarısız" },
        { status: upstream.status || 400 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
