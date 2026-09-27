import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";
import { z } from "zod";

import { mergeReplyWithPersuasion } from "@/lib/chef/chef-recommendation-copy";
import { extractChefProductIds } from "@/lib/chef/extract-chef-product-ids";
import { mapMenuProductToAgentCatalog } from "@/lib/chef/agent-catalog-product";
import { buildChefMenuSuggestions } from "@/lib/chef/build-chef-menu-suggestions";
import { fetchPublicMenuProducts } from "@/lib/chef/fetch-public-menu-products-server";
import { hydrateChefProductsForPublicMenu } from "@/lib/chef/hydrate-chef-products-server";
import { QR_AGENT_BASE_URL } from "@/lib/config";

const bodySchema = z.object({
  publicId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().trim().min(1).max(100).optional(),
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

    const menuProducts = await fetchPublicMenuProducts(parsed.data.publicId);
    const catalog = menuProducts.map(mapMenuProductToAgentCatalog);

    const upstream = await axios.post<AgentChatResponse>(
      `${QR_AGENT_BASE_URL}/api/v1/chat`,
      {
        publicId: parsed.data.publicId,
        message: parsed.data.message,
        conversationId: parsed.data.conversationId,
        products: catalog,
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
    const productIds = extractChefProductIds(idSource);
    const { products } = await hydrateChefProductsForPublicMenu(parsed.data.publicId, {
      ...idSource,
      catalog: menuProducts,
    });
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
