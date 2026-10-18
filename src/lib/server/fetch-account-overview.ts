import axios from "axios";

import type { AccountOverview } from "@/lib/account-overview";
import { API_BASE_URL } from "@/lib/config";

function authHeaders(
  accessToken: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    ...extra,
  };
}

/** Aggregated account snapshot from qr-service `GET /account/overview`. */
export async function fetchAccountOverview(
  accessToken: string,
  clientHeaders?: Record<string, string>,
): Promise<AccountOverview> {
  const upstream = await axios.get<AccountOverview>(`${API_BASE_URL}/account/overview`, {
    headers: authHeaders(accessToken, clientHeaders),
    validateStatus: () => true,
    timeout: 25_000,
  });

  if (upstream.status >= 200 && upstream.status < 300 && upstream.data) {
    return upstream.data;
  }

  if (upstream.data && typeof upstream.data === "object" && "profile" in upstream.data) {
    return upstream.data as AccountOverview;
  }

  const message =
    typeof upstream.data === "object" && upstream.data != null && "message" in upstream.data
      ? String((upstream.data as { message?: string }).message ?? "")
      : "";
  throw new Error(message || `Account overview failed (${upstream.status})`);
}
