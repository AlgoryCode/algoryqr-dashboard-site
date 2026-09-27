import type { SearchCompletePayload } from "@/lib/chef/search-complete";

const MAX_IDS = 10;

function asPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function pushId(ids: number[], seen: Set<number>, value: unknown) {
  const id = asPositiveInt(value);
  if (id == null || seen.has(id)) return;
  if (ids.length >= MAX_IDS) return;
  seen.add(id);
  ids.push(id);
}

function idsFromResolvedMap(resolvedIds: Record<string, number> | undefined): number[] {
  if (!resolvedIds) return [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const value of Object.values(resolvedIds)) {
    pushId(ids, seen, value);
  }
  return ids;
}

export type ChefProductIdSource = {
  productIds?: unknown;
  products?: unknown;
  searchComplete?: SearchCompletePayload | unknown;
};

/**
 * Prefer explicit ID lists from the agent, then product payloads, then searchComplete metadata.
 */
export function extractChefProductIds(source: ChefProductIdSource): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();

  if (Array.isArray(source.productIds)) {
    for (const entry of source.productIds) {
      pushId(ids, seen, entry);
    }
  }

  if (ids.length === 0 && Array.isArray(source.products)) {
    for (const entry of source.products) {
      if (!entry || typeof entry !== "object") continue;
      pushId(ids, seen, (entry as { productId?: unknown }).productId);
    }
  }

  if (ids.length === 0 && source.searchComplete && typeof source.searchComplete === "object") {
    const response = (source.searchComplete as SearchCompletePayload).response;
    const fromResolved = idsFromResolvedMap(response?.resolvedIds);
    for (const id of fromResolved) {
      pushId(ids, seen, id);
    }
  }

  return ids;
}
