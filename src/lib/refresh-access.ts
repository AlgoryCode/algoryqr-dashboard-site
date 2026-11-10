import type { QueryClient } from "@tanstack/react-query";

import { loadPackageAccess } from "@/lib/load-package-access";
import { invalidateSubscription } from "@/hooks/use-subscription";
import { invalidateSubscriptionOverview } from "@/hooks/use-subscription-overview";
import { refreshSession } from "@/lib/site-session";

export const ACCESS_REFRESHED_EVENT = "algoryqr:access-refreshed";

export async function refreshAccessAfterEntitlementChange(queryClient: QueryClient) {
  const refreshed = await refreshSession();
  if (!refreshed.ok) throw new Error("Oturum yenilenemedi");
  await Promise.all([
    loadPackageAccess(true),
    invalidateSubscription(queryClient),
    invalidateSubscriptionOverview(queryClient),
  ]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCESS_REFRESHED_EVENT));
  }
}
