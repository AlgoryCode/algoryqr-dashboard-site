"use client";

import { useCallback, useEffect, useRef } from "react";

import { crossSellAbVariant } from "@/lib/chef/chef-funnel-flags";
import {
  detectMenuDeviceType,
  getOrCreateMenuSessionId,
  nextMenuEventSequence,
  postMenuAnalyticsEvents,
  type MenuAnalyticsEventItem,
  type MenuAnalyticsMetadata,
} from "@/lib/menu-analytics";

export type ChefRecommendationRequestMode = "general" | "default" | "cart" | "badge";
export type ChefProductCardSource = "bubble" | "panel" | "cross_sell" | "menu_suggestion";
export type ChefCartOpenSource = "header" | "input" | "coach" | "cross_sell" | "complete_cta";

export type ChefChatAnalytics = {
  setConversationId: (id: string | undefined) => void;
  markCrossSellInteraction: () => void;
  shouldSuppressCartCoach: () => boolean;
  trackChatOpen: () => void;
  trackRecommendationRequest: (mode: ChefRecommendationRequestMode) => void;
  trackRecommendationShown: (productCount: number, menuSuggestionCount: number) => void;
  trackProductCardClick: (productId: number, source: ChefProductCardSource) => void;
  trackProductAdd: (productId: number, source: ChefProductCardSource | "gallery") => void;
  trackCrossSellShown: (anchorProductId: number, suggestedProductIds: number[]) => void;
  trackCrossSellClick: (productId: number) => void;
  trackCrossSellAdd: (productId: number) => void;
  trackCartOpen: (from: ChefCartOpenSource) => void;
  trackRecommendationFeedback: (
    feedback: "like" | "dislike",
    extras?: { turnId?: string; messageId?: string },
  ) => void;
};

export function useChefChatAnalytics(publicId: string | null | undefined): ChefChatAnalytics {
  const conversationIdRef = useRef<string | undefined>(undefined);
  const suppressCoachUntilRef = useRef(0);
  const sessionIdRef = useRef("");
  const deviceTypeRef = useRef(detectMenuDeviceType());
  const queueRef = useRef<MenuAnalyticsEventItem[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (!publicId || queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateMenuSessionId(publicId);
    }
    postMenuAnalyticsEvents(publicId, sessionIdRef.current, batch, deviceTypeRef.current);
  }, [publicId]);

  const enqueue = useCallback(
    (type: MenuAnalyticsEventItem["type"], extras: Partial<MenuAnalyticsEventItem> = {}) => {
      if (!publicId) return;
      if (!sessionIdRef.current) {
        sessionIdRef.current = getOrCreateMenuSessionId(publicId);
      }
      const metadata: MenuAnalyticsMetadata = {
        ...(extras.metadata ?? {}),
      };
      if (conversationIdRef.current) {
        metadata.conversationId = conversationIdRef.current;
      }
      queueRef.current.push({
        type,
        categoryId: extras.categoryId,
        productId: extras.productId,
        servesPeople: extras.servesPeople,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        sequence: nextMenuEventSequence(publicId),
        occurredAt: new Date().toISOString().slice(0, 19),
      });
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        flush();
        flushTimerRef.current = null;
      }, 250);
    },
    [flush, publicId],
  );

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flush();
    };
  }, [flush]);

  const setConversationId = useCallback((id: string | undefined) => {
    conversationIdRef.current = id;
  }, []);

  const markCrossSellInteraction = useCallback(() => {
    suppressCoachUntilRef.current = Date.now() + 5_000;
  }, []);

  const shouldSuppressCartCoach = useCallback(
    () => Date.now() < suppressCoachUntilRef.current,
    [],
  );

  return {
    setConversationId,
    markCrossSellInteraction,
    shouldSuppressCartCoach,
    trackChatOpen: () => enqueue("CHEF_CHAT_OPEN"),
    trackRecommendationRequest: (mode) =>
      enqueue("CHEF_RECOMMENDATION_REQUEST", { metadata: { mode } }),
    trackRecommendationShown: (productCount, menuSuggestionCount) =>
      enqueue("CHEF_RECOMMENDATION_SHOWN", {
        metadata: { productCount, menuSuggestionCount },
      }),
    trackProductCardClick: (productId, source) =>
      enqueue("CHEF_PRODUCT_CARD_CLICK", { productId, metadata: { source } }),
    trackProductAdd: (productId, source) =>
      enqueue("CHEF_PRODUCT_ADD", { productId, metadata: { source } }),
    trackCrossSellShown: (anchorProductId, suggestedProductIds) =>
      enqueue("CHEF_CROSS_SELL_SHOWN", {
        productId: anchorProductId,
        metadata: {
          suggestedProductIds: suggestedProductIds.join(","),
          crossSellVariant: crossSellAbVariant(),
        },
      }),
    trackCrossSellClick: (productId) =>
      enqueue("CHEF_CROSS_SELL_CLICK", { productId }),
    trackCrossSellAdd: (productId) =>
      enqueue("CHEF_CROSS_SELL_ADD", { productId }),
    trackCartOpen: (from) => enqueue("CHEF_CART_OPEN", { metadata: { from } }),
    trackRecommendationFeedback: (feedback, extras) =>
      enqueue("CHEF_RECOMMENDATION_FEEDBACK", {
        metadata: {
          feedback,
          ...(extras?.turnId ? { turnId: extras.turnId } : {}),
          ...(extras?.messageId ? { messageId: extras.messageId } : {}),
        },
      }),
  };
}
