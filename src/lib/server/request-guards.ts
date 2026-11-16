import { trustedClientIp } from "@/lib/server/client-headers";

function firstHeaderValue(value: string | null): string | null {
  const trimmed = value?.split(",")[0]?.trim();
  return trimmed || null;
}

/**
 * True unless a browser tells us the request came from another site.
 * Non-browser callers send neither header and pass; pair this with a rate limit.
 */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));
  if (!host) return false;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

type Bucket = { windowStart: number; used: number };

/**
 * Fixed-window budget per client key, kept in process memory.
 * Good enough to stop casual abuse of a single instance; not a distributed limiter.
 */
export function createRateLimiter(options: { windowMs: number; budget: number; maxKeys?: number }) {
  const buckets = new Map<string, Bucket>();
  const maxKeys = options.maxKeys ?? 10_000;

  return function consume(key: string, cost = 1): boolean {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStart >= options.windowMs) {
      if (!bucket && buckets.size >= maxKeys) {
        for (const [k, b] of buckets) {
          if (now - b.windowStart >= options.windowMs) buckets.delete(k);
        }
        if (buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined) buckets.delete(oldest);
        }
      }
      bucket = { windowStart: now, used: 0 };
      buckets.set(key, bucket);
    }
    if (bucket.used + cost > options.budget) return false;
    bucket.used += cost;
    return true;
  };
}

export function rateLimitKey(request: Request): string {
  return trustedClientIp(request) ?? "unknown";
}
