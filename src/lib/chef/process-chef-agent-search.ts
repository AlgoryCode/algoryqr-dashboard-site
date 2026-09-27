import { alignChefRecommendationsWithUserQuery } from "@/lib/chef/align-chef-agent-recommendations";
import {
  isPairingUserQuery,
  shouldShowFullCourseCatalog,
} from "@/lib/chef/chef-user-query-intent";
import {
  pairingFallbackReply,
  resolveChefPairingRecommendations,
  sanitizeChefAgentReply,
} from "@/lib/chef/chef-pairing-recommendations";
import { expandChefRecommendationsForUserQuery } from "@/lib/chef/expand-chef-recommendations-for-intent";
import { mergeReplyWithPersuasion } from "@/lib/chef/chef-recommendation-copy";
import { extractChefProductIds } from "@/lib/chef/extract-chef-product-ids";
import { filterChefProductsByDietMessage } from "@/lib/chef/filter-chef-products-by-diet-message";
import {
  filterChefProductsByPriceBand,
  inferChefPriceBandFromMessage,
} from "@/lib/chef/infer-chef-price-band";
import { isSpecificUserQuery } from "@/lib/chef/is-specific-user-query";
import { filterChefProductIds, rankChefRecommendations } from "@/lib/chef/rank-chef-recommendations";
import { hydrateChefProductsForPublicMenu } from "@/lib/chef/hydrate-chef-products-server";
import type { ChefAgentChatResponse } from "@/lib/chef/call-chef-agent-chat";
import type { MenuProductApiItem } from "@/lib/api";

export type ProcessChefSearchInput = {
  publicId: string;
  message: string;
  agent: ChefAgentChatResponse;
  menuProducts: MenuProductApiItem[];
  cartProductIds: number[];
  recentlyShownProductIds: number[];
  priorOrderProductIds: number[];
  userQuery?: string;
};

export type ProcessChefSearchResult = {
  reply: string;
  conversationId?: string;
  turnId?: string;
  productIds: number[];
  products: Awaited<ReturnType<typeof hydrateChefProductsForPublicMenu>>["products"];
  searchComplete?: unknown;
};

export async function processChefAgentSearch(
  input: ProcessChefSearchInput,
): Promise<ProcessChefSearchResult> {
  const idSource = {
    productIds: input.agent.productIds,
    products: input.agent.products,
    searchComplete: input.agent.searchComplete,
  };
  const rawProductIds = extractChefProductIds(idSource);
  const productIds = filterChefProductIds(rawProductIds, input.cartProductIds);
  const { products: hydrated } = await hydrateChefProductsForPublicMenu(input.publicId, {
    ...idSource,
    productIds,
    catalog: input.menuProducts,
  });

  const priceContext = input.userQuery?.trim() || input.message;
  const priceBand = inferChefPriceBandFromMessage(priceContext);
  const priceFiltered = filterChefProductsByPriceBand(hydrated, priceBand);
  const dietFiltered = filterChefProductsByDietMessage(
    priceFiltered,
    input.menuProducts,
    input.userQuery?.trim() ?? "",
  );
  const aligned = alignChefRecommendationsWithUserQuery({
    agentProducts: dietFiltered,
    catalog: input.menuProducts,
    userQuery: input.userQuery,
    cartProductIds: input.cartProductIds,
  });

  const pairingQuery = isPairingUserQuery(input.userQuery);
  let pairingAnchorName: string | undefined;
  let expanded = aligned;
  if (pairingQuery && input.userQuery?.trim()) {
    const pairing = resolveChefPairingRecommendations(
      aligned,
      input.menuProducts,
      input.userQuery,
      input.cartProductIds,
    );
    expanded = pairing.products;
    pairingAnchorName = pairing.anchorName;
  } else {
    expanded = expandChefRecommendationsForUserQuery(
      aligned,
      input.menuProducts,
      input.userQuery,
      input.cartProductIds,
    );
  }
  const specificQuery = isSpecificUserQuery(input.userQuery);
  const fullCourseBrowse = shouldShowFullCourseCatalog(input.userQuery);
  const products = rankChefRecommendations(
    expanded,
    input.menuProducts,
    input.cartProductIds,
    input.recentlyShownProductIds,
    input.priorOrderProductIds,
    {
      maxPerMainCategory: specificQuery || fullCourseBrowse ? 6 : undefined,
      excludeRecentlyShown: !fullCourseBrowse,
    },
  );

  const baseReply = sanitizeChefAgentReply(
    input.agent.reply ?? input.agent.message,
    input.userQuery,
  );
  let reply =
    products.length > 0
      ? mergeReplyWithPersuasion(baseReply, products)
      : specificQuery
        ? "Bu isteğe uygun ürün menüde bulamadım. Başka bir isim veya kategori deneyebilirsiniz."
        : baseReply;

  if (pairingQuery && products.length > 0 && (!reply.trim() || reply === input.userQuery?.trim())) {
    reply = pairingAnchorName
      ? pairingFallbackReply(pairingAnchorName)
      : "Yanına uygun birkaç seçenek hazırladım.";
  }

  const finalProductIds = products.map((item) => item.productId);

  return {
    reply,
    conversationId: input.agent.conversationId,
    turnId: input.agent.turnId,
    productIds: finalProductIds,
    products,
    searchComplete: input.agent.searchComplete,
  };
}
