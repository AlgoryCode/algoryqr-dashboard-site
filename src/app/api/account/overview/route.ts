import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getMerchantIdFromAccessToken } from "@/lib/auth-user";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { clientContextHeaders } from "@/lib/server/client-headers";
import { fetchAccountOverview } from "@/lib/server/fetch-account-overview";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
    }

    const merchantId = getMerchantIdFromAccessToken(accessToken);
    const overview = await fetchAccountOverview(accessToken, merchantId, clientContextHeaders(request));

    if (!overview.profile.ok) {
      const status = overview.profile.status === 401 ? 401 : overview.profile.status >= 500 ? 502 : overview.profile.status;
      return NextResponse.json(overview, { status });
    }

    return NextResponse.json(overview);
  } catch {
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
