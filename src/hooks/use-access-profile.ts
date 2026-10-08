"use client";

import { useEffect } from "react";

import { loadPackageAccess } from "@/lib/load-package-access";
import { usePackageStore } from "@/stores/package-access-store";

export function useAccessProfile(enabled = true) {
  const profile = usePackageStore((state) => state.profile);
  const status = usePackageStore((state) => state.status);

  useEffect(() => {
    if (!enabled || status !== "idle") return;
    void loadPackageAccess();
  }, [enabled, status]);

  const pending = enabled && (status === "idle" || status === "loading");
  return {
    data: status === "ready" ? profile ?? undefined : undefined,
    isLoading: pending,
    isPending: pending,
    isSuccess: status === "ready",
    isError: false,
    status: status === "ready" ? ("success" as const) : ("pending" as const),
  };
}

export function invalidateAccessProfile() {
  return loadPackageAccess(true);
}
