import axios from "axios";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { getJsonErrorText } from "@/lib/api-error-text";
import { clientContextHeaders } from "@/lib/server/client-headers";

type ResendBody = {
  email?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResendBody;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ message: "E-posta gerekli" }, { status: 400 });
    }

    const upstream = await axios.post(
      `${API_BASE_URL}/auth/email-verification/resend`,
      { email },
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
        ? (upstream.data as { message?: string })
        : {};

    if (upstream.status < 200 || upstream.status >= 300) {
      return NextResponse.json(
        { message: getJsonErrorText(upstream.data) || data.message || "Kod gönderilemedi" },
        { status: upstream.status || 400 },
      );
    }

    return NextResponse.json(
      { message: typeof data.message === "string" ? data.message : "Doğrulama kodu gönderildi" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
