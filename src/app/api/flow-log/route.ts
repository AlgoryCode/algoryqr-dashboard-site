import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { flowLogEnabled, getServerFlowEntries } from "@/lib/flow-log";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { isSameOriginRequest } from "@/lib/server/request-guards";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Debug feed of upstream calls made by this server (all users, bodies redacted only for
 * secret-looking keys). Never public: off unless flow logging is on, and only for a signed-in,
 * same-origin dashboard session.
 */
export async function GET(request: Request) {
  if (!flowLogEnabled()) {
    return NextResponse.json({ message: "Not found" }, { status: 404, headers: NO_STORE });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: NO_STORE });
  }
  const accessToken = readAccessTokenFromCookies(await cookies());
  if (!accessToken) {
    return NextResponse.json({ message: "Oturum gerekli" }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json({ entries: getServerFlowEntries() }, { headers: NO_STORE });
}
