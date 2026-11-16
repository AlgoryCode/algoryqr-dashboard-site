"use client";

import { useMemo } from "react";

import { useSessionContext } from "@/hooks/use-session-context";
import { useActivePurchase } from "@/hooks/use-subscription";
import {
  getTrialReminderInfo,
  getTrialReminderInfoFromSession,
  type TrialReminderInfo,
} from "@/lib/trial-reminder";

export function useTrialReminder(): {
  info: TrialReminderInfo | null;
  isLoading: boolean;
} {
  const session = useSessionContext();
  const activePurchase = useActivePurchase();
  const info = useMemo(
    () => getTrialReminderInfoFromSession(session.data) ?? getTrialReminderInfo(activePurchase.data),
    [session.data, activePurchase.data],
  );

  return {
    info,
    isLoading: session.isLoading || activePurchase.isLoading,
  };
}
