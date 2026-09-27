import type { AssistantSalesCachePayload } from "@/lib/dashboard-assistant/sales-snapshot";

const STORAGE_PREFIX = "algory_dashboard_assistant_sales_v1";

function storageKey(branchId: number, menuId: number | null): string {
  return `${STORAGE_PREFIX}:${branchId}:${menuId ?? "all"}`;
}

export function readAssistantSalesCache(
  branchId: number,
  menuId: number | null,
): AssistantSalesCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(branchId, menuId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssistantSalesCachePayload;
    if (parsed?.version !== 1 || parsed.branchId !== branchId) return null;
    if ((parsed.menuId ?? null) !== menuId) return null;
    if (!Array.isArray(parsed.periods) || parsed.periods.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAssistantSalesCache(payload: AssistantSalesCachePayload): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(payload.branchId, payload.menuId), JSON.stringify(payload));
}

export function clearAssistantSalesCache(branchId: number, menuId: number | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(branchId, menuId));
}
