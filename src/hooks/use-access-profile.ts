"use client";

import { useEffect } from "react";

import { loadPackageAccess, watchPackageAccess } from "@/lib/load-package-access";
import { usePackageStore } from "@/stores/package-access-store";

export function useAccessProfile(enabled = true) {
  const profile = usePackageStore((state) => state.profile);
  const status = usePackageStore((state) => state.status);

  useEffect(() => {
    if (!enabled) return;
    watchPackageAccess();
    if (status !== "idle") return;
    void loadPackageAccess();
  }, [enabled, status]);

  const pending = enabled && (status === "idle" || status === "loading");
  const failed = enabled && status === "error";
  return {
    data: status === "ready" ? profile ?? undefined : undefined,
    isLoading: pending,
    isPending: pending,
    isSuccess: status === "ready",
    isError: failed,
    status: status === "ready" ? ("success" as const) : failed ? ("error" as const) : ("pending" as const),
    refetch: () => loadPackageAccess(true),
  };
}

export function invalidateAccessProfile() {
  return loadPackageAccess(true);
}
