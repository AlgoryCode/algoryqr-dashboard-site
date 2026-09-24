import { NextResponse, type NextRequest } from "next/server";

import { resolveDashboardPathForRequest } from "@/lib/server/access-session-gate";

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = readAccessToken(request);
  const refreshToken = readRefreshToken(request);

  if (!accessToken && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("return", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!accessToken) {
    return NextResponse.next();
  }

  const nextPath = await resolveDashboardPathForRequest(pathname, accessToken);
  if (!nextPath || nextPath === pathname) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
