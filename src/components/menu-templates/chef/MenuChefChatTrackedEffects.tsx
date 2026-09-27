"use client";

import { useEffect } from "react";

import { useChefChatAnalyticsOptional } from "./ChefChatAnalyticsContext";

export function MenuChefChatTrackedEffects({
  open,
  conversationId,
}: {
  open: boolean;
  conversationId?: string;
}) {
  const analytics = useChefChatAnalyticsOptional();

  useEffect(() => {
    analytics?.setConversationId(conversationId);
  }, [analytics, conversationId]);

  useEffect(() => {
    if (!open) return;
    analytics?.trackChatOpen();
  }, [open, analytics]);

  return null;
}
