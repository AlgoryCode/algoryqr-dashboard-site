"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DigitalMenuFlatList, resolveCreateMenuHref } from "@/components/dashboard/digital-menu/DigitalMenuFlatList";
import { Button } from "@/components/ui/button";

export function DigitalMenuMenusPanel() {
  const router = useRouter();
  const createHref = resolveCreateMenuHref();

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Menülerim"
        hint="Menüler şubeden bağımsız oluşturulur. İsterseniz bir şubeye atayabilirsiniz."
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
