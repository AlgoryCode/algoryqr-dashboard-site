"use client";

import { useId, useState } from "react";
import { Store } from "lucide-react";

import { Label } from "@/components/ui/label";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { ApiError } from "@/lib/api";
import { UBER_EATS_SOFT_CARD_CLASS } from "@/lib/ubereats-ui";

export function IntegrationBranchCard({
  platform,
  branchId,
  onAssign,
}: {
  platform: string;
  branchId: number | null | undefined;
  onAssign: (branchId: number | null) => Promise<unknown>;
}) {
  const selectId = useId();
  const { notify } = useDashboardBanners();
  const branchesQuery = useBranches();
  const [saving, setSaving] = useState(false);
  const branches = branchesQuery.data?.content ?? [];

  const assign = async (value: string) => {
    setSaving(true);
    try {
      await onAssign(value ? Number(value) : null);
      notify("info", value ? "Siparişler seçilen şubeye düşecek." : "Siparişler tüm şubelerde görünecek.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Şube kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${UBER_EATS_SOFT_CARD_CLASS} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Store className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <Label htmlFor={selectId} className="text-sm font-medium text-foreground">
            Siparişlerin düştüğü şube
          </Label>
          <p className="text-xs text-muted-foreground">
            {platform} siparişleri bu şubenin mutfak ve kurye ekranında görünür. Şube seçilmezse tüm şubelerde görünür.
          </p>
        </div>
      </div>
      <select
        id={selectId}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-60"
        value={branchId ?? ""}
        disabled={saving || branchesQuery.isLoading}
        onChange={(event) => void assign(event.target.value)}
      >
        <option value="">Tüm şubeler</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
