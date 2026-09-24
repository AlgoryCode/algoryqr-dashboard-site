import { cookies } from "next/headers";

import { API_BASE_URL } from "@/lib/config";
import { parseSessionContext, type SessionContext } from "@/lib/session-context";

const ACCESS_CONTEXT_TIMEOUT_MS = 10_000;

export async function fetchSessionContextWithToken(
  accessToken: string,
): Promise<SessionContext | null> {
  if (!API_BASE_URL || !accessToken) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACCESS_CONTEXT_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/access/context`, {
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
    return parseSessionContext(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDashboardSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get("accessToken")?.value?.trim() ||
    cookieStore.get("algory_access_token")?.value?.trim() ||
    null;
  if (!accessToken) return null;
  return fetchSessionContextWithToken(accessToken);
}
