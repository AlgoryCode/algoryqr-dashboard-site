/** Cross-sell strip after add-to-cart in chef product gallery. */
export function isChefCrossSellEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_CHEF_CROSS_SELL_ENABLED;
  if (value === "0" || value === "false") return false;
  return true;
}

/** Max cross-sell cards (1 vs 2 A/B via env). */
export function chefCrossSellMaxItems(): number {
  const raw = process.env.NEXT_PUBLIC_CHEF_CROSS_SELL_MAX_ITEMS;
  const parsed = raw ? Number.parseInt(raw, 10) : 2;
  if (parsed === 1) return 1;
  return 2;
}

export function crossSellAbVariant(): "one" | "two" {
  return chefCrossSellMaxItems() === 1 ? "one" : "two";
}

/** Compact card quick-add without opening gallery. */
export function isChefCardQuickAddEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_CHEF_CARD_QUICK_ADD;
  if (value === "0" || value === "false") return false;
  return true;
}

/** Stream assistant reply tokens via BFF SSE. */
export function isChefSearchStreamingEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_CHEF_SEARCH_STREAMING;
  if (value === "0" || value === "false") return false;
  return true;
}

/** Badge pool refined by qr-agent when pool is large. */
export function isChefBadgeHybridAgentEnabled(): boolean {
  const value = process.env.CHEF_BADGE_HYBRID_AGENT;
  return value === "1" || value === "true";
}
