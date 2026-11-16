"use client";

import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderTree,
  ImageOff,
  LayoutGrid,
  Loader2,
  MessageSquareText,
  Plus,
  Settings2,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";

import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { MenuQrPreview } from "@/components/dashboard/menu/MenuQrPreview";
import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { copyTextToClipboard } from "@/components/dashboard/qr/qr-actions";
import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useMenuByQr } from "@/hooks/use-menu-by-qr";
import { useMenuCategories } from "@/hooks/use-menu-categories";
import { useMenuProducts } from "@/hooks/use-menu-products";
import {
  ACCOUNT_CARD,
  ACCOUNT_MENU_LABEL,
  DASHBOARD_BACK,
  DASHBOARD_CONTENT,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_STAT_TILE,
} from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { summarizeMenuProducts } from "@/lib/menu-health";
import { resolvePublicMenuHref } from "@/lib/public-menu-href";
import { cn } from "@/lib/utils";

type DigitalMenuEditorViewProps = {
  qrId: number;
};

type MenuActionIcon = ComponentType<{ className?: string }>;

type MenuAction = {
  key: string;
  title: string;
  hint: string;
  icon: MenuActionIcon;
  href: (qrId: number) => string;
};

const PRIMARY_ACTIONS: MenuAction[] = [
  {
    key: "products",
    title: "Ürünler",
    hint: "Fiyat, görsel ve stok durumu",
    icon: DigitalMenuIcon,
    href: (id) => DASHBOARD_ROUTES.digitalMenuProductsForQr(id),
  },
  {
    key: "categories",
    title: "Kategoriler",
    hint: "Sıralama ve gruplar",
    icon: FolderTree,
    href: (id) => DASHBOARD_ROUTES.digitalMenuCategoriesForQr(id),
  },
  {
    key: "settings",
    title: "Menü ayarları",
    hint: "Tema, logo, iletişim",
    icon: Settings2,
    href: (id) => DASHBOARD_ROUTES.digitalMenuSettings(id),
  },
];

const SECONDARY_ACTIONS: MenuAction[] = [
  {
    key: "analytics",
    title: "Raporlar",
    hint: "Ziyaret ve satış",
    icon: BarChart3,
    href: (id) => DASHBOARD_ROUTES.digitalMenuAnalytics(id),
  },
  {
    key: "feedback",
    title: "Geri bildirimler",
    hint: "Müşteri yorumları",
    icon: MessageSquareText,
    href: (id) => DASHBOARD_ROUTES.feedbackForQr(id),
  },
  {
    key: "layout",
    title: "Masa planı",
    hint: "Alanlar ve masa QR'ları",
    icon: LayoutGrid,
    href: (id) => DASHBOARD_ROUTES.restaurantLayoutForQr(id),
  },
];

function formatRating(value: number | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(1);
}

function StatTile({
  label,
  value,
  meta,
  loading,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className={DASHBOARD_STAT_TILE}>
      <p className={DASHBOARD_METRIC_LABEL}>{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <p className={DASHBOARD_METRIC_VALUE}>{value}</p>
      )}
      {meta ? <p className="mt-2 truncate text-xs text-zinc-500">{meta}</p> : null}
    </div>
  );
}

function ActionTile({ action, qrId }: { action: MenuAction; qrId: number }) {
  return (
    <Link
      href={action.href(qrId)}
      className={cn(
        ACCOUNT_CARD,
        "group flex items-center gap-3 p-4 transition-colors hover:bg-[#fafafa] dark:hover:bg-muted/40",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f3f1] text-zinc-600 dark:bg-muted">
        <action.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-950 dark:text-foreground">
          {action.title}
        </span>
        <span className="block truncate text-xs text-zinc-500">{action.hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function DigitalMenuEditorView({ qrId }: DigitalMenuEditorViewProps) {
  const router = useRouter();
  const { notify } = useDashboardBanners();
  const { accessLoading, accessError, retryAccess, canUseDigitalMenu } = useDigitalMenuAccess();
  const menuQuery = useMenuByQr(qrId, canUseDigitalMenu);
  const profile = menuQuery.data;
  const menuId = profile?.menuId ?? null;
  const productsQuery = useMenuProducts(menuId, canUseDigitalMenu);
  const categoriesQuery = useMenuCategories(menuId, canUseDigitalMenu);

  const menuName = profile?.businessName?.trim() || "Menü";
  const menuHref = resolvePublicMenuHref({
    publicUrl: profile?.publicUrl,
    publicId: profile?.publicId,
  });
  const backHref =
    profile?.branchId != null
      ? DASHBOARD_ROUTES.branchDetail(profile.branchId)
      : DASHBOARD_ROUTES.digitalMenuMenus;
  const logoUrl = profile?.logoUrl?.trim() || null;
  const isActive = profile?.active ?? false;
  const rating = formatRating(profile?.ratingAvg);
  const ratingCount = profile?.ratingCount ?? 0;

  const health = useMemo(
    () => summarizeMenuProducts(productsQuery.data ?? []),
    [productsQuery.data],
  );
  const categoryCount = categoriesQuery.data?.length ?? 0;
  const subCategoryCount =
    categoriesQuery.data?.reduce((sum, category) => sum + (category.subs?.length ?? 0), 0) ?? 0;
  const productsLoading = menuId != null && productsQuery.isLoading;
  const categoriesLoading = menuId != null && categoriesQuery.isLoading;
  const productsHref = DASHBOARD_ROUTES.digitalMenuProductsForQr(qrId);

  const issues = [
    {
      key: "unavailable",
      count: health.unavailable,
      icon: Tag,
      text: "ürün satışta değil",
    },
    {
      key: "image",
      count: health.missingImage,
      icon: ImageOff,
      text: "ürünün görseli yok",
    },
    {
      key: "price",
      count: health.missingPrice,
      icon: AlertTriangle,
      text: "ürünün fiyatı girilmemiş",
    },
    {
      key: "description",
      count: health.missingDescription,
      icon: BookOpen,
      text: "ürünün açıklaması yok",
    },
  ].filter((issue) => issue.count > 0);

  const handleCopyLink = async () => {
    if (!menuHref) return;
    const ok = await copyTextToClipboard(menuHref);
    notify(ok ? "info" : "warning", ok ? "Menü linki kopyalandı." : "Kopyalama başarısız.");
  };

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (menuQuery.isError) {
    return (
      <div className={cn(DASHBOARD_CONTENT, "space-y-4 py-16 text-center")}>
        <p className="text-sm text-zinc-600">Menü bilgileri yüklenemedi.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void menuQuery.refetch()}>
          Tekrar dene
        </Button>
      </div>
    );
  }

  if (accessLoading || menuQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_CONTENT, "space-y-6 animate-fade-in")}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className={DASHBOARD_BACK}
            aria-label="Geri"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3f3f1] text-zinc-500 dark:bg-muted">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-zinc-950 dark:text-foreground">
              {menuName}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  isActive ? "bg-emerald-500" : "bg-zinc-300",
                )}
                aria-hidden
              />
              {isActive ? "Yayında" : "Pasif"}
              {profile?.slogan?.trim() ? (
                <>
                  <span className="text-zinc-300">·</span>
                  <span className="truncate">{profile.slogan.trim()}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {menuHref ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyLink()}>
                <Copy className="h-3.5 w-3.5" />
                Linki kopyala
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={menuHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Menüyü aç
                </a>
              </Button>
            </>
          ) : null}
          <Button asChild size="sm">
            <Link href={DASHBOARD_ROUTES.digitalMenuProductCreateFor(qrId)}>
              <Plus className="h-3.5 w-3.5" />
              Ürün ekle
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Menü özeti">
        <StatTile
          label="Ürünler"
          loading={productsLoading}
          value={health.total}
          meta={`${health.available} satışta${health.unavailable ? ` · ${health.unavailable} kapalı` : ""}`}
        />
        <StatTile
          label="Kategoriler"
          loading={categoriesLoading}
          value={categoryCount}
          meta={subCategoryCount ? `${subCategoryCount} alt kategori` : "Alt kategori yok"}
        />
        <StatTile
          label="Puan"
          value={
            rating ? (
              <span className="inline-flex items-center gap-1.5">
                {rating}
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden />
              </span>
            ) : (
              "—"
            )
          }
          meta={ratingCount ? `${ratingCount} değerlendirme` : "Henüz değerlendirme yok"}
        />
        <StatTile
          label="Eksik bilgi"
          loading={productsLoading}
          value={health.missingImage + health.missingPrice}
          meta="Görselsiz veya fiyatsız ürün"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className={ACCOUNT_MENU_LABEL}>Menüyü düzenle</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {PRIMARY_ACTIONS.map((action) => (
                <ActionTile key={action.key} action={action} qrId={qrId} />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className={ACCOUNT_MENU_LABEL}>Kontrol listesi</h2>
            <div className={cn(ACCOUNT_CARD, "divide-y divide-[#ececea] overflow-hidden dark:divide-border")}>
              {productsLoading ? (
                <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Ürünler kontrol ediliyor…
                </div>
              ) : health.total === 0 ? (
                <Link
                  href={DASHBOARD_ROUTES.digitalMenuAiImportFor(qrId)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-[#fafafa] dark:hover:bg-muted/40"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-violet-500" />
                  <span className="min-w-0 flex-1">
                    Menüde ürün yok. Menü fotoğrafından AI ile ürünleri ekle.
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </Link>
              ) : issues.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3.5 text-sm text-zinc-700 dark:text-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  Tüm ürünler satışta ve bilgileri eksiksiz.
                </div>
              ) : (
                issues.map((issue) => (
                  <Link
                    key={issue.key}
                    href={productsHref}
                    className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-[#fafafa] dark:hover:bg-muted/40"
                  >
                    <issue.icon className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1 text-zinc-700 dark:text-foreground">
                      <span className="font-semibold tabular-nums text-zinc-950 dark:text-foreground">
                        {issue.count}
                      </span>{" "}
                      {issue.text}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className={ACCOUNT_MENU_LABEL}>Diğer</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SECONDARY_ACTIONS.map((action) => (
                <ActionTile key={action.key} action={action} qrId={qrId} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-2">
          <h2 className={ACCOUNT_MENU_LABEL}>QR kod</h2>
          <div className={cn(ACCOUNT_CARD, "flex items-center gap-4 p-4")}>
            <MenuQrPreview
              imgSrc={profile?.qr?.imgSrc ?? null}
              name={profile?.qr?.name?.trim() || menuName}
              content={menuHref}
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-zinc-950 dark:text-foreground">Masadaki QR</p>
              <p className="text-xs leading-relaxed text-zinc-500">
                İndirip yazdırabilir, linki paylaşabilirsin. Menüdeki değişiklikler QR’ı yeniden
                basmadan yansır.
              </p>
            </div>
          </div>
          {menuHref ? (
            <p className="truncate px-1 pt-1 text-xs text-zinc-400" title={menuHref}>
              {menuHref.replace(/^https?:\/\//, "")}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
