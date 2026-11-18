/**
 * The package catalog lives at `/api/v1/plan-packages`. A base URL without the `/api/v1`
 * prefix (stage, prod) goes through the backend's legacy rewrite of `/packages`; a base URL
 * that already carries the prefix (local) must name the real path, since `/api/v1/packages`
 * is not rewritten and answers 401.
 */
export function packagesUpstreamUrl(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return /\/api\/v1$/.test(base) ? `${base}/plan-packages` : `${base}/packages`;
}
