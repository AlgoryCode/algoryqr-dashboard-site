import axios from "axios";

import { mapMenuProductToAgentCatalog } from "@/lib/chef/agent-catalog-product";
import {
  parseChefAgentChatResponse,
  type ChefAgentChatResponseParsed,
} from "@/lib/chef/chef-agent-schema";
import type { ChefRecommendationIntent } from "@/lib/chef/infer-recommendation-intent";
import type { MenuProductApiItem } from "@/lib/api";
import { QR_AGENT_BASE_URL } from "@/lib/config";

export type ChefAgentChatRequest = {
  publicId: string;
  message: string;
  userQuery?: string | null;
  selectedProductId?: number;
  conversationId?: string;
  products: MenuProductApiItem[];
  cartProductIds?: number[];
  candidateProductIds?: number[];
  priorOrderProductIds?: number[];
  recommendationIntent?: ChefRecommendationIntent;
  locale?: string;
  conversationTranscript?: string;
};

export type ChefAgentChatResponse = ChefAgentChatResponseParsed;

export type ChefSuggestedProductGroup = NonNullable<
  ChefAgentChatResponse["suggestedProducts"]
>[number];

export async function callChefAgentChat(
  payload: ChefAgentChatRequest,
): Promise<{ status: number; data: ChefAgentChatResponse }> {
  const catalog = payload.products.map(mapMenuProductToAgentCatalog);
  const userQuery = payload.userQuery?.trim() ? payload.userQuery.trim() : null;

  const upstream = await axios.post(
    `${QR_AGENT_BASE_URL}/api/v1/chat`,
    {
      publicId: payload.publicId,
      userQuery,
      selectedProductId: payload.selectedProductId,
      // qr-agent request contract is intentionally compact; keep host notes
      // within its hard limit even when a large cart/context is present.
      message: payload.message.slice(0, 1000),
      conversationId: payload.conversationId,
      products: catalog,
      cartProductIds: payload.cartProductIds ?? [],
      candidateProductIds: payload.candidateProductIds,
      priorOrderProductIds: payload.priorOrderProductIds ?? [],
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

  const parsed = parseChefAgentChatResponse(upstream.data);
  const data = parsed.ok ? parsed.data : (upstream.data as ChefAgentChatResponse);

  return { status: upstream.status, data };
}
