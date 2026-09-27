import type { ChefChatBadge } from "@/lib/chef/chef-chat-badges";
import type { ChefMenuSuggestion } from "@/lib/chef/chef-menu-suggestion";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import type { SearchCompletePayload } from "@/lib/chef/search-complete";
import type { ChefTurnFeedbackValue } from "@/lib/chef/submit-chef-turn-feedback";

export type ChefChatMessage =
  | {
      id: string;
      role: "assistant";
      text: string;
      products?: ChefProductItem[];
      menuSuggestions?: ChefMenuSuggestion[];
      upsellBadges?: ChefChatBadge[];
      searchComplete?: SearchCompletePayload;
      /** Server-stored chat turn id (qr-agent / menu API). */
      turnId?: string;
      feedback?: ChefTurnFeedbackValue;
      /** Show quick-filter chips when no products matched. */
      showEmptyStateBadges?: boolean;
      /** Like/dislike row for recommendation turns (not welcome / coach). */
      showRecommendationFeedback?: boolean;
    }
  | { id: string; role: "user"; text: string };

type ChefChatSession = {
  messages: ChefChatMessage[];
  conversationId?: string;
};

const sessions = new Map<string, ChefChatSession>();

export const CHEF_WELCOME_MESSAGE: ChefChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Merhaba! Menünüzden size en uygun lezzetleri birlikte seçelim.",
};

export function getChefChatSession(publicId: string): ChefChatSession | undefined {
  return sessions.get(publicId);
}

export function setChefChatSession(publicId: string, session: ChefChatSession): void {
  sessions.set(publicId, session);
}

export function clearChefChatSession(publicId: string): void {
  sessions.delete(publicId);
}
