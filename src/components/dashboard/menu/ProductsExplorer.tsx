"use client";

import { usePathname } from "next/navigation";

import { useCategoryExplorer } from "@/components/dashboard/menu/CategoryExplorer";
import { ExplorerFrame, ExplorerSwitch, type ExplorerSection } from "@/components/dashboard/menu/ExplorerLayout";
import { useOptionExplorer } from "@/components/dashboard/menu/OptionExplorer";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

/**
 * The Ürünler page: one frame for both /kategoriler and /opsiyonlar. The two sides keep their state
 * while you switch, and only the sidebar list and the right pane change.
 */
export function ProductsExplorer() {
  const pathname = usePathname();
  const section: ExplorerSection = pathname === DASHBOARD_ROUTES.digitalMenuOptions ? "options" : "categories";
  const categories = useCategoryExplorer();
  const options = useOptionExplorer();
  const active = section === "options" ? options : categories;

  return (
    <>
      <ExplorerFrame
        header={<ExplorerSwitch active={section} />}
        sidebar={
          <div key={section} className="flex min-h-0 flex-1 flex-col animate-fade-in">
            {active.sidebar}
          </div>
        }
        detail={<div key={section}>{active.detail}</div>}
        hasSelection={active.hasSelection}
        sidebarLabel={section === "options" ? "Opsiyonlar" : "Kategoriler"}
        detailLabel={section === "options" ? "Opsiyon ayrıntısı" : "Kategori içeriği"}
      />
      {categories.dialogs}
      {options.dialogs}
    </>
  );
}
