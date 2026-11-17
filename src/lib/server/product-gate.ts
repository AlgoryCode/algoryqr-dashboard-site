import { cookies } from "next/headers";

import { hasProduct, toAccessProfile, type AccessProfile, type ProductCode } from "@/lib/auth-user";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import { fetchSessionContextWithToken } from "@/lib/server/session-context-fetch";

export type ProductGate =
  | { ok: false; status: 401 | 403 | 503; message: string }
  | { ok: true; accessToken: string; profile: AccessProfile };

/**
 * The caller's plan as the backend sees it right now. The access token cookie is only passed on:
 * the backend verifies it and answers with live entitlements, so a forged or stale token never
 * unlocks anything here. When the backend cannot answer, access is refused.
 */
export async function resolveVerifiedProfile(): Promise<ProductGate> {
  const cookieStore = await cookies();
  const accessToken = readAccessTokenFromCookies(cookieStore);
  if (!accessToken) {
    return { ok: false, status: 401, message: "Oturum gerekli" };
  }
  const session = await fetchSessionContextWithToken(accessToken);
  if (!session) {
    return { ok: false, status: 401, message: "Oturum doğrulanamadı, lütfen tekrar giriş yapın." };
  }
  const profile = toAccessProfile({
    packageCode: session.packageCode ?? null,
    products: session.products,
    scopes: session.scopes,
    roles: session.user.role ? [session.user.role] : [],
    provider: session.user.provider,
  });
  return { ok: true, accessToken, profile };
}

/** Lets the request through only when the verified plan includes one of the products. */
export async function requireProduct(...products: ProductCode[]): Promise<ProductGate> {
  const gate = await resolveVerifiedProfile();
  if (!gate.ok) return gate;
  if (!products.some((product) => hasProduct(gate.profile, product))) {
    return { ok: false, status: 403, message: "Bu özellik paketinizde yok." };
  }
  return gate;
}
