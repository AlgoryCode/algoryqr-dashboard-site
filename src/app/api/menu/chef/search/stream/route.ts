import { NextResponse } from "next/server";

import { callChefAgentChat } from "@/lib/chef/call-chef-agent-chat";
import { chefSearchRequestBodySchema } from "@/lib/chef/chef-search-request-schema";
import { inferRecommendationIntent } from "@/lib/chef/infer-recommendation-intent";
import { processChefAgentSearch } from "@/lib/chef/process-chef-agent-search";
import { fetchPublicMenuProducts } from "@/lib/chef/fetch-public-menu-products-server";
import type { MenuProductApiItem } from "@/lib/api";

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
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
      return NextResponse.json(
        { message: upstream.data?.message || "Agent error" },
        { status: upstream.status >= 500 ? 502 : upstream.status },
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

    const encoder = new TextEncoder();
    const reply = processed.reply;
    const tokens = reply.match(/\S+\s*|\s+/g) ?? [reply];

    const stream = new ReadableStream({
      start(controller) {
        for (const token of tokens) {
          controller.enqueue(encoder.encode(sseLine("reply_delta", { text: token })));
        }
        controller.enqueue(
          encoder.encode(
            sseLine("done", {
              reply: processed.reply,
              conversationId: processed.conversationId,
              turnId: processed.turnId,
              productIds: processed.productIds,
              products: processed.products,
              menuSuggestions: [],
              searchComplete: processed.searchComplete,
            }),
          ),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
  }
}
