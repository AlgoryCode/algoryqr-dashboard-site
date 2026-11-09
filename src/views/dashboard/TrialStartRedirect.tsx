"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

/** Legacy `/deneme/baslat` — Ultimate deneme kaldırıldı; demo kaydına yönlendir. */
export default function TrialStartRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DASHBOARD_ROUTES.demoRegister);
  }, [router]);

  return null;
}
