"use client";

import { useEffect, useState } from "react";

import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { Button } from "@/components/ui/button";
import type { BranchItem } from "@/lib/branch";
import { formatBranchListLabel, isBranchCourierEnabled, isBranchKitchenEnabled } from "@/lib/branch";
import type { StaffRole } from "@/lib/personnel-management-api";
import { cn } from "@/lib/utils";

export function ChoiceBadges<T extends string>({
  label,
  value,
  options,
  onChange,
  showCaption = true,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  showCaption?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showCaption ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                selected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function branchesForStaffRole(branches: BranchItem[], role: StaffRole): BranchItem[] {
  if (role === "KITCHEN") return branches.filter((branch) => isBranchKitchenEnabled(branch));
  if (role === "COURIER") return branches.filter((branch) => isBranchCourierEnabled(branch));
  return branches;
}

export function StaffBranchAssignForm({
  staffRole,
  branchId,
  branches,
  pending,
  onAssign,
}: {
  staffRole: StaffRole;
  branchId: number | null;
  branches: BranchItem[];
  pending: boolean;
  onAssign: (branchId: number | null) => void;
}) {
  const compatible = branchesForStaffRole(branches, staffRole);
  const options =
    branchId != null && !compatible.some((branch) => branch.id === branchId)
      ? [...branches.filter((branch) => branch.id === branchId), ...compatible]
      : compatible;
  const [selected, setSelected] = useState(branchId != null ? String(branchId) : "");

  useEffect(() => {
    setSelected(branchId != null ? String(branchId) : "");
  }, [branchId]);

  const nextId = Number(selected);
  const unchanged = branchId != null ? nextId === branchId : selected === "";

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || unchanged || !Number.isFinite(nextId) || nextId <= 0) return;
        onAssign(nextId);
      }}
    >
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {staffRole === "KITCHEN"
            ? "Mutfak hesabı için mutfağı açık bir şube gerekir."
            : staffRole === "COURIER"
              ? "Kurye hesabı için kuryesi açık bir şube gerekir."
              : "Atama için önce bir şube oluşturun."}
        </p>
      ) : (
        <SearchableSelect
          value={selected}
          onValueChange={setSelected}
          options={options.map((branch) => ({
            value: String(branch.id),
            label: formatBranchListLabel(branch),
          }))}
          placeholder="Şube seçin"
          searchPlaceholder="Şube ara..."
          emptyText="Şube bulunamadı."
          disabled={pending}
          className="h-9"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending || unchanged || options.length === 0 || selected === ""}>
          Şubeye ata
        </Button>
        {branchId != null ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onAssign(null)}>
            Şubeden çıkar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
