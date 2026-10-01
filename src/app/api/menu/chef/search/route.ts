import { AxiosError } from "axios";
import { NextResponse } from "next/server";

import { callChefAgentChat } from "@/lib/chef/call-chef-agent-chat";
import { chefSearchRequestBodySchema } from "@/lib/chef/chef-search-request-schema";
import { inferRecommendationIntent } from "@/lib/chef/infer-recommendation-intent";
import { processChefAgentSearch } from "@/lib/chef/process-chef-agent-search";
import { fetchPublicMenuProducts } from "@/lib/chef/fetch-public-menu-products-server";
import type { MenuProductApiItem } from "@/lib/api";

export async function POST(req: Request) {
  const bffStarted = performance.now();

  try {
    const json = await req.json().catch(() => null);
    const parsed = chefSearchRequestBodySchema.safeParse(json);
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

    const upstream = await callChefAgentChat({
      publicId: parsed.data.publicId,
      userQuery: parsed.data.userQuery ?? null,
      selectedProductId: parsed.data.selectedProductId,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      products: menuProducts,
      cartProductIds: parsed.data.cartProductIds ?? [],
      priorOrderProductIds: parsed.data.priorOrderProductIds ?? [],
      recommendationIntent: inferRecommendationIntent(parsed.data.message, parsed.data.userQuery),
      locale: parsed.data.locale ?? "tr",
      conversationTranscript: parsed.data.conversationTranscript,
    });

    if (upstream.status >= 400) {
      console.error(
        JSON.stringify({
          event: "chef_agent_validation_failed",
          status: upstream.status,
          response: upstream.data,
        }),
      );
      const message =
        upstream.data?.message ||
        (typeof upstream.data === "string" ? upstream.data : "") ||
        "Agent error";
      return NextResponse.json(
        { message, details: upstream.data },
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
      suggestedProducts: processed.suggestedProducts,
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
    const unavailable = error instanceof AggregateError || error instanceof Error && error.message.includes("ECONNREFUSED");
    return NextResponse.json(
      {
        message: unavailable
          ? "Şef servisine ulaşılamıyor. QR agent çalışıyor mu kontrol edin."
          : "Sunucu hatası",
        detail: String(error),
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
