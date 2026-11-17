"use client";

import { onEntitlementVersionChange, resetEntitlementVersion } from "@/lib/entitlement-version";
import { recordFlow } from "@/lib/flow-log";
import { readPackageSnapshot } from "@/lib/package-access";
import { isServerStatus } from "@/lib/server-failure";
import { usePackageStore, type PackageAccessStatus } from "@/stores/package-access-store";
import type { AccessProfile } from "@/lib/auth-user";

let generation = 0;
let inflight: Promise<AccessProfile | null> | null = null;
let loadedAt = 0;
let watching = false;

/** A plan can change without this tab doing anything (renewal, expiry, an admin, another device). */
export const PACKAGE_ACCESS_MAX_AGE_MS = 5 * 60 * 1000;

export function loadPackageAccess(force = false): Promise<AccessProfile | null> {
  const current = usePackageStore.getState();
  if (!force && (current.status === "ready" || current.status === "guest")) {
    return Promise.resolve(current.profile);
  }
  if (!force && inflight) return inflight;

  const ticket = ++generation;
  if (current.status !== "ready") {
    usePackageStore.getState().setStatus("loading");
  }
  const run = fetchPackageAccess()
    .then((result) => {
      if (ticket !== generation) return usePackageStore.getState().profile;
      loadedAt = Date.now();
      if (result.status === "ready" && result.snapshot) {
        usePackageStore.getState().setSnapshot(result.snapshot);
        return result.snapshot.profile;
      }
      usePackageStore.setState({ profile: null, periodEnd: null, entitlements: [], status: result.status });
      return null;
    })
    .catch(() => {
      if (ticket !== generation) return usePackageStore.getState().profile;
      usePackageStore.setState({ profile: null, periodEnd: null, entitlements: [], status: "error" });
      return null;
    });

  inflight = run.finally(() => {
    if (inflight === run) inflight = null;
  });
  return inflight;
}

/**
 * Reloads the plan when the tab comes back into view or stays open past the max age, so a plan
 * that renewed, lapsed or changed elsewhere shows up without a page reload. Safe to call often.
 */
export function watchPackageAccess(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  // The backend says the plan changed: reload now instead of waiting for the max age.
  onEntitlementVersionChange(() => {
    const status = usePackageStore.getState().status;
    if (status === "ready" || status === "error") void loadPackageAccess(true);
  });
  const refreshIfStale = () => {
    if (document.visibilityState !== "visible") return;
    const status = usePackageStore.getState().status;
    if (status !== "ready" && status !== "error") return;
    if (Date.now() - loadedAt < PACKAGE_ACCESS_MAX_AGE_MS) return;
    void loadPackageAccess(true);
  };
  document.addEventListener("visibilitychange", refreshIfStale);
  window.addEventListener("focus", refreshIfStale);
  window.setInterval(refreshIfStale, PACKAGE_ACCESS_MAX_AGE_MS);
}

export function clearPackageAccess() {
  resetEntitlementVersion();
  generation += 1;
  inflight = null;
  loadedAt = 0;
  usePackageStore.getState().clear();
}

type FetchResult = {
  status: Extract<PackageAccessStatus, "ready" | "guest" | "error">;
  snapshot: ReturnType<typeof readPackageSnapshot>;
};

async function fetchPackageAccess(): Promise<FetchResult> {
  const path = "/api/access/context";
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    recordFlow({
      scope: "entitlement",
      method: "GET",
      path,
      status: response.status,
      summary: "Paket profili alınamadı",
    });
    return { status: isServerStatus(response.status) ? "error" : "guest", snapshot: null };
  }
  const snapshot = readPackageSnapshot(await response.json());
  if (!snapshot) {
    recordFlow({
      scope: "entitlement",
      method: "GET",
      path,
      status: response.status,
      anomaly: "PAKET_OKUNAMADI",
      summary: "Paket cevabı profili üretmedi",
    });
    return { status: "error", snapshot: null };
  }
  const products = snapshot.profile.products.join(", ");
  recordFlow({
    scope: "entitlement",
    method: "GET",
    path,
    status: response.status,
    anomaly: snapshot.profile.activePackage ? null : "PAKET_YOK",
    summary: snapshot.profile.activePackage
      ? `Paket ${snapshot.profile.activePackage}. Ürünler: ${products || "yok"}`
      : "Aktif paket yok",
  });
  return { status: "ready", snapshot };
}
