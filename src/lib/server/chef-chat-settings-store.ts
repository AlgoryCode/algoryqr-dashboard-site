import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  createEmptyChefChatSettings,
  type ChefChatSettings,
  type ChefQuickOption,
} from "@/lib/chef/chef-quick-option";

type ChefChatSettingsStoreFile = {
  menus: Record<string, ChefChatSettings>;
};

function storePath(): string {
  return (
    process.env.CHEF_CHAT_SETTINGS_PATH?.trim() ||
    path.join(process.cwd(), ".data", "chef-chat-settings.json")
  );
}

function emptyStore(): ChefChatSettingsStoreFile {
  return { menus: {} };
}

function loadStore(): ChefChatSettingsStoreFile {
  try {
    const raw = readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw) as ChefChatSettingsStoreFile;
    if (!parsed?.menus || typeof parsed.menus !== "object") return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

function saveStore(store: ChefChatSettingsStoreFile) {
  const file = storePath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
}

function normalizeSettings(raw: ChefChatSettings | undefined): ChefChatSettings {
  const base = createEmptyChefChatSettings();
  if (!raw) return base;
  const welcomeMessage =
    typeof raw.welcomeMessage === "string" && raw.welcomeMessage.trim()
      ? raw.welcomeMessage.trim().slice(0, 500)
      : base.welcomeMessage;
  const quickOptions = Array.isArray(raw.quickOptions)
    ? raw.quickOptions
        .filter((entry): entry is ChefQuickOption => Boolean(entry?.id && entry?.label && entry?.target))
        .slice(0, 12)
    : [];
  return { welcomeMessage, quickOptions };
}

export function getChefChatSettings(menuId: number): ChefChatSettings {
  const store = loadStore();
  return normalizeSettings(store.menus[String(menuId)]);
}

export function setChefChatSettings(menuId: number, settings: ChefChatSettings): ChefChatSettings {
  const store = loadStore();
  const normalized = normalizeSettings(settings);
  store.menus[String(menuId)] = normalized;
  saveStore(store);
  return normalized;
}
