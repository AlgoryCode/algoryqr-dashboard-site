/** Social media platforms a branch or menu can link to; mirrors SocialDtos on the backend. */
export const SOCIAL_PLATFORMS = ["instagram", "facebook", "youtube", "tiktok", "x"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** A null or missing field means the account is not set. */
export type SocialLinks = Partial<Record<SocialPlatform, string | null>>;

/** Whether each platform is shown on the public menu. */
export type SocialVisibility = Partial<Record<SocialPlatform, boolean | null>>;

export const SOCIAL_PLATFORM_META: Record<SocialPlatform, { label: string; placeholder: string }> = {
  instagram: { label: "Instagram", placeholder: "@isletmeniz veya instagram.com/isletmeniz" },
  facebook: { label: "Facebook", placeholder: "facebook.com/isletmeniz" },
  youtube: { label: "YouTube", placeholder: "@kanaliniz veya youtube.com/@kanaliniz" },
  tiktok: { label: "TikTok", placeholder: "@hesabiniz" },
  x: { label: "X (Twitter)", placeholder: "@hesabiniz" },
};

export type SocialDraft = Record<SocialPlatform, string>;

export function socialDraftFrom(links: SocialLinks | null | undefined): SocialDraft {
  return Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, links?.[p] ?? ""])) as SocialDraft;
}

/** Sends every field: an empty string clears the saved link on the backend. */
export function socialPayloadFrom(draft: SocialDraft): Record<SocialPlatform, string> {
  return Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, draft[p].trim()])) as Record<SocialPlatform, string>;
}

export function isSocialDraftDirty(draft: SocialDraft, saved: SocialLinks | null | undefined): boolean {
  return SOCIAL_PLATFORMS.some((p) => draft[p].trim() !== (saved?.[p] ?? "").trim());
}

/** Shortens a profile URL for display: "https://www.instagram.com/tavsan" → "instagram.com/tavsan". */
export function displaySocialUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}
