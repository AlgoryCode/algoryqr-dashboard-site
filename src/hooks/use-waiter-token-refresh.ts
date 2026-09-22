"use client";

import { useEffect, useRef, useState } from "react";

import { currentStaffApp, refreshWaiterSession, STAFF_APP_HEADER } from "@/lib/waiter-api";

const REFRESH_BUFFER_SECONDS = 30;

export function useWaiterTokenRefresh(accessTokenExpiresAt?: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [expFromApi, setExpFromApi] = useState<number | null>(null);
  const exp = accessTokenExpiresAt ?? expFromApi ?? undefined;

  useEffect(() => {
    if (accessTokenExpiresAt != null) return;
    let cancelled = false;
    const app = currentStaffApp();
    fetch("/api/waiter/auth/me", {
      credentials: "same-origin",
      headers: { Accept: "application/json", [STAFF_APP_HEADER]: app },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { accessTokenExpiresAt?: number } | null) => {
        if (!cancelled && data?.accessTokenExpiresAt != null) {
          setExpFromApi(data.accessTokenExpiresAt);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessTokenExpiresAt]);

  useEffect(() => {
    if (exp == null || exp <= 0) return;

    const now = Math.floor(Date.now() / 1000);
    const secondsUntilExp = exp - now;
    if (secondsUntilExp <= 0) return;

    const refreshInMs = Math.max(1000, (secondsUntilExp - REFRESH_BUFFER_SECONDS) * 1000);

    timeoutRef.current = setTimeout(() => {
      const app = currentStaffApp();
      void refreshWaiterSession(app).then((ok) => {
        if (ok) {
          void fetch("/api/waiter/auth/refresh", {
            method: "POST",
            credentials: "same-origin",
            headers: { [STAFF_APP_HEADER]: app },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { accessTokenExpiresAt?: number } | null) => {
              if (data?.accessTokenExpiresAt != null) {
                setExpFromApi(data.accessTokenExpiresAt);
              }
            })
            .catch(() => undefined);
        }
      });
    }, refreshInMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [exp]);
}
