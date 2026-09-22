import axios from "axios";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";

export async function GET() {
  try {
    const upstream = await axios.get(`${API_BASE_URL}/auth/demo-account`, {
      headers: { Accept: "application/json" },
      validateStatus: () => true,
      timeout: 20_000,
    });
    const body = upstream.data ?? { enabled: false };
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
