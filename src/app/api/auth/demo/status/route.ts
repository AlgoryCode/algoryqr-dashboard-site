import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authUrl } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ demo: false }, { status: 200 });
    }

    const upstream = await axios.get(`${authUrl("demoStatus")}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      validateStatus: () => true,
      timeout: 20_000,
    });

    const body = upstream.data ?? { demo: false };
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
