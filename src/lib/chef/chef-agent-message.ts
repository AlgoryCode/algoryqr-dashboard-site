import type { MenuProductApiItem } from "@/lib/api";

export type ChefAgentRecommendationMode = "default" | "general" | "cart";

function cartSummary(cartProductIds: number[], catalog: MenuProductApiItem[]): string {
  const lines = cartProductIds.map((productId) => {
    const product = catalog.find((item) => item.productId === productId);
    return product ? `${product.name} (productId:${productId})` : `productId:${productId}`;
  });
  return lines.join(", ");
}

/**
 * Kısa host notu. Misafir cümlesi burada yok — ajan `userQuery` + kendi system prompt’unu kullanır.
 */
export function buildChefAgentContextMessage(
  mode: ChefAgentRecommendationMode,
  cartProductIds: number[],
  catalog: MenuProductApiItem[],
  _userQuery?: string,
): string {
  const lines: string[] = [
    "[Host: Misafir isteği `userQuery` alanındadır. Anlamı katalog satırlarından çıkar; productIds boş olmasın menüde uyum varsa.]",
  ];

  if (mode === "general") {
    lines.push("[Mod: genel öneri. Sepete bakma; 2–4 çeşitli ürün. Menü paketi önerme.]");
  } else if (mode === "cart" && cartProductIds.length > 0) {
    lines.push(
      `[Sepet: ${cartSummary(cartProductIds, catalog)}. Eksik kurs için tek ürün öner; sepettekileri tekrarlama.]`,
    );
  } else if (cartProductIds.length > 0) {
    lines.push(`[Sepet: ${cartSummary(cartProductIds, catalog)}. Sepettekileri tekrarlama.]`);
  }

  return lines.join("\n");
}

/** @deprecated `buildChefAgentContextMessage` + ayrı `userQuery` kullanın. */
export function buildChefAgentUserMessage(
  userMessage: string,
  mode: ChefAgentRecommendationMode,
  cartProductIds: number[],
  catalog: MenuProductApiItem[],
): string {
  const context = buildChefAgentContextMessage(mode, cartProductIds, catalog);
  const trimmed = userMessage.trim();
  if (!trimmed) return context;
  return `${context}\n\n${trimmed}`;
}
