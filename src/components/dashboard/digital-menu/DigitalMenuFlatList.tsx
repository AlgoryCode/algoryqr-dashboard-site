"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, Loader2, Plus, Search } from "lucide-react";

import { DigitalMenuBranchFilterStrip } from "@/components/dashboard/digital-menu/DigitalMenuBranchFilterStrip";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { useBranches } from "@/hooks/use-branches";
import { canCreateMenuOnBranch, type BranchItem, type BranchListResponse } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { ACCOUNT_CARD } from "@/lib/dashboard-surface";
import {
  DEFAULT_MENU_DIRECTORY_FILTERS,
  filterMenuDirectory,
  flattenBranchMenus,
  sortMenuDirectoryByMenuName,
  type DigitalMenuDirectoryItem,
  type MenuDirectoryStatusFilter,
} from "@/lib/digital-menu-directory";
import { cn } from "@/lib/utils";

const STATUS_CHIPS: Array<{ value: MenuDirectoryStatusFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Yayında" },
  { value: "inactive", label: "Pasif" },
];

function MenuDirectoryRow({
  menu,
  showBranchName,
}: {
  menu: DigitalMenuDirectoryItem;
  showBranchName: boolean;
}) {
  return (
    <Link
      href={DASHBOARD_ROUTES.digitalMenuEdit(menu.qrId)}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#fafafa]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3f3f1] text-zinc-500">
        <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-950">{menu.businessName}</span>
        {showBranchName ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{menu.branchName}</span>
        ) : null}
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              menu.active ? "bg-emerald-500" : "bg-zinc-300",
            )}
          />
          {menu.active ? "Yayında" : "Pasif"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-950" />
    </Link>
  );
}

export function resolveCreateMenuHref(branches: BranchItem[], list: BranchListResponse | undefined): string {
  if (branches.length === 0) {
    return list?.quota.canCreate
      ? DASHBOARD_ROUTES.branchCreate
      : DASHBOARD_ROUTES.catalogProductCheckout("QR_BRANCH");
  }
  const creatable = branches.find((branch) => canCreateMenuOnBranch(branch, list?.menuQuota));
  if (creatable) {
    return DASHBOARD_ROUTES.digitalMenuCreateForBranch(creatable.id);
  }
  return DASHBOARD_ROUTES.catalogProductCheckout("QR_MENU");
}

type DigitalMenuFlatListProps = {
  toolbarEnd?: ReactNode;
  listHeading?: ReactNode;
};

export function DigitalMenuFlatList({ toolbarEnd, listHeading }: DigitalMenuFlatListProps) {
  const router = useRouter();
  const { searchParams, setQuery: setListQuery } = useListQueryState();
  const branchesQuery = useBranches(true);
  const branches = branchesQuery.data?.content ?? [];
  const allMenus = useMemo(
    () => sortMenuDirectoryByMenuName(flattenBranchMenus(branches)),
    [branches],
  );

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState<MenuDirectoryStatusFilter>(
    () => (searchParams.get("status") as MenuDirectoryStatusFilter) || DEFAULT_MENU_DIRECTORY_FILTERS.status,
  );
  const [branchId, setBranchId] = useState<number | "all">(() => {
    const raw = searchParams.get("branch");
    const parsed = raw != null ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : "all";
  });

  const filteredMenus = useMemo(
    () => filterMenuDirectory(allMenus, { query, status, branchId }),
    [allMenus, branchId, query, status],
  );

  const createHref = resolveCreateMenuHref(branches, branchesQuery.data);
  const branchFilterOptions = useMemo(() => {
    const menuCountByBranch = new Map<number, number>();
    for (const menu of allMenus) {
      menuCountByBranch.set(menu.branchId, (menuCountByBranch.get(menu.branchId) ?? 0) + 1);
    }
    return [...branches]
      .filter((branch) => (menuCountByBranch.get(branch.id) ?? 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"))
      .map((branch) => ({
        id: branch.id,
        name: branch.name,
        menuCount: menuCountByBranch.get(branch.id) ?? 0,
      }));
  }, [allMenus, branches]);

  const showBranchName = branchId === "all" && branchFilterOptions.length > 1;

  const selectBranch = (next: number | "all") => {
    setBranchId(next);
    setListQuery({ branch: next === "all" ? null : String(next) });
  };
  const loading = branchesQuery.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setListQuery({ q: next.trim() || null });
            }}
            placeholder="Menü ara"
            className="h-9 pl-9"
            aria-label="Menü ara"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => {
                setStatus(chip.value);
                setListQuery({ status: chip.value === "all" ? null : chip.value });
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                status === chip.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {toolbarEnd}
      </div>

      {allMenus.length > 0 ? (
        <DigitalMenuBranchFilterStrip
          branches={branchFilterOptions}
          selectedBranchId={branchId}
          onSelect={selectBranch}
        />
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menüler yükleniyor…
        </div>
      ) : allMenus.length === 0 ? (
        <EmptyState
          title="Henüz menü yok"
          description={
            branches.length === 0
              ? "İlk menünüzü eklemek için bir şube oluşturun."
              : "İlk dijital menünüzü oluşturarak başlayın."
          }
          action={
            <Button onClick={() => router.push(createHref)}>
              <Plus className="mr-2 h-4 w-4" />
              {branches.length === 0 ? "Şube oluştur" : "Menü oluştur"}
            </Button>
          }
        />
      ) : filteredMenus.length === 0 ? (
        <EmptyState
          title="Sonuç yok"
          description="Arama veya filtreyi değiştirip tekrar deneyin."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setBranchId("all");
                setListQuery({ q: null, status: null, branch: null });
              }}
            >
              Temizle
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {listHeading ?? (
            <p className="text-sm text-muted-foreground">
              {branchId !== "all" ? (
                <>
                  <span className="font-medium text-foreground">
                    {branchFilterOptions.find((item) => item.id === branchId)?.name ?? "Şube"}
                  </span>
                  {" · "}
                  {filteredMenus.length} menü
                </>
              ) : filteredMenus.length === allMenus.length ? (
                `${allMenus.length} menü`
              ) : (
                `${filteredMenus.length} / ${allMenus.length} menü`
              )}
            </p>
          )}
          <div className={cn(ACCOUNT_CARD, "divide-y divide-[#ececea] overflow-hidden")}>
            {filteredMenus.map((menu) => (
              <MenuDirectoryRow key={menu.menuId} menu={menu} showBranchName={showBranchName} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
