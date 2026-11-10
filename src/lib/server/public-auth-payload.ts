/**
 * Auth tokens live only in httpOnly cookies. Anything the BFF routes return as JSON is readable
 * by page scripts (and by any XSS), so token values must never be echoed back to the browser.
 *
 * Drops every top-level key that names a token (`accessToken`, `refresh_token`,
 * `twoFactorToken`, `idToken`, …). Expiry metadata such as `accessTokenExpiresAt` is kept.
 */
const TOKEN_KEY = /token$/i;

export function toPublicAuthPayload<T extends Record<string, unknown>>(data: T): Partial<T> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (TOKEN_KEY.test(key)) continue;
    safe[key] = value;
  }
  return safe as Partial<T>;
}
