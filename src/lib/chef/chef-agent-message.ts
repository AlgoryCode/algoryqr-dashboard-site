import type { MenuProductApiItem } from "@/lib/api";

export type ChefAgentRecommendationMode = "default" | "general" | "cart";

function cartSummary(cartProductIds: number[], catalog: MenuProductApiItem[]): string {
  const lines = cartProductIds.map((productId) => {
    const product = catalog.find((item) => item.productId === productId);
    return product ? `${product.name} (productId:${productId})` : `productId:${productId}`;
  });
  return lines.join(", ");
}

const OUTPUT_RULES =
  "[Yanıt kuralları: Ürün listesi veya fiyat dökümü yazma; en fazla 2 kısa Türkçe cümle. Ürünler UI kartlarında gösterilecek. En fazla 6 productId seç.]";

export function buildChefAgentUserMessage(
  userMessage: string,
  mode: ChefAgentRecommendationMode,
  cartProductIds: number[],
  catalog: MenuProductApiItem[],
): string {
  const trimmed = userMessage.trim();
  if (mode === "general") {
    return `[İstek: Genel menü önerisi. Sepete bakma; 2–4 çeşitli ürün ve menü paketi için uygun anchor seç.]\n${OUTPUT_RULES}\n\n${trimmed || "Genel öneri ver."}`;
  }
  if (mode === "cart" && cartProductIds.length > 0) {
    return `[Müşteri sepeti: ${cartSummary(cartProductIds, catalog)}. Eksik kursu tamamla (yemek/içecek/tatlı); sepette olanları tekrarlama.]\n${OUTPUT_RULES}\n\n${trimmed || "Sepetime uygun öneriler ver."}`;
  }
  if (cartProductIds.length > 0) {
    return `[Müşteri sepeti: ${cartSummary(cartProductIds, catalog)}. Yanıtında sepeti dikkate al.]\n${OUTPUT_RULES}\n\n${trimmed}`;
  }
  return `${OUTPUT_RULES}\n\n${trimmed}`;
}
