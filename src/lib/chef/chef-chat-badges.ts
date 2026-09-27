import type { MenuCourseRole } from "@/lib/chef/chef-cart-coach";

export type ChefChatBadgeFilter =
  | { type: "chefRecommended" }
  | { type: "popularByRating" }
  | { type: "tagSlug"; slug: string }
  | { type: "mainCategoryId"; mainCategoryId: number }
  | { type: "subCategoryId"; subCategoryId: number }
  | { type: "productIds"; productIds: number[] }
  | { type: "menuRole"; role: MenuCourseRole };

export type ChefChatBadge = {
  id: string;
  label: string;
  filter: ChefChatBadgeFilter;
};

export const DEFAULT_CHEF_CHAT_BADGES: ChefChatBadge[] = [
  {
    id: "chef_recommended",
    label: "Şefin önerisi",
    filter: { type: "chefRecommended" },
  },
  {
    id: "popular",
    label: "En popüler",
    filter: { type: "popularByRating" },
  },
];
