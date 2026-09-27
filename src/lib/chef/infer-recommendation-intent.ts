import { isSpecificProductQuery } from "./filter-chef-products-by-user-query";

export type ChefRecommendationIntent = "general" | "pairing" | "complete_meal" | "specific";

export function inferRecommendationIntent(message: string): ChefRecommendationIntent {
  const text = message.toLocaleLowerCase("tr-TR");
  if (text.includes("[istek: genel menü önerisi") || text.includes("genel ürün önerisi")) {
    return "general";
  }
  if (isSpecificProductQuery(message)) return "specific";
  if (text.includes("müşteri sepeti:") || text.includes("sepetime uygun")) return "complete_meal";
  if (text.includes("tamamlayıcı") || text.includes("uyumlu")) return "pairing";
  return "pairing";
}
