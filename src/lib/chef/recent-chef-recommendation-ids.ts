import type { ChefChatMessage } from "@/lib/chef/chef-chat-session";

/** Product ids from the last N assistant recommendation bubbles (session dedup). */
export function recentChefRecommendationProductIds(
  messages: ChefChatMessage[],
  maxBubbles = 3,
): number[] {
  const productIdGroups: number[][] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant" || !msg.products?.length) continue;
    if (msg.id === "welcome" || msg.id.startsWith("coach-")) continue;

    productIdGroups.push(msg.products.map((product) => product.productId));
    if (productIdGroups.length >= maxBubbles) break;
  }

  return [...new Set(productIdGroups.flat())];
}
