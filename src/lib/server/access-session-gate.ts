import { activePackagePath } from "@/lib/active-package-path";
import { getUserIdFromAccessToken } from "@/lib/auth-user";
import { API_BASE_URL } from "@/lib/config";
import {
  destinationForDecision,
  parseAccessSession,
  type AccessSession,
} from "@/lib/access-session-gate";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

const ACCESS_CONTEXT_TIMEOUT_MS = 10_000;

export async function fetchAccessSessionWithToken(
  accessToken: string,
): Promise<AccessSession | null> {
  const userId = getUserIdFromAccessToken(accessToken);
  if (!API_BASE_URL || !accessToken || userId == null) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACCESS_CONTEXT_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${activePackagePath(userId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return parseAccessSession(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveDashboardPathForRequest(
  pathname: string,
  accessToken: string,
): Promise<string | null> {
  const session = await fetchAccessSessionWithToken(accessToken);
  if (!session) return null;
  return destinationForDecision(session.decision, pathname);
}

export async function resolvePostAuthDashboardPathWithAccessToken(
  accessToken: string,
  returnPath: string | null | undefined,
): Promise<string> {
  const pathname = returnPath ?? DASHBOARD_ROUTES.root;
  const next = await resolveDashboardPathForRequest(pathname, accessToken);
  return next ?? pathname;
}
