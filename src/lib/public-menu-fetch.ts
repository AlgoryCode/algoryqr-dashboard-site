import type { PublicMenuApiResponse } from "@/lib/api";
import { permanentRedirect } from "next/navigation";
import { buildPublicMenuContentPath } from "@/lib/public-menu-paths";

const MENU_OWNER_PACKAGE_INACTIVE = "MENU_OWNER_PACKAGE_INACTIVE";

function appOriginForServerFetch(): string {
  const fromEnv = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `http://127.0.0.1:${process.env.PORT || 3000}`;
}

export type PublicMenuFetchResult =
  | { status: "ok"; data: PublicMenuApiResponse; publicId: string }
  | { status: "package_inactive" }
  | { status: "not_found" };

async function resolveLegacyQrPublicId(qrId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${appOriginForServerFetch()}/api/menu/public/legacy-qr/${encodeURIComponent(qrId)}/public-id`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { publicId?: string };
    return body.publicId?.trim() || null;
  } catch {
    return null;
  }
}

export async function fetchPublicMenu(
  identifier: string,
  options?: { tableToken?: string },
): Promise<PublicMenuFetchResult> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { status: "not_found" };
  }

  if (/^\d+$/.test(trimmed)) {
    const publicId = await resolveLegacyQrPublicId(trimmed);
    if (!publicId) {
      return { status: "not_found" };
    }
    permanentRedirect(buildPublicMenuContentPath(publicId, { tableToken: options?.tableToken }));
  }

  try {
    const response = await fetch(
      `${appOriginForServerFetch()}/api/menu/public/${encodeURIComponent(trimmed)}`,
      { cache: "no-store" },
    );

    if (response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as { code?: string };
      if (body.code === MENU_OWNER_PACKAGE_INACTIVE || body.code == null) {
        return { status: "package_inactive" };
      }
      return { status: "not_found" };
    }

    if (!response.ok) {
      return { status: "not_found" };
    }

    const data = (await response.json()) as PublicMenuApiResponse;
    const publicId = data.menu?.publicId?.trim() || trimmed;
    return { status: "ok", data, publicId };
  } catch {
    return { status: "not_found" };
  }
}
