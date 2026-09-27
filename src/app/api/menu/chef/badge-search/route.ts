import axios from "axios";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isUpsellBadgeId, upsellBadgeId, type MenuCourseRole } from "@/lib/chef/chef-cart-coach";
import { getChefChatPublicConfig } from "@/lib/chef/chef-chat-public-config";
import type { ChefChatBadge } from "@/lib/chef/chef-chat-badges";
import { mergeReplyWithPersuasion } from "@/lib/chef/chef-recommendation-copy";
import { extractChefProductIds } from "@/lib/chef/extract-chef-product-ids";
import { fetchPublicMenuProducts } from "@/lib/chef/fetch-public-menu-products-server";
import { hydrateChefProductsForPublicMenu } from "@/lib/chef/hydrate-chef-products-server";
import { isChefBadgeHybridAgentEnabled } from "@/lib/chef/chef-funnel-flags";
import { refineChefBadgeProductsWithAgent } from "@/lib/chef/refine-chef-badge-with-agent";
import { applyUserQueryToChefRecommendations } from "@/lib/chef/filter-chef-products-by-user-query";
import { rankChefRecommendations } from "@/lib/chef/rank-chef-recommendations";
import { selectProductsForChefBadgeFilter } from "@/lib/chef/resolve-chef-badge-products";
import type { MenuProductApiItem } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

const MAX_PRODUCTS = 10;

const bodySchema = z.object({
  publicId: z.string().trim().min(1).max(128),
  badgeId: z.string().trim().min(1).max(64),
  recentlyShownProductIds: z.array(z.number().int().positive()).max(60).optional(),
  locale: z.enum(["tr", "en", "ru", "ar"]).optional(),
  userQuery: z.string().trim().max(500).optional(),
});

type ProductPageResponse = {
  content?: MenuProductApiItem[];
};

async function fetchPublicProducts(
  publicId: string,
  params: Record<string, string | number | boolean>,
): Promise<MenuProductApiItem[]> {
  const upstream = await axios.get<ProductPageResponse>(
    `${API_BASE_URL}/menu/public/${encodeURIComponent(publicId)}/products`,
    {
      params,
      validateStatus: () => true,
      timeout: 20_000,
    },
  );

  if (upstream.status >= 400) {
    throw new Error(
      typeof upstream.data === "object" && upstream.data && "message" in upstream.data
        ? String((upstream.data as { message?: string }).message)
        : "Ürünler alınamadı",
    );
  }

  return Array.isArray(upstream.data?.content) ? upstream.data.content : [];
}

function buildReply(badgeId: string, count: number): string {
  if (badgeId === "chef_recommended") {
    return count > 0
      ? `Şefin önerisi ${count} ürünü kartlarda gösteriyorum.`
      : "Şefin önerisi için uygun ürün bulamadım.";
  }
  if (badgeId === "popular") {
    return count > 0
      ? `En popüler ${count} ürünü kartlarda gösteriyorum.`
      : "En popüler ürünler için sonuç bulamadım.";
  }
  return count > 0 ? `${count} ürünü kartlarda gösteriyorum.` : "Bu filtre için uygun ürün bulamadım.";
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { publicId, badgeId } = parsed.data;
    const config = await getChefChatPublicConfig(publicId);
    let badge: ChefChatBadge | undefined = config.badges.find((entry) => entry.id === badgeId);

    if (!badge && isUpsellBadgeId(badgeId)) {
      const role = badgeId.replace(/^upsell_/, "") as MenuCourseRole;
      if (role === "food" || role === "drink" || role === "dessert") {
        const labels: Record<MenuCourseRole, string> = {
          food: "Ana yemek öner",
          drink: "Serin içecek öner",
          dessert: "Tatlı öner",
        };
        badge = {
          id: upsellBadgeId(role),
          label: labels[role],
          filter: { type: "menuRole", role },
        };
      }
    }

    if (!badge) {
      return NextResponse.json({ message: "Badge bulunamadı" }, { status: 404 });
    }

    const filter = badge.filter;
    let fetched: MenuProductApiItem[] = [];

    if (filter.type === "chefRecommended") {
      fetched = await fetchPublicProducts(publicId, {
        page: 0,
        size: MAX_PRODUCTS,
        chefRecommended: true,
      });
    } else if (filter.type === "tagSlug") {
      fetched = await fetchPublicProducts(publicId, {
        page: 0,
        size: MAX_PRODUCTS,
        tagSlug: filter.slug,
      });
    } else if (filter.type === "popularByRating") {
      fetched = await fetchPublicProducts(publicId, { page: 0, size: 50 });
    }

    const fullCatalog = await fetchPublicMenuProducts(publicId);
    let menuProducts = selectProductsForChefBadgeFilter(filter, fullCatalog, fetched);

    if (isChefBadgeHybridAgentEnabled()) {
      const refinedIds = await refineChefBadgeProductsWithAgent(
        publicId,
        badge.label,
        menuProducts,
        parsed.data.locale ?? "tr",
      );
      if (refinedIds?.length) {
        const refinedSet = new Set(refinedIds);
        menuProducts = menuProducts.filter((product) => refinedSet.has(product.productId));
      }
    }

    const productIds = menuProducts.map((product) => product.productId);

    let { products } = await hydrateChefProductsForPublicMenu(publicId, {
      productIds,
      catalog: menuProducts,
    });
    const badgeQuery = parsed.data.userQuery?.trim() || badge.label;
    products = applyUserQueryToChefRecommendations(
      products,
      fullCatalog,
      badgeQuery,
      [],
      badgeQuery,
    );
    products = rankChefRecommendations(
      products,
      fullCatalog,
      [],
      parsed.data.recentlyShownProductIds ?? [],
      [],
      { maxPerMainCategory: 6 },
    );
    const recentIds = parsed.data.recentlyShownProductIds ?? [];
    if (recentIds.length > 0 && products.length > 0) {
      const recentSet = new Set(recentIds);
      const withoutRecent = products.filter((item) => !recentSet.has(item.productId));
      if (withoutRecent.length > 0) {
        products = withoutRecent;
      }
    }
    const baseReply = buildReply(badgeId, products.length);
    const reply = products.length > 0 ? mergeReplyWithPersuasion(baseReply, products) : baseReply;

    return NextResponse.json({
      reply,
      productIds: extractChefProductIds({ productIds }),
      products,
      menuSuggestions: [],
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 502 },
    );
  }
}
