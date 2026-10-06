import type { QueryClient } from "@tanstack/react-query";

import { loadPackageAccess } from "@/lib/load-package-access";
import { invalidateSubscription } from "@/hooks/use-subscription";
import { invalidateSubscriptionOverview } from "@/hooks/use-subscription-overview";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

export const ACCESS_REFRESHED_EVENT = "algoryqr:access-refreshed";

export async function refreshAccessAfterEntitlementChange(queryClient: QueryClient) {
  await getSiteSameOriginAxios().post("/auth/refresh");
  await Promise.all([
    loadPackageAccess(true),
    invalidateSubscription(queryClient),
    invalidateSubscriptionOverview(queryClient),
  ]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCESS_REFRESHED_EVENT));
  }
}
