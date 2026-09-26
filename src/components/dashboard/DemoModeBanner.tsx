"use client";

import { useQuery } from "@tanstack/react-query";

import { useMyProfile } from "@/hooks/use-my-profile";
import {
  demoDaysRemaining,
  isDemoAccountSession,
  type DemoAccountStatus,
} from "@/lib/demo-account";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

export function DemoModeBanner() {
  const profile = useMyProfile();
  const demo = useQuery({
    queryKey: ["demoAccount"],
    queryFn: fetchDemoAccountStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const sharedDemo = isDemoAccountSession(profile.data?.email, {
    enabled: demo.data?.enabled,
    email: demo.data?.email,
  });
  const personalDemo = demo.data?.demo === true && demo.data.active !== false;

  if (!sharedDemo && !personalDemo) {
    return null;
  }

  const daysLeft = personalDemo ? demoDaysRemaining(demo.data?.expiresAt) : null;
  const subtitle = personalDemo
    ? daysLeft == null
      ? "15 günlük Ultimate demo hesabınız aktif."
      : daysLeft === 0
        ? "Demo süreniz bugün sona eriyor."
        : `15 günlük Ultimate demo hesabınız · ${daysLeft} gün kaldı`
    : "Paylaşımlı deneme hesabındasınız.";

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-sm text-foreground">
        <span className="font-semibold">Demo modu.</span>
        <span className="text-muted-foreground"> {subtitle}</span>
        {personalDemo && demo.data?.username ? (
          <span className="text-muted-foreground"> (@{demo.data.username})</span>
        ) : null}
      </p>
    </div>
  );
}

async function fetchDemoAccountStatus(): Promise<DemoAccountStatus> {
  const [shared, personal] = await Promise.all([
    getSiteSameOriginAxios()
      .get<DemoAccountStatus>("/auth/demo-account")
      .then((response) => response.data)
      .catch(() => ({ enabled: false } as DemoAccountStatus)),
    getSiteSameOriginAxios()
      .get<DemoAccountStatus>("/auth/demo/status")
      .then((response) => response.data)
      .catch(() => ({ demo: false } as DemoAccountStatus)),
  ]);
  return { ...shared, ...personal };
}
