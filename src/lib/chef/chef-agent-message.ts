import type { MenuProductApiItem } from "@/lib/api";

export type ChefAgentRecommendationMode = "default" | "general" | "cart";

function cartSummary(cartProductIds: number[], catalog: MenuProductApiItem[]): string {
  const lines = cartProductIds.map((productId) => {
    const product = catalog.find((item) => item.productId === productId);
    return product ? `${product.name} (productId:${productId})` : `productId:${productId}`;
  });
  return lines.join(", ");
}

export function buildChefAgentUserMessage(
  userMessage: string,
  mode: ChefAgentRecommendationMode,
  cartProductIds: number[],
  catalog: MenuProductApiItem[],
): string {
  const trimmed = userMessage.trim();
  if (mode === "general") {
    return `[İstek: Genel menü önerisi. Sepete bakma; menüde popüler ve dengeli seçenekler ve mümkünse hazır menü kombinasyonları sun.]\n\n${trimmed || "Genel öneri ver."}`;
  }
  if (mode === "cart" && cartProductIds.length > 0) {
    return `[Müşteri sepeti: ${cartSummary(cartProductIds, catalog)}. Sepettekilere uyumlu tamamlayıcı ürünler öner; sepette olanları tekrarlama. Gerekirse menü kombinasyonu da öner.]\n\n${trimmed || "Sepetime uygun öneriler ver."}`;
  }
  if (cartProductIds.length > 0) {
    return `[Müşteri sepeti: ${cartSummary(cartProductIds, catalog)}. Yanıtında sepeti dikkate al.]\n\n${trimmed}`;
  }
  return trimmed;
}
