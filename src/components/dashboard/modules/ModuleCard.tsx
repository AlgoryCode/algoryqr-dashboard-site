"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PlanPackageModuleApi } from "@/lib/api";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { MAX_MODULE_QUANTITY, formatCartMoney } from "@/lib/package-cart";
import { cn } from "@/lib/utils";

const BADGE: Record<NonNullable<PlanPackageModuleApi["badge"]>, { label: string; className: string }> = {
  NEW: { label: "Yeni", className: "bg-sky-600/15 text-sky-700 dark:text-sky-300" },
  POPULAR: { label: "Popüler", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  DEAL: { label: "Fırsat", className: "bg-rose-600/15 text-rose-700 dark:text-rose-300" },
};

function moduleUnitLabel(module: PlanPackageModuleApi): number {
  const unitPrice = Number(module.unitPrice ?? 0);
  const vatRate = Number(module.vatRate ?? 0);
  if (!Number.isFinite(unitPrice)) return 0;
  return Math.round((unitPrice * (1 + vatRate / 100) + Number.EPSILON) * 100) / 100;
}

export function ModuleCard({
  module,
  currency,
  quantity,
  included,
  onAdd,
  onQuantity,
}: {
  module: PlanPackageModuleApi;
  currency: string;
  quantity: number;
  included: boolean;
  onAdd: () => void;
  onQuantity: (quantity: number) => void;
}) {
  return (
    <div className={cn(DASHBOARD_SURFACE, "flex h-full flex-col p-4",
        module.featured && quantity <= 0 && "ring-1 ring-amber-400/40",
        quantity > 0 && "ring-2 ring-primary/30",
      )}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-medium text-foreground">{module.productName}</h2>
        {included ? (
          <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            Pakette var
          </span>
        ) : module.badge ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", BADGE[module.badge].className)}>
            {BADGE[module.badge].label}
          </span>
        ) : null}
      </div>
      {module.tagline || module.description ? (
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{module.tagline || module.description}</p>
      ) : (
        <div className="flex-1" />
      )}
      <p className="mt-4 text-lg font-semibold text-foreground">
        {formatCartMoney(moduleUnitLabel(module), currency)}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {module.billingType === "ONE_TIME" ? "tek seferlik" : "/ ay"}
        </span>
      </p>
      <QuantityControl quantity={quantity} onAdd={onAdd} onQuantity={onQuantity} />
    </div>
  );
}

function QuantityControl({
  quantity,
  onAdd,
  onQuantity,
}: {
  quantity: number;
  onAdd: () => void;
  onQuantity: (quantity: number) => void;
}) {
  if (quantity <= 0) {
    return (
      <Button type="button" variant="outline" className="mt-3 w-full" onClick={onAdd}>
        Ekle
      </Button>
    );
  }

  return (
    <div className="mt-3 flex items-center justify-between rounded-full border border-border px-2 py-1">
      <Button type="button" variant="ghost" size="icon" aria-label="Adet azalt" onClick={() => onQuantity(quantity - 1)}>
        <Minus className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium tabular-nums">{quantity}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Adet artır"
        disabled={quantity >= MAX_MODULE_QUANTITY}
        onClick={() => onQuantity(quantity + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
