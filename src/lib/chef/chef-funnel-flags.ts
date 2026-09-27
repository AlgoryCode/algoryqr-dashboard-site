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
