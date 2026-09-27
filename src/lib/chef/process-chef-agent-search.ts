import { mergeReplyWithPersuasion } from "@/lib/chef/chef-recommendation-copy";
import { extractChefProductIds } from "@/lib/chef/extract-chef-product-ids";
import { filterChefProductsByDietMessage } from "@/lib/chef/filter-chef-products-by-diet-message";
import {
  filterChefProductsByPriceBand,
  inferChefPriceBandFromMessage,
} from "@/lib/chef/infer-chef-price-band";
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

  const priceBand = inferChefPriceBandFromMessage(input.message);
  const priceFiltered = filterChefProductsByPriceBand(hydrated, priceBand);
  const dietFiltered = filterChefProductsByDietMessage(
    priceFiltered,
    input.menuProducts,
    input.message,
  );
  const products = rankChefRecommendations(
    dietFiltered,
    input.menuProducts,
    input.cartProductIds,
    input.recentlyShownProductIds,
    input.priorOrderProductIds,
  );

  const baseReply = input.agent.reply ?? "";
  const reply = products.length > 0 ? mergeReplyWithPersuasion(baseReply, products) : baseReply;

  return {
    reply,
    conversationId: input.agent.conversationId,
    turnId: input.agent.turnId,
    productIds,
    products,
    searchComplete: input.agent.searchComplete,
  };
}
