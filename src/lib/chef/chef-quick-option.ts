import type { ChefChatBadge, ChefChatBadgeFilter } from "@/lib/chef/chef-chat-badges";

export type ChefQuickOptionTarget =
  | { kind: "chefRecommended" }
  | { kind: "popular" }
  | { kind: "tag"; slug: string }
  | { kind: "mainCategory"; mainCategoryId: number }
  | { kind: "subCategory"; subCategoryId: number }
  | { kind: "products"; productIds: number[] };

export type ChefQuickOption = {
  id: string;
  label: string;
  target: ChefQuickOptionTarget;
};

export type ChefChatSettings = {
  welcomeMessage: string;
  quickOptions: ChefQuickOption[];
};

export const DEFAULT_CHEF_WELCOME_MESSAGE =
  "Merhaba! Size menüden en uygun seçenekleri bulmam için birkaç kelime yeter.";

export function createEmptyChefChatSettings(): ChefChatSettings {
  return {
    welcomeMessage: DEFAULT_CHEF_WELCOME_MESSAGE,
    quickOptions: [],
  };
}

export function chefQuickOptionToBadge(option: ChefQuickOption): ChefChatBadge {
  let filter: ChefChatBadgeFilter;
  switch (option.target.kind) {
    case "chefRecommended":
      filter = { type: "chefRecommended" };
      break;
    case "popular":
      filter = { type: "popularByRating" };
      break;
    case "tag":
      filter = { type: "tagSlug", slug: option.target.slug };
      break;
    case "mainCategory":
      filter = { type: "mainCategoryId", mainCategoryId: option.target.mainCategoryId };
      break;
    case "subCategory":
      filter = { type: "subCategoryId", subCategoryId: option.target.subCategoryId };
      break;
    case "products":
      filter = { type: "productIds", productIds: option.target.productIds };
      break;
    default:
      filter = { type: "chefRecommended" };
  }
  return { id: option.id, label: option.label, filter };
}
