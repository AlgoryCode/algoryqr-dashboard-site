"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  FolderTree,
  Loader2,
  MessageSquareText,
  Settings2,
} from "lucide-react";

import { DashboardHubTile } from "@/components/dashboard/DashboardHubTile";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import { Button } from "@/components/ui/button";
import { useMenuByQr } from "@/hooks/use-menu-by-qr";
import { DASHBOARD_BACK, DASHBOARD_HUB_GRID } from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { publicMenuContentPath } from "@/lib/public-menu-paths";

type DigitalMenuEditorViewProps = {
  qrId: number;
};

const HUB_ITEMS = [
  {
    key: "products",
    title: "Ürünler",
    icon: DigitalMenuIcon,
    href: (qrId: number) => DASHBOARD_ROUTES.digitalMenuProductsForQr(qrId),
  },
  {
    key: "categories",
    title: "Kategoriler",
    icon: FolderTree,
    href: (qrId: number) => DASHBOARD_ROUTES.digitalMenuCategoriesForQr(qrId),
  },
  {
    key: "settings",
    title: "Menü Ayarları",
    icon: Settings2,
    href: (qrId: number) => DASHBOARD_ROUTES.digitalMenuSettings(qrId),
  },
  {
    key: "feedback",
    title: "Geri Bildirimler",
    icon: MessageSquareText,
    href: (qrId: number) => DASHBOARD_ROUTES.feedbackForQr(qrId),
  },
] as const;

export default function DigitalMenuEditorView({ qrId }: DigitalMenuEditorViewProps) {
  const router = useRouter();
  const { accessLoading, canUseDigitalMenu } = useDigitalMenuAccess();
  const menuQuery = useMenuByQr(qrId, canUseDigitalMenu);
  const menuName = menuQuery.data?.businessName?.trim() || "";
  const menuHref =
    menuQuery.data?.publicUrl?.trim() ||
    (menuQuery.data?.publicId ? publicMenuContentPath(menuQuery.data.publicId) : "");

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title={menuName || "Menü"}
        hint={menuName ? "Dijital menü" : "Menü yönetimi"}
        back={
          <button
            type="button"
            onClick={() => router.push(DASHBOARD_ROUTES.digitalMenu)}
            className={DASHBOARD_BACK}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        action={
          <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1.5">
            <a href={menuHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Menüyü aç
            </a>
          </Button>
        }
      />

      <div className={DASHBOARD_HUB_GRID}>
        {HUB_ITEMS.map((item) => (
          <DashboardHubTile
            key={item.key}
            title={item.title}
            icon={item.icon}
            href={item.href(qrId)}
          />
        ))}
      </div>
    </div>
  );
}
