function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isUnsafeSegment(raw: string): boolean {
  const once = safeDecode(raw);
  const twice = safeDecode(once);
  for (const segment of [raw, once, twice]) {
    if (segment === "." || segment === "..") return true;
    if (segment.includes("\\") || segment.includes("/")) return true;
  }
  return false;
}

/**
 * Next hands route handlers URL-decoded params, so `/api/menu/..%2Fadmin/products` gives a route
 * `menuId = "../admin"`, which BFF routes interpolate straight into the backend URL and the
 * backend resolves to `/admin/products`. Reject any `/api` path whose segments decode to dot
 * segments or carry encoded separators, before a route ever sees it.
 */
export function hasUnsafeApiPath(pathname: string): boolean {
  return pathname.split("/").some(isUnsafeSegment);
}
