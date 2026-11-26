"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { SHOP_PATH } from "@/lib/access-session-gate";

/** Legacy `/deneme/baslat`: there is no trial any more; a package is chosen and paid for in the shop. */
export default function TrialStartRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(SHOP_PATH);
  }, [router]);

  return null;
}
