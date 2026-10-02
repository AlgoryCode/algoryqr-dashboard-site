"use client";

import { useEffect, useRef } from "react";

import type { ChefChatMessage } from "@/lib/chef/chef-chat-session";
import {
  buildCartCoachMessage,
  buildUpsellBadges,
  cartCourseRoles,
  missingCourseRoles,
} from "@/lib/chef/chef-cart-coach";
import { pickCrossSellProducts } from "@/lib/chef/pick-cross-sell-products";
import type { MenuProductApiItem } from "@/lib/api";

import type { useOrderingOptional } from "../shared";

import { useChefChatAnalyticsOptional } from "./ChefChatAnalyticsContext";

type Ordering = NonNullable<ReturnType<typeof useOrderingOptional>>;

export function MenuChefCartCoachEffect({
  open,
  ordering,
  chefMenuProducts,
  setMessages,
}: {
  open: boolean;
  ordering: Ordering | null | undefined;
  chefMenuProducts: MenuProductApiItem[];
  setMessages: React.Dispatch<React.SetStateAction<ChefChatMessage[]>>;
}) {
  const lastCoachCartSigRef = useRef("");
  const analytics = useChefChatAnalyticsOptional();

  useEffect(() => {
    if (!open || !ordering || ordering.localItems.length === 0 || chefMenuProducts.length === 0) {
      return;
    }
    if (analytics?.shouldSuppressCartCoach()) {
      return;
    }
    const productIds = ordering.localItems.map((item) => item.productId);
    const sig = productIds.join(",");
    if (sig === lastCoachCartSigRef.current) return;
    lastCoachCartSigRef.current = sig;

    const present = cartCourseRoles(productIds, chefMenuProducts);
    const missing = missingCourseRoles(present);
    const anchorProductId = productIds[productIds.length - 1];
    const anchorProduct = chefMenuProducts.find((product) => product.productId === anchorProductId);
    const suggestedProducts =
      missing.length > 0 && anchorProduct
        ? pickCrossSellProducts({
            anchorProductId,
            catalog: chefMenuProducts,
            cartProductIds: productIds,
            maxItems: 2,
          })
        : [];
    const text = buildCartCoachMessage(missing, {
      anchorName: anchorProduct?.name,
      suggestedProductNames: suggestedProducts.map((product) => product.name),
    });
    const badges = suggestedProducts.length > 0 ? [] : buildUpsellBadges(missing);
    if (!text) {
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith("coach-")));
      return;
    }

    setMessages((prev) => {
      const coachId = `coach-${sig}`;
      const withoutOlderCoach = prev.filter((msg) => !msg.id.startsWith("coach-"));
      if (withoutOlderCoach.some((msg) => msg.id === coachId)) return prev;
      return [
        ...withoutOlderCoach,
        {
          id: coachId,
          role: "assistant",
          text,
          products: suggestedProducts.length > 0 ? suggestedProducts : undefined,
          upsellBadges: badges.length > 0 ? badges : undefined,
          coachActions:
            missing.length === 0 ? { openCart: true, completeOrder: true } : undefined,
        },
      ];
    });
  }, [open, ordering, ordering?.localItems, chefMenuProducts, analytics, setMessages]);

  return null;
}
