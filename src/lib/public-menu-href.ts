import { MENU_APP_ORIGIN } from "@/lib/config";
import { publicMenuContentPath } from "@/lib/public-menu-paths";

function withContentPath(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed.endsWith("/content")) return trimmed;
  if (/\/menu\/[^/]+$/.test(trimmed)) return `${trimmed}/content`;
  return trimmed;
}

function menuOriginForClient(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return MENU_APP_ORIGIN || "";
}

/**
 * Builds a working "open menu" href for dashboard actions.
 * Rewrites broken localhost URLs from stage API config and ensures /content path.
 */
export function resolvePublicMenuHref(options: {
  publicUrl?: string | null;
  publicId?: string | null;
}): string {
  const publicId = options.publicId?.trim() || "";
  const raw = options.publicUrl?.trim();

  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          if (publicId) {
            return `${menuOriginForClient()}${publicMenuContentPath(publicId)}`;
          }
        }
        return withContentPath(raw);
      } catch {
        return withContentPath(raw);
      }
    }
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    const contentPath = path.includes("/content") ? path : withContentPath(path);
    if (typeof window !== "undefined") {
      return contentPath;
    }
    const origin = MENU_APP_ORIGIN?.trim();
    return origin ? `${origin.replace(/\/$/, "")}${contentPath}` : contentPath;
  }

  if (!publicId) return "";
  const contentPath = publicMenuContentPath(publicId);
  if (typeof window !== "undefined") {
    return contentPath;
  }
  const origin = MENU_APP_ORIGIN?.trim();
  return origin ? `${origin.replace(/\/$/, "")}${contentPath}` : contentPath;
}
