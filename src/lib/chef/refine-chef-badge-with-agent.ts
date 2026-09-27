import { extractChefProductIds } from "@/lib/chef/extract-chef-product-ids";
import { callChefAgentChat } from "@/lib/chef/call-chef-agent-chat";
import type { MenuProductApiItem } from "@/lib/api";

const HYBRID_MIN_POOL = 7;

/**
 * Rozet havuzundan agent ile alt küme seçimi (B5 hybrid).
 */
export async function refineChefBadgeProductsWithAgent(
  publicId: string,
  badgeLabel: string,
  pool: MenuProductApiItem[],
  locale = "tr",
): Promise<number[] | null> {
  if (pool.length < HYBRID_MIN_POOL) return null;

  const candidateProductIds = pool.map((product) => product.productId);
  const message = `[Rozet: "${badgeLabel}". Yalnızca candidateProductIds içinden en uygun en fazla 6 ürün seç. Menü paketi önerme.]\n${badgeLabel} için seçim yap.`;

  const upstream = await callChefAgentChat({
    publicId,
    message,
    products: pool,
    candidateProductIds,
    recommendationIntent: "general",
    locale,
  });

  if (upstream.status >= 400) return null;
  const ids = extractChefProductIds({
    productIds: upstream.data.productIds,
    products: upstream.data.products,
  });
  return ids.length > 0 ? ids : null;
}
