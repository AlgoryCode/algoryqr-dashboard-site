"use client";

import { getStoredUser } from "@/lib/api/storage";
import { recordFlow } from "@/lib/flow-log";
import { readPackageAccess } from "@/lib/package-access";
import { usePackageStore, type PackageAccessStatus } from "@/stores/package-access-store";
import type { AccessProfile } from "@/lib/auth-user";

let generation = 0;
let inflight: Promise<AccessProfile | null> | null = null;

export function loadPackageAccess(force = false, userId?: number | null): Promise<AccessProfile | null> {
  const current = usePackageStore.getState();
  if (!force && (current.status === "ready" || current.status === "guest")) {
    return Promise.resolve(current.profile);
  }
  if (!force && inflight) return inflight;

  const ticket = ++generation;
  usePackageStore.getState().setStatus("loading");
  const run = fetchPackageAccess(userId)
    .then((result) => {
      if (ticket !== generation) return usePackageStore.getState().profile;
      if (result.status === "ready" && result.profile) {
        usePackageStore.getState().setProfile(result.profile);
        return result.profile;
      }
      usePackageStore.setState({ profile: null, status: result.status });
      return null;
    })
    .catch(() => {
      if (ticket !== generation) return usePackageStore.getState().profile;
      usePackageStore.setState({ profile: null, status: "guest" });
      return null;
    });

  inflight = run.finally(() => {
    if (inflight === run) inflight = null;
  });
  return inflight;
}

export function clearPackageAccess() {
  generation += 1;
  inflight = null;
  usePackageStore.getState().clear();
}

type FetchResult = {
  status: Extract<PackageAccessStatus, "ready" | "guest">;
  profile: AccessProfile | null;
};

async function fetchPackageAccess(userId?: number | null): Promise<FetchResult> {
  const resolved = userId != null && userId > 0 ? userId : storedUserId();
  const path = resolved != null ? `/api/users/${resolved}/package` : "/api/access/context";
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    recordFlow({
      scope: "entitlement",
      method: "GET",
      path,
      status: response.status,
      summary: "Paket profili alınamadı",
    });
    return { status: "guest", profile: null };
  }
  const profile = readPackageAccess(await response.json());
  if (!profile) {
    recordFlow({
      scope: "entitlement",
      method: "GET",
      path,
      status: response.status,
      anomaly: "PAKET_OKUNAMADI",
      summary: "Paket cevabı profili üretmedi",
    });
    return { status: "guest", profile: null };
  }
  const products = profile.products.join(", ");
  recordFlow({
    scope: "entitlement",
    method: "GET",
    path,
    status: response.status,
    anomaly: profile.activePackage ? null : "PAKET_YOK",
    summary: profile.activePackage
      ? `Paket ${profile.activePackage}. Ürünler: ${products || "yok"}`
      : "Aktif paket yok",
  });
  return { status: "ready", profile };
}

function storedUserId(): number | null {
  const raw = getStoredUser()?.id;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
