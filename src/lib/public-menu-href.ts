import { MENU_APP_ORIGIN } from "@/lib/config";
import { publicMenuContentPath } from "@/lib/public-menu-paths";

function shouldRewriteMenuOrigin(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

function withContentPath(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed.endsWith("/content")) return trimmed;
  if (/\/menu\/[^/]+$/.test(trimmed)) return `${trimmed}/content`;
  return trimmed;
}

/** Public menu host (qr.algorycode.com); separate from dashboard APP_URL. */
function menuOriginForClient(): string {
  const configured = MENU_APP_ORIGIN?.trim().replace(/\/$/, "") || "";
  if (typeof window !== "undefined") {
    if (configured) return configured;
    return window.location.origin;
  }
  return configured;
}

function absoluteMenuHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") {
    const origin = MENU_APP_ORIGIN?.trim().replace(/\/$/, "");
    return origin ? `${origin}${normalized}` : normalized;
  }
  const origin = menuOriginForClient();
  if (!origin || origin === window.location.origin) {
    return normalized;
  }
  return `${origin}${normalized}`;
}

/**
 * Builds "Menüyü aç" href: keeps API qr.algorycode.com URLs, adds /content when needed.
 * Only rewrites localhost API URLs to MENU_APP_ORIGIN.
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
        if (shouldRewriteMenuOrigin(parsed.hostname)) {
          if (publicId) {
            return `${menuOriginForClient()}${publicMenuContentPath(publicId)}`;
          }
          const path = withContentPath(`${parsed.pathname}${parsed.search}`);
          return `${menuOriginForClient()}${path}`;
        }
        return withContentPath(raw);
      } catch {
        return withContentPath(raw);
      }
    }
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    const contentPath = path.includes("/content") ? path : withContentPath(path);
    return absoluteMenuHref(contentPath);
  }

  if (!publicId) return "";
  return absoluteMenuHref(publicMenuContentPath(publicId));
}
