import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  if (!accessToken) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
  }
  return new NextResponse(null, { status: 204 });
}
