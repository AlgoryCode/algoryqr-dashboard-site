import axios from "axios";

import { mapMenuProductToAgentCatalog } from "@/lib/chef/agent-catalog-product";
import type { MenuProductApiItem } from "@/lib/api";
import { QR_AGENT_BASE_URL } from "@/lib/config";

export type ChefAgentChatRequest = {
  publicId: string;
  message: string;
  conversationId?: string;
  products: MenuProductApiItem[];
  cartProductIds?: number[];
  candidateProductIds?: number[];
  recommendationIntent?: string;
  locale?: string;
  conversationTranscript?: string;
};

export type ChefAgentChatResponse = {
  reply?: string;
  conversationId?: string;
  turnId?: string;
  productIds?: unknown;
  products?: unknown;
  searchComplete?: unknown;
  timing?: Record<string, number>;
};

export async function callChefAgentChat(
  payload: ChefAgentChatRequest,
): Promise<{ status: number; data: ChefAgentChatResponse }> {
  const catalog = payload.products.map(mapMenuProductToAgentCatalog);
  const upstream = await axios.post<ChefAgentChatResponse>(
    `${QR_AGENT_BASE_URL}/api/v1/chat`,
    {
      publicId: payload.publicId,
      message: payload.message,
      conversationId: payload.conversationId,
      products: catalog,
      cartProductIds: payload.cartProductIds ?? [],
      candidateProductIds: payload.candidateProductIds,
      recommendationIntent: payload.recommendationIntent,
      locale: payload.locale ?? "tr",
      conversationTranscript: payload.conversationTranscript,
    },
    {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
      timeout: 60_000,
    },
  );

  return { status: upstream.status, data: upstream.data };
}
