"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { UberEatsWordmarkSvg } from "@/components/icons/UberEatsWordmarkSvg";

import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DASHBOARD_BACK, DASHBOARD_TILE } from "@/lib/dashboard-surface";

type IntegrationsHubViewProps = {
  backHref?: string;
};

export default function IntegrationsHubView({ backHref }: IntegrationsHubViewProps) {
  const { accessLoading, accessError, retryAccess, canUseDigitalMenu } = useDigitalMenuAccess();

  if (accessLoading) {
    return backHref ? (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader
          title="Entegrasyonlar"
          hint="Bağlamak istediğiniz platformu seçin."
          back={
            <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    ) : null;
  }

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (!canUseDigitalMenu) {
    return (
      <div className="space-y-6 animate-fade-in">
        {backHref ? (
          <DashboardPageHeader
            title="Entegrasyonlar"
            hint="Bu özellik dijital menü paketi gerektirir."
            back={
              <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">Bu özellik dijital menü paketi gerektirir.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Entegrasyonlar"
        hint="Bağlamak istediğiniz platformu seçin."
        back={
          backHref ? (
            <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={DASHBOARD_ROUTES.onlineOrder}
          aria-label="Online Sipariş"
          className={`group flex min-h-[10rem] flex-col items-center justify-center gap-2 ${DASHBOARD_TILE} sm:p-8`}
        >
          <ShoppingBag className="h-9 w-9 text-foreground" />
          <span className="text-lg font-semibold text-foreground">Online Sipariş</span>
          <span className="text-center text-xs text-muted-foreground">
            Kendi paket servis mağazanızı açın, siparişleri buradan yönetin.
          </span>
        </Link>

        <Link
          href={DASHBOARD_ROUTES.uberEats}
          aria-label="Uber Eats"
          className={`group flex min-h-[10rem] items-center justify-center ${DASHBOARD_TILE} sm:p-8`}
        >
          <UberEatsWordmarkSvg />
        </Link>

        <Link
          href={DASHBOARD_ROUTES.yemekSepeti}
          aria-label="Yemek Sepeti"
          className={`group flex min-h-[10rem] items-center justify-center ${DASHBOARD_TILE} sm:p-8`}
        >
          <Image
            src="/yemek-sepeti/wordmark.png"
            alt="Yemek Sepeti"
            width={640}
            height={160}
            className="h-auto w-full max-w-[280px] object-contain"
          />
        </Link>
        <Link
          href={DASHBOARD_ROUTES.printer}
          aria-label="Fiş yazıcısı"
          className={`group flex min-h-[10rem] flex-col items-center justify-center gap-2 ${DASHBOARD_TILE} sm:p-8`}
        >
          <span className="text-lg font-semibold">Fiş yazıcısı</span>
          <span className="text-sm text-muted-foreground">Birch / ESC/POS otomatik basım</span>
        </Link>
      </div>
    </div>
  );
}
