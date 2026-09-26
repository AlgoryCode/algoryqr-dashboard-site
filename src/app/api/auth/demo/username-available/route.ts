import axios from "axios";
import { NextResponse } from "next/server";

import { authUrl } from "@/lib/config";

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const username = requestUrl.searchParams.get("username")?.trim() ?? "";
    if (!username) {
      return NextResponse.json({ message: "Kullanıcı adı gerekli" }, { status: 400 });
    }

    const upstream = await axios.get(`${authUrl("demoUsernameAvailable")}`, {
      params: { username },
      headers: { Accept: "application/json" },
      validateStatus: () => true,
      timeout: 20_000,
    });

    return NextResponse.json(upstream.data ?? { available: false }, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
