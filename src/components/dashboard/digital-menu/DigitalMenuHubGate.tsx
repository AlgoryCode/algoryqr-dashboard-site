"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";

import { DigitalMenuPaywall } from "./DigitalMenuPaywall";

export function DigitalMenuHubGate({ children }: { children: ReactNode }) {
  const { accessLoading, accessError, retryAccess, canUseDigitalMenu } = useDigitalMenuAccess();

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (accessError) {
    return (
      <AccessLoadError onRetry={() => void retryAccess()} />
    );
  }

  if (!canUseDigitalMenu) {
    return <DigitalMenuPaywall />;
  }

  return children;
}
