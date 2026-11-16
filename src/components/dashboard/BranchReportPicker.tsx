"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { useBranches } from "@/hooks/use-branches";
import { getMenuByQrIdRequest } from "@/lib/api";
import type { BranchItem, BranchMenuSummary } from "@/lib/branch";
import { formatBranchListLabel } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

const BRANCH_STORAGE_KEY = "algory_selected_report_branch_id";
const MENU_QR_STORAGE_KEY = "algory_selected_report_menu_qr_id";
const ALL_WAITERS_VALUE = "all";

export function defaultMenuQrForBranch(branch: BranchItem): number | null {
  const menus = branch.menus ?? [];
  if (menus.length === 0) return null;
  const active = menus.find((menu) => menu.active);
  return (active ?? menus[0]).qrId;
}

export function preferredMenuQrForBranch(branch: BranchItem): number | null {
  const stored = readStoredMenuQrId();
  if (stored != null && (branch.menus ?? []).some((menu) => menu.qrId === stored)) {
    return stored;
  }
  return defaultMenuQrForBranch(branch);
}

function resolveMenuQr(branch: BranchItem, preferredQr: number | null): number | null {
  if (preferredQr != null && (branch.menus ?? []).some((menu) => menu.qrId === preferredQr)) {
    return preferredQr;
  }
  const stored = readStoredMenuQrId();
  if (stored != null && (branch.menus ?? []).some((menu) => menu.qrId === stored)) {
    return stored;
  }
  return defaultMenuQrForBranch(branch);
}

function readStoredMenuQrId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = Number(window.sessionStorage.getItem(MENU_QR_STORAGE_KEY));
  return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
}

function writeStoredMenuQrId(qrId: number | null) {
  if (typeof window === "undefined") return;
  if (qrId == null) {
    window.sessionStorage.removeItem(MENU_QR_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(MENU_QR_STORAGE_KEY, String(qrId));
}

export type BranchReportSelection = {
  branch: BranchItem;
  menu: BranchMenuSummary | null;
};

export type ReportWaiterOption = {
  id: number;
  name: string;
};

function readStoredBranchId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = Number(window.sessionStorage.getItem(BRANCH_STORAGE_KEY));
  return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
}

function writeStoredBranchId(branchId: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(BRANCH_STORAGE_KEY, String(branchId));
}

export function useBranchReportSelection(
  initialBranchId: number | null,
  initialQrId: number | null,
  enabled = true,
) {
  const branchesQuery = useBranches(enabled);
  const branches = branchesQuery.data?.content ?? [];
  const [branchId, setBranchId] = useState<number | null>(initialBranchId);
  const [qrId, setQrId] = useState<number | null>(initialQrId);

  useEffect(() => {
    if (!enabled || branchesQuery.isLoading) return;
    if (branches.length === 0) {
      setBranchId(null);
      setQrId(null);
      return;
    }
    if (initialBranchId != null) {
      const branch = branches.find((item) => item.id === initialBranchId);
      if (branch) {
        setBranchId(branch.id);
        const nextQr =
          initialQrId != null ? resolveMenuQr(branch, initialQrId) : null;
        setQrId(nextQr);
        writeStoredBranchId(branch.id);
        if (nextQr != null) writeStoredMenuQrId(nextQr);
        return;
      }
    }
    if (initialQrId != null) {
      const byQr = branches.find((item) => (item.menus ?? []).some((menu) => menu.qrId === initialQrId));
      if (byQr) {
        setBranchId(byQr.id);
        setQrId(initialQrId);
        writeStoredBranchId(byQr.id);
        writeStoredMenuQrId(initialQrId);
        return;
      }
      void getMenuByQrIdRequest(initialQrId)
        .then((menu) => {
          if (menu.branchId != null && branches.some((item) => item.id === menu.branchId)) {
            setBranchId(menu.branchId);
            setQrId(initialQrId);
            writeStoredBranchId(menu.branchId);
            writeStoredMenuQrId(initialQrId);
          }
        })
        .catch(() => undefined);
      return;
    }
    const stored = readStoredBranchId();
    const next =
      (stored != null && branches.some((item) => item.id === stored) ? stored : null) ??
      branches[0].id;
    const branch = branches.find((item) => item.id === next) ?? branches[0];
    setBranchId(branch.id);
    setQrId(null);
    writeStoredBranchId(branch.id);
  }, [branches, branchesQuery.isLoading, enabled, initialBranchId, initialQrId]);

  const selectedBranch = useMemo(
    () => (branchId != null ? branches.find((item) => item.id === branchId) ?? null : null),
    [branchId, branches],
  );

  const selectedMenu = useMemo(() => {
    if (selectedBranch == null || qrId == null) return null;
    return (selectedBranch.menus ?? []).find((menu) => menu.qrId === qrId) ?? null;
  }, [qrId, selectedBranch]);

  const selection = useMemo<BranchReportSelection | null>(() => {
    if (!selectedBranch) return null;
    return { branch: selectedBranch, menu: selectedMenu };
  }, [selectedBranch, selectedMenu]);

  const select = useCallback((nextBranchId: number, nextQrId: number | null) => {
    setBranchId(nextBranchId);
    setQrId(nextQrId);
    writeStoredBranchId(nextBranchId);
    writeStoredMenuQrId(nextQrId);
  }, []);

  return {
    branches,
    selection,
    branchId,
    qrId,
    menuId: selectedMenu?.menuId ?? null,
    loading: branchesQuery.isLoading,
    empty: !branchesQuery.isLoading && branches.length === 0,
    select,
  };
}

export function BranchReportPicker({
  branches,
  selectedBranchId,
  selectedQrId,
  waiters,
  selectedWaiterId,
  showMenuFilter = true,
  showWaiterFilter = false,
  onBranchSelect,
  onMenuSelect,
  onWaiterSelect,
  disabled,
  labeled = false,
}: {
  branches: BranchItem[];
  selectedBranchId: number | null;
  selectedQrId?: number | null;
  waiters?: ReportWaiterOption[];
  selectedWaiterId?: number | null;
  showMenuFilter?: boolean;
  showWaiterFilter?: boolean;
  onBranchSelect: (branchId: number) => void;
  onMenuSelect?: (qrId: number) => void;
  onWaiterSelect?: (waiterId: number | null) => void;
  disabled?: boolean;
  /** Each select gets a small caption ("Şube", "Menü", "Personel") for use inside the report filter panel. */
  labeled?: boolean;
}) {
  const selectedBranch = useMemo(
    () =>
      selectedBranchId != null
        ? branches.find((item) => item.id === selectedBranchId) ?? null
        : null,
    [branches, selectedBranchId],
  );
  const menuOptions = useMemo(
    () =>
      (selectedBranch?.menus ?? []).map((menu) => ({
        value: String(menu.qrId),
        label: menu.businessName,
      })),
    [selectedBranch],
  );

  if (branches.length === 0) {
    return (
      <div className="min-w-[12rem] max-w-xs flex-1 text-sm text-muted-foreground">
        <Link href={DASHBOARD_ROUTES.branchCreate} className="text-primary hover:underline">
          Şube oluştur
        </Link>
      </div>
    );
  }

  const waiterOptions = [
    { value: ALL_WAITERS_VALUE, label: "Tüm personel" },
    ...(waiters ?? []).map((waiter) => ({
      value: String(waiter.id),
      label: waiter.name,
    })),
  ];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 sm:flex-row",
        labeled ? "sm:items-end sm:gap-3" : "flex-1 sm:items-center",
      )}
    >
      <span className="sr-only">Şube seçin</span>
      <PickerField label="Şube" labeled={labeled}>
        <SearchableSelect
          className="h-9 min-w-[12rem] max-w-xs text-xs"
          value={selectedBranchId != null ? String(selectedBranchId) : ""}
          onValueChange={(next) => {
            const id = Number(next);
            if (Number.isFinite(id) && id > 0) onBranchSelect(id);
          }}
          options={branches.map((item) => ({ value: String(item.id), label: formatBranchListLabel(item) }))}
          placeholder="Şube seçin"
          searchPlaceholder="Şube ara..."
          emptyText="Şube bulunamadı."
          disabled={disabled}
        />
      </PickerField>
      {showMenuFilter && selectedBranchId != null && menuOptions.length > 0 ? (
        <PickerField label="Menü" labeled={labeled}>
          <SearchableSelect
            className="h-9 min-w-[12rem] max-w-xs text-xs"
            value={selectedQrId != null ? String(selectedQrId) : menuOptions[0]?.value ?? ""}
            onValueChange={(next) => {
              const id = Number(next);
              if (Number.isFinite(id) && id > 0) onMenuSelect?.(id);
            }}
            options={menuOptions}
            placeholder="Menü seçin"
            searchPlaceholder="Menü ara..."
            emptyText="Menü bulunamadı."
            disabled={disabled}
          />
        </PickerField>
      ) : null}
      {showWaiterFilter && selectedBranchId != null ? (
        <PickerField label="Personel" labeled={labeled}>
          <SearchableSelect
            className="h-9 min-w-[12rem] max-w-xs text-xs"
            value={selectedWaiterId != null ? String(selectedWaiterId) : ALL_WAITERS_VALUE}
            onValueChange={(next) => {
              if (next === ALL_WAITERS_VALUE) {
                onWaiterSelect?.(null);
                return;
              }
              const id = Number(next);
              if (Number.isFinite(id) && id > 0) onWaiterSelect?.(id);
            }}
            options={waiterOptions}
            placeholder="Tüm personel"
            searchPlaceholder="Personel ara..."
            emptyText="Personel bulunamadı."
            disabled={disabled}
          />
        </PickerField>
      ) : null}
    </div>
  );
}

function PickerField({ label, labeled, children }: { label: string; labeled: boolean; children: ReactNode }) {
  if (!labeled) return <>{children}</>;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
