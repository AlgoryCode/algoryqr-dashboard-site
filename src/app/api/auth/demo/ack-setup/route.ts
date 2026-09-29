import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import {
  readDemoTrialAccountFromRequest,
  setDemoSetupDoneCookie,
} from "@/lib/server/demo-onboarding-cookies";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  if (!accessToken) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401 });
  }
  if (!readDemoTrialAccountFromRequest(cookieStore)) {
    return NextResponse.json({ message: "Demo hesap değil" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  setDemoSetupDoneCookie(response);
  return response;
}
