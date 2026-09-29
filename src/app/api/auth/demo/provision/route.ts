import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authUrl } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
    }

    const upstream = await axios.post(`${authUrl("demoProvision")}`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
      timeout: 120_000,
    });

    if (upstream.status >= 200 && upstream.status < 300) {
      return new NextResponse(null, { status: 204 });
    }

    const message =
      typeof upstream.data?.message === "string"
        ? upstream.data.message
        : "Demo kurulumu tamamlanamadi";
    return NextResponse.json({ message }, { status: upstream.status || 502 });
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
