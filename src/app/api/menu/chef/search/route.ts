import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";
import { z } from "zod";

import { mergeReplyWithPersuasion } from "@/lib/chef/chef-recommendation-copy";
import { extractChefProductIds } from "@/lib/chef/extract-chef-product-ids";
import { mapMenuProductToAgentCatalog } from "@/lib/chef/agent-catalog-product";
import { buildChefMenuSuggestions } from "@/lib/chef/build-chef-menu-suggestions";
import { inferRecommendationIntent } from "@/lib/chef/infer-recommendation-intent";
import { filterChefProductIds, rankChefRecommendations } from "@/lib/chef/rank-chef-recommendations";
import { fetchPublicMenuProducts } from "@/lib/chef/fetch-public-menu-products-server";
import { hydrateChefProductsForPublicMenu } from "@/lib/chef/hydrate-chef-products-server";
import type { MenuProductApiItem } from "@/lib/api";
import { QR_AGENT_BASE_URL } from "@/lib/config";

const menuProductBodySchema = z
  .object({
    productId: z.number().int().positive(),
    menuId: z.number().int(),
    name: z.string().trim().min(1),
  })
  .passthrough();

const bodySchema = z.object({
  publicId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(1).max(100).optional(),
  menuProducts: z.array(menuProductBodySchema).min(1).max(400).optional(),
  cartProductIds: z.array(z.number().int().positive()).max(40).optional(),
});

type ChatTiming = {
  path: "agent";
  totalMs: number;
  moderationMs: number;
  agentMs?: number;
  mcpConnectMs?: number;
  searchMs?: number;
};

type AgentChatResponse = {
  reply?: string;
  conversationId?: string;
  message?: string;
  productIds?: unknown;
  products?: unknown;
  searchComplete?: unknown;
  timing?: ChatTiming;
};

export async function POST(req: Request) {
  const bffStarted = performance.now();

  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const clientMenuProducts = parsed.data.menuProducts as MenuProductApiItem[] | undefined;
    const menuProducts =
      clientMenuProducts && clientMenuProducts.length > 0
        ? clientMenuProducts
        : await fetchPublicMenuProducts(parsed.data.publicId);
    const catalog = menuProducts.map(mapMenuProductToAgentCatalog);
    const cartProductIds = parsed.data.cartProductIds ?? [];
    const recommendationIntent = inferRecommendationIntent(parsed.data.message);

    const upstream = await axios.post<AgentChatResponse>(
      `${QR_AGENT_BASE_URL}/api/v1/chat`,
      {
        publicId: parsed.data.publicId,
        message: parsed.data.message,
        conversationId: parsed.data.conversationId,
        products: catalog,
        cartProductIds,
        recommendationIntent,
        locale: "tr",
      },
      {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
        timeout: 60_000,
      },
    );

    if (upstream.status >= 400) {
      const message =
        upstream.data?.message ||
        (typeof upstream.data === "string" ? upstream.data : "") ||
        "Agent error";
      return NextResponse.json(
        { message },
        { status: upstream.status >= 500 ? 502 : upstream.status },
      );
    }

    const bffMs = Math.round(performance.now() - bffStarted);
    const timing = upstream.data.timing ? { ...upstream.data.timing, bffMs } : undefined;

    if (timing) {
      console.error(
        JSON.stringify({
          event: "chef_bff_timing",
          publicId: parsed.data.publicId,
          conversationId: upstream.data.conversationId,
          ...timing,
        }),
      );
    }

    const idSource = {
      productIds: upstream.data.productIds,
      products: upstream.data.products,
      searchComplete: upstream.data.searchComplete,
    };
    const rawProductIds = extractChefProductIds(idSource);
    const productIds = filterChefProductIds(rawProductIds, cartProductIds);
    const { products: hydrated } = await hydrateChefProductsForPublicMenu(parsed.data.publicId, {
      ...idSource,
      productIds,
      catalog: menuProducts,
    });
    const products = rankChefRecommendations(hydrated, menuProducts, cartProductIds);
    const menuSuggestions =
      products.length > 0 ? buildChefMenuSuggestions(products, menuProducts) : [];

    const baseReply = upstream.data.reply ?? "";
    const reply =
      products.length > 0 ? mergeReplyWithPersuasion(baseReply, products) : baseReply;

    return NextResponse.json({
      reply,
      conversationId: upstream.data.conversationId,
      productIds,
      products,
      menuSuggestions,
      ...(upstream.data.searchComplete ? { searchComplete: upstream.data.searchComplete } : {}),
      timing,
    });
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
      }
      if (error.response) {
        return NextResponse.json(
          {
            message:
              (error.response.data as { message?: string } | undefined)?.message || "Upstream error",
          },
          { status: error.response.status >= 500 ? 502 : error.response.status },
        );
      }
    }
    return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
  }
}
