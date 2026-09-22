"use client";

import { useQuery } from "@tanstack/react-query";

import { useMyProfile } from "@/hooks/use-my-profile";
import { isDemoAccountSession, type DemoAccountStatus } from "@/lib/demo-account";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

export function DemoModeBanner() {
  const profile = useMyProfile();
  const demo = useQuery({
    queryKey: ["demoAccount"],
    queryFn: fetchDemoAccountStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!isDemoAccountSession(profile.data?.email, demo.data)) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-sm text-foreground">
        <span className="font-semibold">Demo modu.</span>
        <span className="text-muted-foreground"> Paylaşımlı deneme hesabındasınız.</span>
      </p>
    </div>
  );
}

async function fetchDemoAccountStatus(): Promise<DemoAccountStatus> {
  const { data } = await getSiteSameOriginAxios().get<DemoAccountStatus>("/auth/demo-account");
  return data;
}
