import { extractChefProductIds } from "@/lib/chef/extract-chef-product-ids";
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

/** FE/BFF: ajan yanıtını kartlara çevir. Öneri mantığı yok. */
export async function processChefAgentSearch(
  input: ProcessChefSearchInput,
): Promise<ProcessChefSearchResult> {
  const idSource = {
    productIds: input.agent.productIds,
    products: input.agent.products,
    searchComplete: input.agent.searchComplete,
  };
  const productIds = extractChefProductIds(idSource);
  const { products } = await hydrateChefProductsForPublicMenu(input.publicId, {
    ...idSource,
    productIds,
    catalog: input.menuProducts,
  });

  return {
    reply: (input.agent.reply ?? input.agent.message ?? "").trim(),
    conversationId: input.agent.conversationId,
    turnId: input.agent.turnId,
    productIds: products.map((item) => item.productId),
    products,
    searchComplete: input.agent.searchComplete,
  };
}
