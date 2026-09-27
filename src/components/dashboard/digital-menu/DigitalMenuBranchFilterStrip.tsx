"use client";

import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

export type BranchFilterOption = {
  id: number;
  name: string;
  menuCount: number;
};

type DigitalMenuBranchFilterStripProps = {
  branches: BranchFilterOption[];
  selectedBranchId: number | "all";
  onSelect: (branchId: number | "all") => void;
  className?: string;
};

export function DigitalMenuBranchFilterStrip({
  branches,
  selectedBranchId,
  onSelect,
  className,
}: DigitalMenuBranchFilterStripProps) {
  if (branches.length === 0) {
    return null;
  }

  const showAllChip = branches.length > 1;

  return (
    <div className={cn("space-y-2 animate-fade-in", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Şubeye göre filtrele</span>
      </div>
      <div
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Şube filtresi"
      >
        {showAllChip ? (
          <BranchFilterBadge
            label="Tümü"
            selected={selectedBranchId === "all"}
            onClick={() => onSelect("all")}
          />
        ) : null}
        {branches.map((branch) => (
          <BranchFilterBadge
            key={branch.id}
            label={branch.name}
            count={branch.menuCount}
            selected={selectedBranchId === branch.id || (!showAllChip && branches.length === 1)}
            onClick={() => onSelect(branch.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BranchFilterBadge({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-[min(100%,14rem)] shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-[#ececea] bg-white text-foreground hover:bg-muted/50",
      )}
    >
      <MapPin className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">{label}</span>
      {count != null ? (
        <span
          className={cn(
            "tabular-nums text-[10px] font-semibold",
            selected ? "text-background/80" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
