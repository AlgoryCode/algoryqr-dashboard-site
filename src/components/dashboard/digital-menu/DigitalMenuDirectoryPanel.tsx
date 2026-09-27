"use client";

import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";

import { DigitalMenuFlatList, resolveCreateMenuHref } from "@/components/dashboard/digital-menu/DigitalMenuFlatList";
import { DigitalMenuHubShell } from "@/components/dashboard/digital-menu/DigitalMenuHubShell";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/use-branches";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { flattenBranchMenus } from "@/lib/digital-menu-directory";

export function DigitalMenuDirectoryPanel() {
  const router = useRouter();
  const branchesQuery = useBranches(true);
  const branches = branchesQuery.data?.content ?? [];
  const canCreateBranch = Boolean(branchesQuery.data?.quota.canCreate);
  const menuCount = flattenBranchMenus(branches).length;
  const createBranchHref = canCreateBranch
    ? DASHBOARD_ROUTES.branchCreate
    : DASHBOARD_ROUTES.catalogProductCheckout("QR_BRANCH");
  const createMenuHref = resolveCreateMenuHref(branches, branchesQuery.data);

  return (
    <DigitalMenuHubShell>
      <DigitalMenuFlatList
        toolbarEnd={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 border-border bg-white px-3 text-xs font-medium shadow-none dark:bg-card"
              onClick={() => router.push(createMenuHref)}
            >
              <Plus className="h-3.5 w-3.5" />
              Menü oluştur
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 border-border bg-white px-3 text-xs font-medium shadow-none dark:bg-card"
              onClick={() => router.push(createBranchHref)}
            >
              <Building2 className="h-3.5 w-3.5" />
              {canCreateBranch ? "Yeni şube" : "Şube hakkı al"}
            </Button>
          </>
        }
        listHeading={
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Menüler</h2>
            <p className="text-sm text-zinc-950">
              {menuCount > 0
                ? `${menuCount} menü · düzenlemek için satıra dokunun.`
                : "Henüz menü yok · oluşturarak başlayın."}
            </p>
          </div>
        }
      />
    </DigitalMenuHubShell>
  );
}
