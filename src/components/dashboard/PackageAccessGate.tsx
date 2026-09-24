"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAccessSession } from "@/hooks/use-commerce";
import {
  destinationForDecision,
  isPurchaseAllowlistedPath,
  isStartAllowlistedPath,
} from "@/lib/access-session-gate";
import { ACCESS_REFRESHED_EVENT } from "@/lib/refresh-access";

export default function PackageAccessGate() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAccessSession();

  useEffect(() => {
    const onAccessRefreshed = () => {
      router.refresh();
    };
    window.addEventListener(ACCESS_REFRESHED_EVENT, onAccessRefreshed);
    return () => window.removeEventListener(ACCESS_REFRESHED_EVENT, onAccessRefreshed);
  }, [router]);

  useEffect(() => {
    if (session.isLoading || session.isError) return;
    const decision = session.data?.decision;
    if (!decision) return;
    if (decision === "ALLOW") return;
    if (decision === "START_PACKAGE" && isStartAllowlistedPath(pathname)) return;
    if ((decision === "REQUIRE_PURCHASE" || decision === "REQUIRE_PAYMENT") && isPurchaseAllowlistedPath(pathname)) {
      return;
    }
    const next = destinationForDecision(decision, pathname);
    if (next !== pathname) {
      router.replace(next);
    }
  }, [pathname, router, session.data?.decision, session.isError, session.isLoading]);

  return null;
}
