"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  useChefChatAnalytics,
  type ChefChatAnalytics,
} from "@/hooks/use-chef-chat-analytics";

export const ChefChatAnalyticsContext = createContext<ChefChatAnalytics | null>(null);

export function ChefChatAnalyticsProvider({
  publicId,
  children,
}: {
  publicId: string;
  children: ReactNode;
}) {
  const analytics = useChefChatAnalytics(publicId);
  return (
    <ChefChatAnalyticsContext.Provider value={analytics}>{children}</ChefChatAnalyticsContext.Provider>
  );
}

export function useChefChatAnalyticsOptional() {
  return useContext(ChefChatAnalyticsContext);
}
