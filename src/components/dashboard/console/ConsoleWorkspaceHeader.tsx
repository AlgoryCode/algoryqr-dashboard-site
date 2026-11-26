"use client";

import {
  BarChart3,
  Building2,
  CalendarClock,
  Gamepad2,
  History,
  Plus,
  Settings2,
  Timer,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { FilterMenu } from "@/components/dashboard/FilterMenu";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BranchItem } from "@/lib/branch";
import { formatBranchListLabel } from "@/lib/branch";
import { formatTl } from "@/lib/console-api";

export const CONSOLE_TABS = [
  "devices",
  "reservations",
  "customers",
  "shift",
  "history",
  "report",
  "tournaments",
  "settings",
] as const;
export type ConsoleTab = (typeof CONSOLE_TABS)[number];

const TAB_META: Record<ConsoleTab, { label: string; icon: LucideIcon }> = {
  devices: { label: "Cihazlar", icon: Gamepad2 },
  reservations: { label: "Rezervasyon", icon: CalendarClock },
  customers: { label: "Müşteriler", icon: Users },
  shift: { label: "Vardiya", icon: Wallet },
  history: { label: "Geçmiş", icon: History },
  report: { label: "Rapor", icon: BarChart3 },
  tournaments: { label: "Turnuva", icon: Trophy },
  settings: { label: "Ayarlar", icon: Settings2 },
};

export type ConsoleLiveStats = {
  devices: number;
  busy: number;
  late: number;
  accrued: number;
};

/**
 * One sticky bar for the device screen: title, branch switch and live status on top, the sections right under
 * it. Replaces the separate page header, branch panel and tab strip.
 */
export function ConsoleWorkspaceHeader({
  branches,
  branchId,
  onBranch,
  stats,
  onAddDevice,
}: {
  branches: BranchItem[];
  branchId: number | null;
  onBranch: (branchId: number) => void;
  stats: ConsoleLiveStats | null;
  onAddDevice: () => void;
}) {
  return (
    <div className="sticky top-14 z-20 -mx-6 border-b border-border bg-background/90 px-6 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:top-0 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="order-1 text-lg font-semibold tracking-tight sm:text-xl">Oyun &amp; cihaz takip</h1>

        {/* Phones: branch and status share the second line; wider screens: branch sits next to the title. */}
        <div className="order-3 flex w-full min-w-0 items-center gap-1.5 sm:order-2 sm:w-auto">
          {branches.length > 0 ? (
            // Same control as the other filter bars (Personeller, Rezervasyonlar). A branch is always chosen, so the
            // current one is passed as the "empty" value: the button stays neutral and shows it as "Şube: …".
            <FilterMenu
              label="Şube"
              icon={Building2}
              className="min-w-0 max-w-[16rem] sm:max-w-[20rem]"
              options={branches.map((item) => ({ value: String(item.id), label: formatBranchListLabel(item) }))}
              value={branchId != null ? String(branchId) : ""}
              emptyValue={branchId != null ? String(branchId) : ""}
              showIdleValue
              onChange={(next) => {
                const id = Number(next);
                if (Number.isFinite(id) && id > 0) onBranch(id);
              }}
            />
          ) : null}
          {stats ? (
            <div className="no-scrollbar ml-auto flex shrink-0 items-center gap-1.5 overflow-x-auto text-xs sm:hidden">
              <StatusChip tone={stats.busy > 0 ? "live" : "muted"} label={`${stats.busy}/${stats.devices}`} />
              {stats.late > 0 ? <StatusChip tone="danger" label={`${stats.late}`} /> : null}
            </div>
          ) : null}
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          {stats ? (
            <div className="hidden items-center gap-1.5 text-xs sm:flex">
              <StatusChip tone={stats.busy > 0 ? "live" : "muted"} label={`${stats.busy}/${stats.devices} dolu`} />
              {stats.late > 0 ? <StatusChip tone="danger" label={`${stats.late} süre aşımı`} /> : null}
              {stats.accrued > 0 ? <StatusChip tone="muted" label={`${formatTl(stats.accrued)} birikmiş`} /> : null}
            </div>
          ) : null}
          <Button size="sm" onClick={onAddDevice} disabled={branchId == null}>
            <Plus className="h-4 w-4 sm:mr-1" aria-hidden />
            <span className="sr-only sm:not-sr-only">Cihaz ekle</span>
          </Button>
        </div>
      </div>

      <div className="no-scrollbar -mx-6 mt-2 overflow-x-auto px-6 lg:mx-0 lg:px-0">
        <TabsList className="h-auto w-max gap-1 rounded-none bg-transparent p-0">
          {CONSOLE_TABS.map((value) => {
            const { label, icon: Icon } = TAB_META[value];
            return (
              <TabsTrigger
                key={value}
                value={value}
                className="relative gap-1.5 rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-2 text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {value === "devices" && stats && stats.late > 0 ? (
                  <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-destructive" aria-label="Süre aşımı var" />
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </div>
  );
}

function StatusChip({ tone, label }: { tone: "live" | "danger" | "muted"; label: string }) {
  const styles = {
    live: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium tabular-nums ${styles}`}>
      {tone === "live" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden /> : null}
      {tone === "danger" ? <Timer className="h-3 w-3" aria-hidden /> : null}
      {label}
    </span>
  );
}
