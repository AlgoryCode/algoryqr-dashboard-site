import { MENU_APP_ORIGIN } from "@/lib/config";
import { publicMenuContentPath } from "@/lib/public-menu-paths";

/** Public menus live on the dashboard app; API may still return these hosts. */
const LEGACY_MENU_HOSTS = new Set([
  "qr.algorycode.com",
  "www.qr.algorycode.com",
  "stage.qr.algorycode.com",
]);

const STAGE_DASHBOARD_ORIGIN = "https://stage.dashboard.algorycode.com";
const PROD_DASHBOARD_ORIGIN = "https://dashboard.algorycode.com";

function isLegacyMenuHost(hostname: string): boolean {
  return LEGACY_MENU_HOSTS.has(hostname.toLowerCase());
}

function shouldRewriteMenuOrigin(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || isLegacyMenuHost(host);
}

function withContentPath(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed.endsWith("/content")) return trimmed;
  if (/\/menu\/[^/]+$/.test(trimmed)) return `${trimmed}/content`;
  return trimmed;
}

function trimOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function originFromConfiguredModule(): string {
  const configured = MENU_APP_ORIGIN?.trim().replace(/\/$/, "") || "";
  if (!configured) return "";
  try {
    if (isLegacyMenuHost(new URL(configured).hostname)) return "";
  } catch {
    return configured;
  }
  if (isLocalDevOrigin(configured)) return "";
  return configured;
}

/**
 * Origin for "Menüyü aç" links. On the client, only NEXT_PUBLIC_* is reliable at
 * runtime; MENU_APP_ORIGIN is frozen from the Docker build. Hostname fallback covers
 * stage/prod dashboard when build env was missing.
 */
function publicMenuLinkOrigin(): string {
  const nextPublic = process.env.NEXT_PUBLIC_MENU_APP_ORIGIN?.trim();
  if (nextPublic && !isLegacyMenuHost(new URL(nextPublic).hostname)) {
    return trimOrigin(nextPublic);
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "stage.dashboard.algorycode.com") return STAGE_DASHBOARD_ORIGIN;
    if (host === "dashboard.algorycode.com") return PROD_DASHBOARD_ORIGIN;
  }

  const fromModule = originFromConfiguredModule();
  if (fromModule) return fromModule;

  if (typeof window !== "undefined") {
    return trimOrigin(window.location.origin);
  }

  return "";
}

function absoluteMenuHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = publicMenuLinkOrigin();
  if (!origin) return normalized;
  return `${origin}${normalized}`;
}

/**
 * Builds "Menüyü aç" href. Rewrites localhost and legacy qr.algorycode.com
 * hosts to the dashboard menu origin, and appends /content when needed.
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
            return absoluteMenuHref(publicMenuContentPath(publicId));
          }
          const path = withContentPath(`${parsed.pathname}${parsed.search}`);
          return absoluteMenuHref(path);
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
