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
    <div className="space-y-5 animate-fade-in">
      <DashboardPageHeader
        title="Menülerim"
        action={
          <Button size="sm" className="h-9 shrink-0 gap-1.5 rounded-xl px-3.5 shadow-sm" onClick={() => router.push(createHref)}>
            <Plus className="h-4 w-4" />
            Menü oluştur
          </Button>
        }
      />
      <DigitalMenuFlatList />
    </div>
  );
}
