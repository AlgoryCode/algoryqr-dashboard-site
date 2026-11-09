"use client";

import { useMemo } from "react";

import { useActivePurchase } from "@/hooks/use-subscription";
import { getTrialReminderInfo, type TrialReminderInfo } from "@/lib/trial-reminder";

export function useTrialReminder(): {
  info: TrialReminderInfo | null;
  isLoading: boolean;
} {
  const activePurchase = useActivePurchase();
  const info = useMemo(() => getTrialReminderInfo(activePurchase.data), [activePurchase.data]);

  return {
    info,
    isLoading: activePurchase.isLoading,
  };
}
