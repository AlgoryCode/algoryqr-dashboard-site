import { AxiosError } from "axios";
import { NextResponse } from "next/server";
import { z } from "zod";

import { callChefAgentChat } from "@/lib/chef/call-chef-agent-chat";
import { inferRecommendationIntent } from "@/lib/chef/infer-recommendation-intent";
import { processChefAgentSearch } from "@/lib/chef/process-chef-agent-search";
import { fetchPublicMenuProducts } from "@/lib/chef/fetch-public-menu-products-server";
import type { MenuProductApiItem } from "@/lib/api";

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
  recentlyShownProductIds: z.array(z.number().int().positive()).max(60).optional(),
  priorOrderProductIds: z.array(z.number().int().positive()).max(40).optional(),
  conversationTranscript: z.string().trim().max(2000).optional(),
  locale: z.enum(["tr", "en", "ru", "ar"]).optional(),
  userQuery: z.string().trim().max(500).optional(),
});

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

    const agentMessage = parsed.data.conversationTranscript
      ? `${parsed.data.message}\n\n[Son sohbet özeti]\n${parsed.data.conversationTranscript}`
      : parsed.data.message;

    const upstream = await callChefAgentChat({
      publicId: parsed.data.publicId,
      message: agentMessage,
      conversationId: parsed.data.conversationId,
      products: menuProducts,
      cartProductIds: parsed.data.cartProductIds ?? [],
      recommendationIntent: inferRecommendationIntent(parsed.data.message),
      locale: parsed.data.locale ?? "tr",
      conversationTranscript: parsed.data.conversationTranscript,
    });

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

    const processed = await processChefAgentSearch({
      publicId: parsed.data.publicId,
      message: parsed.data.message,
      agent: upstream.data,
      menuProducts,
      cartProductIds: parsed.data.cartProductIds ?? [],
      recentlyShownProductIds: parsed.data.recentlyShownProductIds ?? [],
      priorOrderProductIds: parsed.data.priorOrderProductIds ?? [],
      userQuery: parsed.data.userQuery,
    });

    return NextResponse.json({
      reply: processed.reply,
      conversationId: processed.conversationId,
      turnId: processed.turnId,
      productIds: processed.productIds,
      products: processed.products,
      menuSuggestions: [],
      ...(processed.searchComplete ? { searchComplete: processed.searchComplete } : {}),
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
