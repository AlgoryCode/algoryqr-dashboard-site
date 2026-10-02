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
import {
  fetchPersonalDemoStatus,
  getPersonalDemoSetupState,
  isPersonalDemoAccount,
} from "@/lib/server/demo-onboarding-gate";
import { setDemoSetupDoneCookie } from "@/lib/server/demo-onboarding-cookies";

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

function hasDemoSetupDoneCookie(request: NextRequest): boolean {
  return readDemoSetupDoneFromRequest(request.cookies);
}

function isDemoSetupPending(request: NextRequest): boolean {
  const cookies = request.cookies;
  return readDemoTrialAccountFromRequest(cookies) && !hasDemoSetupDoneCookie(request);
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
    let setupDoneFromDb = false;
    if (readDemoTrialAccountFromRequest(request.cookies) && !hasDemoSetupDoneCookie(request)) {
      const status = await fetchPersonalDemoStatus(accessToken);
      setupDoneFromDb = isPersonalDemoAccount(status) && getPersonalDemoSetupState(status) === true;
    }
    if (!isDemoSetupPending(request) || setupDoneFromDb) {
      const response = NextResponse.redirect(new URL("/dashboard/genel-bakis", request.url));
      if (setupDoneFromDb) setDemoSetupDoneCookie(response);
      return response;
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

  // Cookies are only a fast path. After a new login/session, verify the
  // persisted setup flag before deciding whether the wizard is required.
  let setupDoneFromDb = false;
  if (readDemoTrialAccountFromRequest(request.cookies) && !hasDemoSetupDoneCookie(request)) {
    const status = await fetchPersonalDemoStatus(accessToken);
    setupDoneFromDb = isPersonalDemoAccount(status) && getPersonalDemoSetupState(status) === true;
  }

  // Demo user who hasn't completed setup → redirect to /demo-kurulum
  if (isDemoSetupPending(request) && !setupDoneFromDb) {
    return NextResponse.redirect(new URL(DEMO_SETUP_PATH, request.url));
  }

  const nextPath = await resolveDashboardPathForRequest(pathname, accessToken);
  const response = !nextPath || nextPath === pathname
    ? NextResponse.next()
    : NextResponse.redirect(new URL(nextPath, request.url));
  if (setupDoneFromDb) {
    setDemoSetupDoneCookie(response);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/demo-kurulum/:path*", "/api/:path*"],
};
