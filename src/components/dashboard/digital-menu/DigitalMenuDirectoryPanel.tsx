"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import { DigitalMenuHubShell } from "@/components/dashboard/digital-menu/DigitalMenuHubShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { QueryErrorState } from "@/components/dashboard/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { useBranches } from "@/hooks/use-branches";
import { ApiError } from "@/lib/api/errors";
import type { BranchItem, BranchMenuSummary } from "@/lib/branch";
import { isServerFailure } from "@/lib/server-failure";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { ACCOUNT_CARD } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_CHIPS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Yayında" },
  { value: "inactive", label: "Pasif" },
];

function BranchDirectoryCard({ branch }: { branch: BranchItem }) {
  return (
    <Link
      href={DASHBOARD_ROUTES.branchDetail(branch.id)}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#fafafa]"
    >
      {branch.photoUrl ? (
        <img
          src={branch.photoUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f3f3f1] text-zinc-500">
          <Building2 className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-950">{branch.name}</span>
        {branch.address ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{branch.address}</span>
        ) : null}
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              branch.active ? "bg-emerald-500" : "bg-zinc-300",
            )}
          />
          {branch.active ? "Açık" : "Kapalı"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-950" />
    </Link>
  );
}

function menuTitle(menu: BranchMenuSummary): string {
  return menu.businessName?.trim() || `Menü #${menu.qrId}`;
}

function branchMatches(
  branch: BranchItem,
  query: string,
  status: StatusFilter,
): { branch: BranchItem; menus: BranchMenuSummary[] } | null {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const menus = branch.menus.filter((menu) => {
    if (status === "active" && !menu.active) return false;
    if (status === "inactive" && menu.active) return false;
    if (!needle) return true;
    const haystack = `${menuTitle(menu)} ${branch.name}`.toLocaleLowerCase("tr-TR");
    return haystack.includes(needle);
  });

  if (!needle) return { branch, menus };

  const branchHit = branch.name.toLocaleLowerCase("tr-TR").includes(needle);
  if (branchHit) {
    return {
      branch,
      menus: branch.menus.filter((menu) => {
        if (status === "active" && !menu.active) return false;
        if (status === "inactive" && menu.active) return false;
        return true;
      }),
    };
  }

  if (menus.length === 0) return null;
  return { branch, menus };
}

export function DigitalMenuDirectoryPanel({ title = "Şubeler" }: { title?: string }) {
  const router = useRouter();
  const { searchParams, setQuery: setListQuery } = useListQueryState();
  const branchesQuery = useBranches(true);
  const branches = branchesQuery.data?.content ?? [];
  const canCreateBranch =
    branchesQuery.isSuccess && Boolean(branchesQuery.data.quota.canCreate);
  const serverFailure = branchesQuery.isError && isServerFailure(branchesQuery.error);
  const otherFailure = branchesQuery.isError && !serverFailure;
  const otherFailureMessage =
    branchesQuery.error instanceof ApiError && branchesQuery.error.message
      ? branchesQuery.error.message
      : "İstek tamamlanamadı.";
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>(
    () => (searchParams.get("status") as StatusFilter) || "all",
  );

  const groups = useMemo(() => {
    const sorted = [...branches].sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
    return sorted
      .map((branch) => branchMatches(branch, query, status))
      .filter((group): group is { branch: BranchItem; menus: BranchMenuSummary[] } => group != null);
  }, [branches, query, status]);

  const totalMenus = branches.reduce((sum, branch) => sum + branch.menus.length, 0);
  const createBranchHref = canCreateBranch
    ? DASHBOARD_ROUTES.branchCreate
    : DASHBOARD_ROUTES.catalogProductCheckout("QR_BRANCH");

  return (
    <DigitalMenuHubShell>
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
              placeholder="Şube veya menü ara"
              className="h-9 pl-9"
              aria-label="Şube veya menü ara"
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
          {branchesQuery.isSuccess ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 border-border bg-white px-3 text-xs font-medium shadow-none dark:bg-card"
              onClick={() => router.push(createBranchHref)}
            >
              <Plus className="h-3.5 w-3.5" />
              {canCreateBranch ? "Yeni şube" : "Şube hakkı al"}
            </Button>
          ) : null}
        </div>

        {serverFailure ? (
          <QueryErrorState
            title="Şubeler yüklenemedi"
            description="Şube ve paket haklarınız doğrulanamadı. Bu nedenle satın alma işlemi gösterilmiyor."
            onRetry={() => void branchesQuery.refetch()}
            retrying={branchesQuery.isFetching}
          />
        ) : otherFailure ? (
          <QueryErrorState
            title="Şubeler alınamadı"
            description={otherFailureMessage}
            onRetry={() => void branchesQuery.refetch()}
            retrying={branchesQuery.isFetching}
          />
        ) : branchesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Yükleniyor…
          </div>
        ) : branchesQuery.isSuccess && branches.length === 0 ? (
          <EmptyState
            title="Henüz şube yok"
            description="Menü eklemek için önce bir şube (lokasyon) oluşturun."
            action={
              <Button onClick={() => router.push(createBranchHref)}>
                <Building2 className="mr-2 h-4 w-4" />
                {canCreateBranch ? "İlk şubeyi ekle" : "Şube hakkı satın al"}
              </Button>
            }
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title="Sonuç yok"
            description="Arama veya filtreyi değiştirip tekrar deneyin."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setListQuery({ q: null, status: null });
                }}
              >
                Temizle
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h2>
              <p className="text-sm text-zinc-950">
                {groups.length} şube ve {totalMenus} menü. Satıra dokunarak şube detayına gidin.
              </p>
            </div>

            <div className={cn(ACCOUNT_CARD, "divide-y divide-[#ececea] overflow-hidden")}>
              {groups.map(({ branch }) => (
                <BranchDirectoryCard key={branch.id} branch={branch} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DigitalMenuHubShell>
  );
}
