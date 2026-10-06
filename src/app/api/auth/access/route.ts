import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAccessProfileFromToken } from "@/lib/auth-user";
import { authUrl } from "@/lib/config";
import { readPackageAccess } from "@/lib/package-access";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  if (!accessToken) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
  }

  try {
    const upstream = await axios.get(authUrl("access"), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      validateStatus: () => true,
      timeout: 20_000,
    });

    if (upstream.status >= 200 && upstream.status < 300 && upstream.data) {
      const tokenProfile = getAccessProfileFromToken(accessToken);
      const liveBody =
        typeof upstream.data === "object" && upstream.data
          ? (upstream.data as Record<string, unknown>)
          : {};
      const live = readPackageAccess({
        ...liveBody,
        provider: tokenProfile.provider,
        ...(tokenProfile.roles.length > 0 ? { roles: tokenProfile.roles } : {}),
      });
      if (live) return NextResponse.json(live);
    }

    return NextResponse.json(
      typeof upstream.data === "object" && upstream.data ? upstream.data : { message: "Erişim okunamadı" },
      { status: upstream.status || 502 },
    );
  } catch {
    return NextResponse.json({ message: "Erişim okunamadı" }, { status: 502 });
  }
}
