import axios from "axios";
import { NextResponse, type NextRequest } from "next/server";

import { authUrl } from "@/lib/config";
import {
  readDemoSetupDoneFromRequest,
  readDemoTrialAccountFromRequest,
} from "@/lib/server/demo-onboarding-cookies";

const DEMO_STATUS_TIMEOUT_MS = 8_000;

export type PersonalDemoStatus = {
  demo?: boolean;
  active?: boolean;
  /** Persisted by the demo setup endpoint in the auth/API database. */
  setupCompleted?: boolean;
  setupComplete?: boolean;
  setupDone?: boolean;
  onboardingCompleted?: boolean;
  onboardingComplete?: boolean;
  onboardingDone?: boolean;
  setup?: { completed?: boolean; complete?: boolean; done?: boolean } | null;
  onboarding?: { completed?: boolean; complete?: boolean; done?: boolean } | null;
};

export async function fetchPersonalDemoStatus(accessToken: string): Promise<PersonalDemoStatus | null> {
  if (!accessToken.trim()) return null;
  try {
    const upstream = await axios.get<PersonalDemoStatus>(`${authUrl("demoStatus")}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      validateStatus: () => true,
      timeout: DEMO_STATUS_TIMEOUT_MS,
    });
    if (upstream.status < 200 || upstream.status >= 300) return null;
    return upstream.data ?? null;
  } catch {
    return null;
  }
}

export function isPersonalDemoAccount(status: PersonalDemoStatus | null | undefined): boolean {
  return status?.demo === true && status.active !== false;
}

/**
 * Reads the persisted setup flag without coupling the dashboard to one backend
 * response spelling. Older auth deployments may not return the flag yet; in
 * that case we deliberately return null so the existing pending-cookie flow is
 * preserved until the API is upgraded.
 */
export function getPersonalDemoSetupState(
  status: PersonalDemoStatus | null | undefined,
): boolean | null {
  if (!status) return null;
  const values = [
    status.setupCompleted,
    status.setupComplete,
    status.setupDone,
    status.onboardingCompleted,
    status.onboardingComplete,
    status.onboardingDone,
    status.setup?.completed,
    status.setup?.complete,
    status.setup?.done,
    status.onboarding?.completed,
    status.onboarding?.complete,
    status.onboarding?.done,
  ];
  const known = values.find((value) => typeof value === "boolean");
  return typeof known === "boolean" ? known : null;
}

/** Site BFF paths (no `/api` prefix) allowed while demo onboarding is incomplete. */
const DEMO_ONBOARDING_API_ALLOWLIST: ReadonlyArray<{ method: string; path: string }> = [
  { method: "GET", path: "/access/context" },
  { method: "GET", path: "/access/session" },
  { method: "GET", path: "/auth/demo/status" },
  { method: "GET", path: "/auth/demo-account" },
  { method: "POST", path: "/auth/demo/provision" },
  { method: "POST", path: "/auth/demo/ack-setup" },
  { method: "POST", path: "/demo/setup" },
  { method: "GET", path: "/branches" },
  { method: "GET", path: "/menu/my/active" },
  { method: "GET", path: "/account/myprofile" },
  { method: "POST", path: "/auth/logout" },
  { method: "POST", path: "/auth/refresh" },
  // Demo seed: alan, masa, personel oluşturma
  { method: "GET", path: "/waiter-panel/menu" },
  { method: "POST", path: "/waiter-panel/menu" },
  { method: "GET", path: "/waiter-panel/branch" },
  { method: "POST", path: "/waiter-panel/branch" },
];

function normalizeApiPath(pathname: string): string {
  if (!pathname.startsWith("/api")) return pathname;
  const rest = pathname.slice(4);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

export function isDemoOnboardingApiAllowed(pathname: string, method: string): boolean {
  const sitePath = normalizeApiPath(pathname);
  const upperMethod = method.toUpperCase();
  if (sitePath.startsWith("/auth/")) {
    return true;
  }
  return DEMO_ONBOARDING_API_ALLOWLIST.some(
    (entry) => entry.method === upperMethod && (sitePath === entry.path || sitePath.startsWith(`${entry.path}/`)),
  );
}

function readAccessTokenFromRequest(request: NextRequest): string | null {
  return (
    request.cookies.get("accessToken")?.value?.trim() ||
    request.cookies.get("algory_access_token")?.value?.trim() ||
    null
  );
}

export function requiresDemoOnboardingGate(request: NextRequest): boolean {
  if (!readAccessTokenFromRequest(request)) return false;
  const cookies = request.cookies;
  if (!readDemoTrialAccountFromRequest(cookies)) return false;
  return !readDemoSetupDoneFromRequest(cookies);
}

export function demoOnboardingApiBlockedResponse(): NextResponse {
  return NextResponse.json(
    {
      message: "Demo kurulumunu tamamlayana kadar bu işleme erişemezsiniz.",
      code: "DEMO_SETUP_REQUIRED",
    },
    { status: 403 },
  );
}
