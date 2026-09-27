"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DigitalMenuFlatList, resolveCreateMenuHref } from "@/components/dashboard/digital-menu/DigitalMenuFlatList";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/use-branches";
import { flattenBranchMenus } from "@/lib/digital-menu-directory";

export function DigitalMenuMenusPanel() {
  const router = useRouter();
  const branchesQuery = useBranches(true);
  const branches = branchesQuery.data?.content ?? [];
  const menuCount = flattenBranchMenus(branches).length;
  const createHref = resolveCreateMenuHref(branches, branchesQuery.data);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Menülerim"
        hint={
          menuCount > 0
            ? `${menuCount} dijital menü · düzenlemek için satıra dokunun.`
            : "Tüm dijital menüleriniz tek listede."
        }
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 border-border bg-white px-3 text-xs font-medium shadow-none dark:bg-card"
            onClick={() => router.push(createHref)}
          >
            <Plus className="h-3.5 w-3.5" />
            Menü oluştur
          </Button>
        }
      />
      <DigitalMenuFlatList />
    </div>
  );
}
