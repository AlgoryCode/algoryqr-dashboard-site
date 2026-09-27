import { isPairingUserQuery } from "@/lib/chef/chef-user-query-intent";
import { isSpecificUserQuery } from "@/lib/chef/is-specific-user-query";

export type ChefRecommendationIntent = "general" | "pairing" | "complete_meal" | "specific";

export function inferRecommendationIntent(
  message: string,
  userQuery?: string,
): ChefRecommendationIntent {
  const text = message.toLocaleLowerCase("tr-TR");
  if (text.includes("[istek: genel menü önerisi") || text.includes("genel ürün önerisi")) {
    return "general";
  }
  if (isPairingUserQuery(userQuery)) return "pairing";
  if (isSpecificUserQuery(userQuery)) return "specific";
  if (text.includes("müşteri sepeti:") || text.includes("sepetime uygun")) return "complete_meal";
  if (text.includes("tamamlayıcı") || text.includes("uyumlu")) return "pairing";
  return "pairing";
}
