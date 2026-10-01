import type { MenuProfileApiItem } from "@/lib/api";

const PREVIEW_PUBLIC_IDS = new Set(["scxtG9KR5FrK0RlLjcYPUw"]);
const PREVIEW_EMAILS = new Set(["trkhmarat@gmail.com", "trkhamarat@gmail.com"]);

export const PETEK_WAFFLE_THEME_ID = "petek-waffle";

export function isVenscoffeeMenu(menu: Pick<MenuProfileApiItem, "businessName">): boolean {
  const normalized = menu.businessName?.trim().toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]/g, "") ?? "";
  return normalized === "venscoffee" || normalized.startsWith("venscoffee");
}

export function isTarikWafflePreview(menu: Pick<MenuProfileApiItem, "publicId" | "email">): boolean {
  const email = menu.email?.trim().toLowerCase() ?? "";
  const publicId = menu.publicId?.trim() ?? "";
  return PREVIEW_EMAILS.has(email) || PREVIEW_PUBLIC_IDS.has(publicId);
}

export function tarikWaffleMenu(menu: MenuProfileApiItem): MenuProfileApiItem {
  return {
    ...menu,
    themeId: PETEK_WAFFLE_THEME_ID,
    businessName: "Tarık Waffle",
    slogan: "Siparişte hamurdan pişirilir, sıcak gelir.",
  };
}
