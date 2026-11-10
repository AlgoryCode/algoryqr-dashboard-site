"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
import { OverviewCard } from "@/components/dashboard/overview/OverviewCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { invalidateBranches } from "@/hooks/use-branches";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { updateBranchRequest, type BranchItem } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export function OverviewBranchStatus({
  branches,
  loading,
}: {
  branches: BranchItem[];
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [optimistic, setOptimistic] = useState<Record<number, boolean>>({});

  const toggle = async (branch: BranchItem, next: boolean) => {
    setPending((prev) => ({ ...prev, [branch.id]: true }));
    setOptimistic((prev) => ({ ...prev, [branch.id]: next }));
    try {
      await updateBranchRequest(branch.id, { name: branch.name, active: next });
      await invalidateBranches(queryClient);
      toast({ title: next ? `${branch.name} açıldı.` : `${branch.name} kapatıldı.`, variant: "success" });
    } catch (error) {
      toast({
        title: error instanceof ApiError ? error.message : "Şube durumu güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setOptimistic((prev) => {
        const rest = { ...prev };
        delete rest[branch.id];
        return rest;
      });
      setPending((prev) => ({ ...prev, [branch.id]: false }));
    }
  };

  const openCount = branches.filter((branch) => optimistic[branch.id] ?? branch.active).length;

  return (
    <OverviewCard
      title="Şube durumu"
      description={branches.length > 1 ? `${openCount}/${branches.length} şube siparişe açık` : "Siparişe açık / kapalı"}
      icon={DASHBOARD_NAV_ICONS.myBranches}
      tone="teal"
      action={{ label: "Şubeler", href: DASHBOARD_ROUTES.myBranches }}
      className="h-full"
    >
      {loading && branches.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-8 rounded-lg" />
        </div>
      ) : branches.length === 0 ? (
        <Link href={DASHBOARD_ROUTES.branchCreate} className="text-sm text-primary hover:underline">
          İlk şubeni oluştur
        </Link>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto">
          {branches.map((branch) => {
            const active = optimistic[branch.id] ?? branch.active;
            return (
              <li key={branch.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <Link
                  href={DASHBOARD_ROUTES.branchDetail(branch.id)}
                  className="min-w-0 truncate text-sm font-medium text-foreground hover:underline"
                  title={branch.name}
                >
                  {branch.name}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className={active ? "font-medium text-[#128C7E] dark:text-[#4ADE80]" : undefined}>{active ? "Açık" : "Kapalı"}</span>
                  <Switch
                    checked={active}
                    disabled={pending[branch.id]}
                    onCheckedChange={(next) => void toggle(branch, next)}
                    aria-label={`${branch.name} açık/kapalı`}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </OverviewCard>
  );
}
