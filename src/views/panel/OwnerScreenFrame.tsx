"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranches } from "@/hooks/use-branches";
import { formatBranchListLabel, type BranchItem } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export type OwnerScreen = "kitchen";

function screenPath(_screen: OwnerScreen, branchId: number): string {
  return DASHBOARD_ROUTES.kitchenScreen(branchId);
}

function pickBranch(
  branches: BranchItem[],
  branchId: number | null,
  preferred: (branch: BranchItem) => boolean,
): BranchItem | null {
  return (
    branches.find((branch) => branch.id === branchId) ??
    branches.find(preferred) ??
    branches[0] ??
    null
  );
}

export function useOwnerScreenBranch(
  screen: OwnerScreen,
  initialBranchId: number | null,
  preferred: (branch: BranchItem) => boolean,
) {
  const router = useRouter();
  const branchesQuery = useBranches();
  const [branchId, setBranchId] = useState(initialBranchId);
  const branches = branchesQuery.data?.content ?? [];
  const branch = pickBranch(branches, branchId, preferred);

  const selectBranch = (nextId: number) => {
    setBranchId(nextId);
    router.replace(screenPath(screen, nextId));
  };

  return {
    branches,
    branch,
    loading: branchesQuery.isLoading,
    error: branchesQuery.error instanceof Error ? branchesQuery.error.message : null,
    selectBranch,
  };
}

type OwnerScreenFrameProps = {
  title: string;
  branches: BranchItem[];
  branch: BranchItem | null;
  onBranchChange: (branchId: number) => void;
  children: ReactNode;
};

export function OwnerScreenFrame({
  title,
  branches,
  branch,
  onBranchChange,
  children,
}: OwnerScreenFrameProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <BrandLogo size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              İşletme sahibi{branch ? ` · ${branch.name}` : ""}
            </p>
          </div>
          {branch && branches.length > 1 ? (
            <Select value={String(branch.id)} onValueChange={(value) => onBranchChange(Number(value))}>
              <SelectTrigger className="h-9 w-48" aria-label="Şube">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {formatBranchListLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={branch ? DASHBOARD_ROUTES.branchDetail(branch.id) : DASHBOARD_ROUTES.overview}>
              <ArrowLeft className="h-4 w-4" />
              Panele dön
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export function OwnerScreenNotice({ branch, message }: { branch: BranchItem | null; message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
      <p>{message}</p>
      {branch ? (
        <Link
          href={DASHBOARD_ROUTES.branchDetail(branch.id)}
          className="mt-3 inline-block font-medium text-foreground underline-offset-2 hover:underline"
        >
          Şube ayarlarına git
        </Link>
      ) : null}
    </div>
  );
}
