"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ExternalLink,
  FolderTree,
  Loader2,
  MessageSquareText,
  Settings2,
} from "lucide-react";

import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import { useMenuByQr } from "@/hooks/use-menu-by-qr";
import {
  ACCOUNT_CARD,
  ACCOUNT_MENU_LABEL,
  ACCOUNT_MENU_ROW,
  DASHBOARD_BACK,
} from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { resolvePublicMenuHref } from "@/lib/public-menu-href";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type DigitalMenuEditorViewProps = {
  qrId: number;
};

const MENU_ACTIONS: Array<{
  key: string;
  title: string;
  icon: LucideIcon;
  href: (qrId: number) => string;
}> = [
  {
    key: "products",
    title: "Ürünler",
    icon: DigitalMenuIcon,
    href: (id) => DASHBOARD_ROUTES.digitalMenuProductsForQr(id),
  },
  {
    key: "categories",
    title: "Kategoriler",
    icon: FolderTree,
    href: (id) => DASHBOARD_ROUTES.digitalMenuCategoriesForQr(id),
  },
  {
    key: "settings",
    title: "Menü ayarları",
    icon: Settings2,
    href: (id) => DASHBOARD_ROUTES.digitalMenuSettings(id),
  },
  {
    key: "feedback",
    title: "Geri bildirimler",
    icon: MessageSquareText,
    href: (id) => DASHBOARD_ROUTES.feedbackForQr(id),
  },
];

export default function DigitalMenuEditorView({ qrId }: DigitalMenuEditorViewProps) {
  const router = useRouter();
  const { accessLoading, canUseDigitalMenu } = useDigitalMenuAccess();
  const menuQuery = useMenuByQr(qrId, canUseDigitalMenu);
  const profile = menuQuery.data;
  const menuName = profile?.businessName?.trim() || "Menü";
  const menuHref = resolvePublicMenuHref({
    publicUrl: profile?.publicUrl,
    publicId: profile?.publicId,
  });
  const backHref =
    profile?.branchId != null
      ? DASHBOARD_ROUTES.branchDetail(profile.branchId)
      : DASHBOARD_ROUTES.digitalMenu;
  const logoUrl = profile?.logoUrl?.trim() || null;
  const isActive = profile?.active ?? false;

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8 animate-fade-in">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className={DASHBOARD_BACK}
        aria-label="Geri"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-4 px-1">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3f3f1] text-zinc-500">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-zinc-950">{menuName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                isActive ? "bg-emerald-500" : "bg-zinc-300",
              )}
              aria-hidden
            />
            {isActive ? "Yayında" : "Pasif"}
            <span className="text-zinc-300">·</span>
            Dijital menü
          </p>
        </div>
      </div>

      {menuHref ? (
        <a
          href={menuHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            ACCOUNT_CARD,
            "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#fafafa]",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-zinc-950">Menüyü aç</h3>
              <p className="truncate text-xs font-normal text-zinc-500">Canlı menüyü yeni sekmede görüntüle</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-950" />
        </a>
      ) : null}

      <section className="space-y-2">
        <h2 className={ACCOUNT_MENU_LABEL}>Yönetim</h2>
        <div className={cn(ACCOUNT_CARD, "divide-y divide-[#ececea] overflow-hidden")}>
          {MENU_ACTIONS.map((item) => (
            <Link key={item.key} href={item.href(qrId)} className={ACCOUNT_MENU_ROW}>
              <item.icon className="mr-3 h-4 w-4 shrink-0 text-zinc-500" />
              <span className="min-w-0 flex-1">{item.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-950" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
