import axios from "axios";

import { DEFAULT_CHEF_CHAT_BADGES, type ChefChatBadge } from "@/lib/chef/chef-chat-badges";
import { chefQuickOptionToBadge, DEFAULT_CHEF_WELCOME_MESSAGE } from "@/lib/chef/chef-quick-option";
import { getChefChatSettings } from "@/lib/server/chef-chat-settings-store";
import { API_BASE_URL } from "@/lib/config";

type PublicMenuMeta = {
  menuId?: number;
  menu?: {
    menuId?: number;
  };
};

async function resolveMenuId(publicId: string): Promise<number | null> {
  const upstream = await axios.get<PublicMenuMeta>(
    `${API_BASE_URL}/menu/public/${encodeURIComponent(publicId)}`,
    { validateStatus: () => true, timeout: 15_000 },
  );
  if (upstream.status >= 400) return null;
  const menuId = upstream.data?.menu?.menuId ?? upstream.data?.menuId;
  return typeof menuId === "number" && menuId > 0 ? menuId : null;
}

export async function getChefChatPublicConfig(publicId: string): Promise<{
  welcomeMessage: string;
  badges: ChefChatBadge[];
}> {
  const menuId = await resolveMenuId(publicId);
  if (menuId == null) {
    return { welcomeMessage: DEFAULT_CHEF_WELCOME_MESSAGE, badges: DEFAULT_CHEF_CHAT_BADGES };
  }

  const settings = getChefChatSettings(menuId);
  const customBadges = settings.quickOptions.map(chefQuickOptionToBadge);
  const badges = customBadges.length > 0 ? customBadges : DEFAULT_CHEF_CHAT_BADGES;

  return {
    welcomeMessage: settings.welcomeMessage || DEFAULT_CHEF_WELCOME_MESSAGE,
    badges,
  };
}
