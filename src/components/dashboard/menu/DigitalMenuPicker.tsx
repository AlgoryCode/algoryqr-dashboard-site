"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { type QueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import type { DashboardQrItem } from "@/components/dashboard/qr/qr-mappers";
import { isMenuQrDetails, mapUserQrToDashboardItem } from "@/components/dashboard/qr/qr-mappers";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { useDigitalMenuAccess } from "@/hooks/use-digital-menu-access";
import { useMenuByQr } from "@/hooks/use-menu-by-qr";
import {
  getMerchantQrsRequest,
  type MenuProfileApiItem,
} from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { SELECTED_MENU_QR_STORAGE_KEY } from "@/lib/dashboard-menu-context";
import { useBranches } from "@/hooks/use-branches";
import { flattenBranchMenus, type DigitalMenuDirectoryItem } from "@/lib/digital-menu-directory";

export const MY_ACTIVE_MENUS_QUERY_KEY = ["myActiveMenus"] as const;

export type DigitalMenuSelection = {
  qr: DashboardQrItem;
  menu: MenuProfileApiItem;
};

export { useDigitalMenuAccess };

async function loadAllMenuQrs(): Promise<DashboardQrItem[]> {
  const qrs = await getMerchantQrsRequest("me", { includeImage: false, page: 0, size: 50 });
  return qrs.content
    .filter((qr) => isMenuQrDetails(qr.details ?? {}))
    .map(mapUserQrToDashboardItem);
}

export function mapDirectoryItemToDashboardQrItem(item: DigitalMenuDirectoryItem): DashboardQrItem {
  return {
    id: item.qrId,
    merchantId: 0,
    name: item.businessName?.trim() || `Menü #${item.qrId}`,
    content: "",
    scans: 0,
    created: "",
    type: "menu",
    active: item.active,
    imgSrc: null,
    details: { type: "menu", businessName: item.businessName, menuId: item.menuId, branchId: item.branchId },
    menuId: item.menuId,
  };
}

export function useDigitalMenuOptions(enabled = true) {
  const branchesQuery = useBranches(enabled);
  const directory = flattenBranchMenus(branchesQuery.data?.content ?? []);
  const menuQrs = directory.map(mapDirectoryItemToDashboardQrItem);
  return {
    menuQrs,
    loading: branchesQuery.isLoading || branchesQuery.isFetching,
    error: (branchesQuery.error as unknown as Error) ?? null,
  };
}

export function invalidateMyActiveMenus(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: MY_ACTIVE_MENUS_QUERY_KEY });
}

export function useDigitalMenuSelection(
  initialQrId?: number | null,
  enabled = true,
  allowedQrIds?: ReadonlyArray<number> | null,
) {
  const { menuQrs: allMenuQrs, loading: optionsLoading } = useDigitalMenuOptions(enabled);
  const allowedKey =
    allowedQrIds == null ? "*" : [...allowedQrIds].sort((a, b) => a - b).join(",");
  const menuQrs = useMemo(() => {
    if (allowedQrIds == null) return allMenuQrs;
    const allowed = new Set(allowedQrIds);
    return allMenuQrs.filter((item) => allowed.has(item.id));
  }, [allMenuQrs, allowedKey, allowedQrIds]);
  const [preferredQrId, setPreferredQrId] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || optionsLoading) return;
    if (menuQrs.length === 0) {
      setPreferredQrId(null);
      return;
    }

    const stored =
      typeof window !== "undefined" ? Number(window.sessionStorage.getItem(SELECTED_MENU_QR_STORAGE_KEY)) : NaN;
    const nextId =
      (initialQrId != null && menuQrs.some((item) => item.id === initialQrId) ? initialQrId : null) ??
      (preferredQrId != null && menuQrs.some((item) => item.id === preferredQrId)
        ? preferredQrId
        : null) ??
      (Number.isFinite(stored) && menuQrs.some((item) => item.id === stored) ? stored : null) ??
      menuQrs[0].id;

    if (nextId !== preferredQrId) {
      setPreferredQrId(nextId);
    }
  }, [enabled, initialQrId, menuQrs, optionsLoading, preferredQrId]);

  const selectQrId = useCallback(
    async (qrId: number) => {
      const qr = menuQrs.find((item) => item.id === qrId);
      if (!qr) return;
      setPreferredQrId(qr.id);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SELECTED_MENU_QR_STORAGE_KEY, String(qr.id));
      }
    },
    [menuQrs],
  );

  const menuQuery = useMenuByQr(preferredQrId, enabled && !optionsLoading && preferredQrId != null);
  const selectedQr = useMemo(
    () => (preferredQrId != null ? menuQrs.find((item) => item.id === preferredQrId) ?? null : null),
    [menuQrs, preferredQrId],
  );

  const selection = useMemo<DigitalMenuSelection | null>(() => {
    if (!selectedQr || !menuQuery.data) return null;
    return { qr: selectedQr, menu: menuQuery.data };
  }, [menuQuery.data, selectedQr]);

  useEffect(() => {
    if (menuQuery.data && preferredQrId != null && typeof window !== "undefined") {
      window.sessionStorage.setItem(SELECTED_MENU_QR_STORAGE_KEY, String(preferredQrId));
    }
  }, [menuQuery.data, preferredQrId]);

  const error =
    preferredQrId != null && !selectedQr && !optionsLoading
      ? "Menü bulunamadı."
      : menuQuery.error instanceof Error
        ? menuQuery.error.message
        : menuQuery.isError
          ? "Menü yüklenemedi."
          : null;

  return {
    menuQrs,
    selection,
    loading: optionsLoading || (preferredQrId != null && menuQuery.isLoading),
    error,
    selectQrId,
  };
}

export function DigitalMenuPicker({
  menuQrs,
  selectedQrId,
  onSelectQrId,
  disabled,
  compact = false,
}: {
  menuQrs: DashboardQrItem[];
  selectedQrId: number | null;
  onSelectQrId: (qrId: number) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  if (menuQrs.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "min-w-[12rem] max-w-xs flex-1" : "max-w-md space-y-1.5"}>
      {compact ? (
        <span className="sr-only">Menü seçin</span>
      ) : (
        <Label className="text-xs text-muted-foreground">Menü seçin</Label>
      )}
      <SearchableSelect
        className={compact ? "h-9 text-xs" : undefined}
        value={selectedQrId != null ? String(selectedQrId) : ""}
        onValueChange={(next) => {
          const id = Number(next);
          if (Number.isFinite(id) && id > 0) onSelectQrId(id);
        }}
        options={menuQrs.map((item) => ({ value: String(item.id), label: item.name }))}
        placeholder="Menü seçin"
        searchPlaceholder="Menü ara..."
        emptyText="Menü bulunamadı."
        disabled={disabled}
      />
    </div>
  );
}
