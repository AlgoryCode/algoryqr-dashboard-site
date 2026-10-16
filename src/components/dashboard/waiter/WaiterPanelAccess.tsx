"use client";

import { useRequireScope } from "@/components/auth/RequireScope";

export function useWaiterPanelAccess() {
  const { allowed, isLoading, isError, retry } = useRequireScope("WAITER_PANEL_OWNER");
  return {
    accessLoading: isLoading,
    accessError: isError,
    retryAccess: retry,
    canUseWaiterPanel: allowed,
  };
}
