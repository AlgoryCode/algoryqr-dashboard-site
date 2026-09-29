import { NextResponse, type NextRequest } from "next/server";

import {
  demoOnboardingApiBlockedResponse,
  isDemoOnboardingApiAllowed,
  requiresDemoOnboardingGate,
} from "@/lib/server/demo-onboarding-gate";
import {
  readDemoSetupDoneFromRequest,
  readDemoTrialAccountFromRequest,
} from "@/lib/server/demo-onboarding-cookies";
import { resolveDashboardPathForRequest } from "@/lib/server/access-session-gate";

const DEMO_SETUP_PATH = "/demo-kurulum";

function readAccessToken(request: NextRequest): string | null {
  return (
    request.cookies.get("accessToken")?.value?.trim() ||
    request.cookies.get("algory_access_token")?.value?.trim() ||
    null
  );
}

function readRefreshToken(request: NextRequest): string | null {
  return (
    request.cookies.get("refreshToken")?.value?.trim() ||
    request.cookies.get("algory_refresh_token")?.value?.trim() ||
    null
  );
}

function isDemoSetupPending(request: NextRequest): boolean {
  const cookies = request.cookies;
  return readDemoTrialAccountFromRequest(cookies) && !readDemoSetupDoneFromRequest(cookies);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API requests: block non-allowlisted while demo setup pending ──
  if (pathname.startsWith("/api/")) {
    if (requiresDemoOnboardingGate(request) && !isDemoOnboardingApiAllowed(pathname, request.method)) {
      return demoOnboardingApiBlockedResponse();
    }
    return NextResponse.next();
  }

  // ── /demo-kurulum: if setup already done → dashboard ──
  if (pathname === DEMO_SETUP_PATH || pathname.startsWith(`${DEMO_SETUP_PATH}/`)) {
    const accessToken = readAccessToken(request);
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!isDemoSetupPending(request)) {
      return NextResponse.redirect(new URL("/dashboard/genel-bakis", request.url));
    }
    return NextResponse.next();
  }

  // ── Dashboard routes ──
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const accessToken = readAccessToken(request);
  const refreshToken = readRefreshToken(request);

  if (!accessToken && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!accessToken) {
    return NextResponse.next();
  }

  // Demo user who hasn't completed setup → redirect to /demo-kurulum
  if (isDemoSetupPending(request)) {
    return NextResponse.redirect(new URL(DEMO_SETUP_PATH, request.url));
  }

  const nextPath = await resolveDashboardPathForRequest(pathname, accessToken);
  if (!nextPath || nextPath === pathname) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/demo-kurulum/:path*", "/api/:path*"],
};
