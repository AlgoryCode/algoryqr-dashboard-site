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
import { SHOP_PATH, destinationForDecision } from "@/lib/access-session-gate";
import {
  fetchAccessSessionWithToken,
  resolveDashboardPathForRequest,
} from "@/lib/server/access-session-gate";
import {
  fetchPersonalDemoStatus,
  getPersonalDemoSetupState,
  isPersonalDemoAccount,
} from "@/lib/server/demo-onboarding-gate";
import { setDemoSetupDoneCookie } from "@/lib/server/demo-onboarding-cookies";
import { isKnownPath, isPanelPath, legacyPanelPath, NOT_FOUND_PATH } from "@/lib/panel-paths";

const DEMO_SETUP_PATH = "/demo-kurulum";

function readAccessToken(request: NextRequest): string | null {
  return (
    request.cookies.get("accessToken")?.value?.trim() ||
    null
  );
}

function readRefreshToken(request: NextRequest): string | null {
  return (
    request.cookies.get("refreshToken")?.value?.trim() ||
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

  const currentPath = legacyPanelPath(pathname);
  if (currentPath) {
    return NextResponse.redirect(new URL(`${currentPath}${request.nextUrl.search}`, request.url), 308);
  }

  if (!isKnownPath(pathname)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
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
      const response = NextResponse.redirect(new URL("/genel-bakis", request.url));
      if (setupDoneFromDb) setDemoSetupDoneCookie(response);
      return response;
    }
    return NextResponse.next();
  }

  if (pathname === SHOP_PATH || pathname.startsWith(`${SHOP_PATH}/`)) {
    return gateShop(request);
  }

  // ── Dashboard routes ──
  if (!isPanelPath(pathname)) {
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

async function gateShop(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = readAccessToken(request);
  const refreshToken = readRefreshToken(request);

  if (!accessToken && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!accessToken) {
    return NextResponse.next();
  }

  let setupDoneFromDb = false;
  if (readDemoTrialAccountFromRequest(request.cookies) && !hasDemoSetupDoneCookie(request)) {
    const status = await fetchPersonalDemoStatus(accessToken);
    setupDoneFromDb = isPersonalDemoAccount(status) && getPersonalDemoSetupState(status) === true;
  }

  if (isDemoSetupPending(request) && !setupDoneFromDb) {
    return NextResponse.redirect(new URL(DEMO_SETUP_PATH, request.url));
  }

  const session = await fetchAccessSessionWithToken(accessToken);
  if (!session || session.decision === "REQUIRE_PURCHASE") {
    const response = NextResponse.next();
    if (setupDoneFromDb) setDemoSetupDoneCookie(response);
    return response;
  }

  const response = NextResponse.redirect(
    new URL(destinationForDecision(session.decision, null), request.url),
  );
  if (setupDoneFromDb) setDemoSetupDoneCookie(response);
  return response;
}

export const config = {
  // Panel addresses have no shared prefix; only assets (anything with a dot) and Next internals are left out.
  matcher: ["/((?!_next/|.*\\.).*)"],
};
