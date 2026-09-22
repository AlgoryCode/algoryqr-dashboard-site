"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export default function WelcomeOnboardingView() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DASHBOARD_ROUTES.overview);
  }, [router]);

  return <DashboardLoadingState label="Yönlendiriliyor…" />;
}
