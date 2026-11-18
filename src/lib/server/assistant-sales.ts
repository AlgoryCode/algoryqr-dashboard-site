import type { MenuRevenueReportResponse } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import {
  assistantRangesFrom,
  buildSalesPeriodSnapshot,
  businessToday,
  type AssistantSalesCachePayload,
} from "@/lib/dashboard-assistant/sales-snapshot";

type Caller = { accessToken: string; merchantId: number | null };

const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; payload: Promise<AssistantSalesCachePayload> }>();

async function revenueReport(
  caller: Caller,
  branchId: number,
  range: { from: string; to: string },
  menuId: number | null,
): Promise<MenuRevenueReportResponse> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  if (menuId != null) params.set("menuId", String(menuId));
  const response = await fetch(`${API_BASE_URL}/analytics/branch/${branchId}/revenue?${params}`, {
    headers: {
      Authorization: `Bearer ${caller.accessToken}`,
      Accept: "application/json",
      ...(caller.merchantId != null ? { "X-Merchant-Id": String(caller.merchantId) } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new AssistantSalesError(response.status);
  return (await response.json()) as MenuRevenueReportResponse;
}

export class AssistantSalesError extends Error {
  constructor(readonly status: number) {
    super(status === 403 || status === 404 ? "Bu şubenin raporuna erişiminiz yok." : "Satış raporu alınamadı.");
  }
}

async function build(caller: Caller, branchId: number, menuId: number | null): Promise<AssistantSalesCachePayload> {
  const periods = await Promise.all(
    assistantRangesFrom(businessToday()).map(async ({ period, current, previous }) => {
      const [currentReport, previousReport] = await Promise.all([
        revenueReport(caller, branchId, current, menuId),
        revenueReport(caller, branchId, previous, menuId).catch(() => null),
      ]);
      return { snapshot: buildSalesPeriodSnapshot(period, currentReport, previousReport), report: currentReport };
    }),
  );
  const first = periods[0]?.report;
  return {
    version: 1,
    branchId,
    menuId,
    branchName: first?.branchName ?? null,
    menuName: first?.menuName ?? null,
    fetchedAt: new Date().toISOString(),
    periods: periods.map((row) => row.snapshot),
  };
}

/**
 * Bugün / 7 / 30 günlük satış özeti, read with the owner's own token so it never trusts the browser.
 * Kept for a minute per merchant, branch and menu: badges and questions in one sitting reuse it.
 */
export function loadAssistantSales(
  caller: Caller,
  branchId: number,
  menuId: number | null,
): Promise<AssistantSalesCachePayload> {
  if (caller.merchantId == null) return build(caller, branchId, menuId);
  const key = `${caller.merchantId}|${branchId}|${menuId ?? "all"}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.payload;
  if (cache.size >= CACHE_MAX) {
    for (const [oldKey, value] of cache) if (now - value.at >= CACHE_TTL_MS) cache.delete(oldKey);
    if (cache.size >= CACHE_MAX) cache.clear();
  }
  const payload = build(caller, branchId, menuId);
  cache.set(key, { at: now, payload });
  payload.catch(() => cache.delete(key));
  return payload;
}
