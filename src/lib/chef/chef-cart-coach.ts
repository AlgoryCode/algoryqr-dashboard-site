import { classifyMenuProductRole } from "@/lib/chef/build-chef-menu-suggestions";
import type { ChefChatBadge } from "@/lib/chef/chef-chat-badges";
import type { MenuProductApiItem } from "@/lib/api";

export type MenuCourseRole = "food" | "drink" | "dessert";

const UPSELL_BADGE_PREFIX = "upsell_";

export function upsellBadgeId(role: MenuCourseRole): string {
  return `${UPSELL_BADGE_PREFIX}${role}`;
}

export function isUpsellBadgeId(badgeId: string): boolean {
  return badgeId.startsWith(UPSELL_BADGE_PREFIX);
}

export function cartCourseRoles(
  productIds: number[],
  catalog: MenuProductApiItem[],
): Set<MenuCourseRole> {
  const byId = new Map(catalog.map((product) => [product.productId, product]));
  const roles = new Set<MenuCourseRole>();
  for (const productId of productIds) {
    const product = byId.get(productId);
    if (!product) continue;
    const role = classifyMenuProductRole(product);
    if (role) roles.add(role);
  }
  return roles;
}

export function missingCourseRoles(present: Set<MenuCourseRole>): MenuCourseRole[] {
  const order: MenuCourseRole[] = ["food", "drink", "dessert"];
  return order.filter((role) => !present.has(role));
}

export function buildUpsellBadges(missing: MenuCourseRole[]): ChefChatBadge[] {
  const labels: Record<MenuCourseRole, string> = {
    food: "Ana yemek öner",
    drink: "Serin içecek öner",
    dessert: "Tatlı öner",
  };
  return missing.map((role) => ({
    id: upsellBadgeId(role),
    label: labels[role],
    filter: { type: "menuRole", role },
  }));
}

export function buildCartCoachMessage(
  missing: MenuCourseRole[],
  context?: {
    anchorName?: string;
    suggestedProductNames?: string[];
  },
): string | null {
  if (missing.length === 0) {
    return null;
  }
  const suggestedProductNames = (context?.suggestedProductNames ?? []).filter(Boolean);
  if (suggestedProductNames.length > 0) {
    const suggestions = suggestedProductNames.slice(0, 2).join(" veya ");
    const anchor = context?.anchorName ? `${context.anchorName} yanına` : "Menünüze";
    return `Sepetiniz güzel gidiyor. ${anchor} ${suggestions} çok yakışır. Aşağıdan seçebilir veya kendi isteğinizi yazabilirsiniz.`;
  }
  if (missing.length === 3) {
    return "Güzel bir başlangıç. Menünüzü ana yemek, serin bir içecek ve hafif bir tatlıyla tamamlamak ister misiniz? Aşağıdaki önerilere bakabilirsiniz.";
  }
  const parts: string[] = [];
  if (missing.includes("dessert")) parts.push("hafif bir tatlı");
  if (missing.includes("drink")) parts.push("buz gibi bir içecek");
  if (missing.includes("food")) parts.push("doyurucu bir ana yemek");
  const list = parts.join(" ve ");
  return `Sepetiniz güzel gidiyor. Şimdi ${list} ekleyerek menünüzü tamamlamak ister misiniz? Aşağıdan seçebilir veya kendi isteğinizi yazabilirsiniz.`;
}
