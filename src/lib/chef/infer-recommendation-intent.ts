export type ChefRecommendationIntent = "general" | "pairing" | "complete_meal";

export function inferRecommendationIntent(message: string): ChefRecommendationIntent {
  const text = message.toLocaleLowerCase("tr-TR");
  if (text.includes("[istek: genel menü önerisi")) return "general";
  if (text.includes("müşteri sepeti:") || text.includes("sepetime uygun")) return "complete_meal";
  if (text.includes("tamamlayıcı") || text.includes("uyumlu")) return "pairing";
  return "pairing";
}
