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

const USER_QUERY_HINT =
  "[Kullanıcı isteği `userQuery` alanında aynen verilmiştir; yalnızca `products` kataloğundan uygun productId seç.]";

/**
 * Agent `message` alanı: bağlam + kurallar. Kullanıcı cümlesi `userQuery` ile ayrı gönderilir.
 */
export function buildChefAgentContextMessage(
  mode: ChefAgentRecommendationMode,
  cartProductIds: number[],
  catalog: MenuProductApiItem[],
): string {
  const lines: string[] = [USER_QUERY_HINT, OUTPUT_RULES];

  if (mode === "general") {
    lines.unshift(
      "[İstek: Genel ürün önerisi. Sepete bakma; 2–4 çeşitli tek ürün öner. Menü paketi/kombinasyon önerme.]",
    );
  } else if (mode === "cart" && cartProductIds.length > 0) {
    lines.unshift(
      `[Müşteri sepeti: ${cartSummary(cartProductIds, catalog)}. Eksik kurs için tek tek ürün öner (yemek/içecek/tatlı); sepette olanları tekrarlama. Menü paketi önerme.]`,
    );
  } else if (cartProductIds.length > 0) {
    lines.unshift(
      `[Müşteri sepeti: ${cartSummary(cartProductIds, catalog)}. Yanıtında sepeti dikkate al.]`,
    );
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
