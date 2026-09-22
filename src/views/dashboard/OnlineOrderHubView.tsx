"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  ClipboardList,
  Loader2,
  Settings,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";

import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StoreLinkCard } from "@/components/dashboard/store/StoreLinkCard";
import { StoreOrdersTable } from "@/components/dashboard/store/StoreOrdersTable";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, openQueueDateRange } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMyStore, useStoreOrders } from "@/hooks/use-store";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  DASHBOARD_BACK,
  DASHBOARD_FILTER_FIELD,
  DASHBOARD_FILTER_LABEL,
  DASHBOARD_PANEL,
  DASHBOARD_TILE,
} from "@/lib/dashboard-surface";
import { formatStoreAmount, STORE_ORDER_STATUS_LABEL } from "@/lib/store-ui";
import { cn } from "@/lib/utils";

export default function OnlineOrderHubView() {
  const { merchant, isLoading, accessLoading, canUseOnlineOrder } = useMyStore();
  const [range, setRange] = useState(() => openQueueDateRange());
  const [customerQuery, setCustomerQuery] = useState("");
  const debouncedCustomer = useDebouncedValue(customerQuery);

  const ordersQuery = useStoreOrders({
    from: range.from || undefined,
    to: range.to || undefined,
    page: 0,
    size: 100,
    enabled: Boolean(merchant),
  });

  const filteredOrders = useMemo(() => {
    const orders = ordersQuery.data?.content ?? [];
    const query = debouncedCustomer.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const name = (order.customerName || "").toLowerCase();
      const phone = (order.customerPhone || "").toLowerCase();
      const orderNo = (order.orderNo || "").toLowerCase();
      const courier = (order.courier?.fullName || "").toLowerCase();
      return (
        name.includes(query) ||
        phone.includes(query) ||
        orderNo.includes(query) ||
        courier.includes(query)
      );
    });
  }, [debouncedCustomer, ordersQuery.data?.content]);

  if (accessLoading || isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor…
      </div>
    );
  }

  if (!canUseOnlineOrder) {
    return (
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <h1 className="text-lg font-semibold text-foreground">Online Sipariş</h1>
        <p className="text-sm text-muted-foreground">
          Kendi paket servis mağazanızı açmak için Online Sipariş özelliğini içeren bir pakete geçmeniz gerekir.
        </p>
        <Button asChild>
          <Link href={DASHBOARD_ROUTES.accountPackages}>Paketleri incele</Link>
        </Button>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader
          title="Online Sipariş"
          hint="Gizli adresli kendi paket servis mağazanızı açın."
          back={
            <Link
              href={DASHBOARD_ROUTES.integrations}
              aria-label="Entegrasyonlara dön"
              className={DASHBOARD_BACK}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
        <div className={`${DASHBOARD_PANEL} space-y-4`}>
          <ShoppingBag className="h-10 w-10 text-foreground" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">Mağazanız henüz kurulu değil</p>
            <p className="text-sm text-muted-foreground">
              İşletme bilgilerinizi ve teslimat ayarlarınızı girin, dilerseniz mevcut menünüzdeki ürünleri
              aktarın. Kurulum bittiğinde müşterilerinizle paylaşacağınız gizli mağaza adresiniz hazır olur.
            </p>
          </div>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.onlineOrderSetup}>Kurulumu başlat</Link>
          </Button>
        </div>
      </div>
    );
  }

  const page = ordersQuery.data;
  const openCounts = page?.openCounts ?? {};
  const pendingCount = openCounts.PENDING ?? 0;
  const activeCount =
    (openCounts.CONFIRMED ?? 0) + (openCounts.PREPARING ?? 0) + (openCounts.READY ?? 0) + (openCounts.ON_THE_WAY ?? 0);
  const todayTotal = (page?.content ?? []).reduce((sum, order) => sum + order.totalAmount, 0);
  const orders = page?.content ?? [];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title={merchant.business.businessName}
        hint={merchant.open ? "Mağazanız şu anda sipariş alıyor." : "Mağazanız şu anda kapalı."}
        back={
          <Link
            href={DASHBOARD_ROUTES.integrations}
            aria-label="Entegrasyonlara dön"
            className={DASHBOARD_BACK}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={DASHBOARD_ROUTES.onlineOrderOrders}>Operasyon panosu</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={DASHBOARD_ROUTES.onlineOrderSettings}>Ayarlar</Link>
            </Button>
          </div>
        }
      />

      <StoreLinkCard merchant={merchant} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label={STORE_ORDER_STATUS_LABEL.PENDING} value={String(pendingCount)} />
        <StatTile label="Aktif sipariş" value={String(activeCount)} />
        <StatTile label="Son siparişler toplamı" value={formatStoreAmount(todayTotal, merchant.currency)} />
      </div>

      <DashboardFilterBar>
        <DateRangeFilter value={range} onChange={setRange} />
        <div className={cn(DASHBOARD_FILTER_FIELD, "min-w-[12rem] flex-1 sm:max-w-xs")}>
          <Label htmlFor="online-orders-customer-filter" className={DASHBOARD_FILTER_LABEL}>
            Ara
          </Label>
          <Input
            id="online-orders-customer-filter"
            value={customerQuery}
            onChange={(event) => setCustomerQuery(event.target.value)}
            placeholder="Müşteri, telefon veya sipariş no"
          />
        </div>
      </DashboardFilterBar>

      {ordersQuery.isError ? (
        <p className="text-sm text-destructive">Siparişler yüklenemedi</p>
      ) : null}

      {ordersQuery.isLoading ? (
        <DashboardLoadingState label="Siparişler yükleniyor..." />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Henüz sipariş yok"
          description="Online mağazadan gelen siparişler burada detaylı görünür."
          action={
            <Button asChild variant="outline">
              <Link href={DASHBOARD_ROUTES.onlineOrderOrders}>Operasyon panosunu aç</Link>
            </Button>
          }
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="Filtrelere uyan sipariş yok"
          description="Tarih veya arama filtresini temizleyip tekrar deneyin."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setRange(openQueueDateRange());
                setCustomerQuery("");
              }}
            >
              Filtreleri temizle
            </Button>
          }
        />
      ) : (
        <StoreOrdersTable orders={filteredOrders} currency={merchant.currency} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <NavTile
          href={DASHBOARD_ROUTES.onlineOrderOrders}
          icon={<ClipboardList className="h-8 w-8" />}
          title="Siparişler"
          description="Gelen siparişleri onaylayın, hazırlayın ve teslim edin."
        />
        <NavTile
          href={DASHBOARD_ROUTES.onlineOrderProducts}
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="Ürünler"
          description="Mağaza kataloğunuzu QR menüden bağımsız yönetin."
        />
        <NavTile
          href={DASHBOARD_ROUTES.onlineOrderCouriers}
          icon={<Bike className="h-8 w-8" />}
          title="Kuryeler"
          description="Kuryelerinizi tanımlayın ve siparişlere atayın."
        />
        <NavTile
          href={DASHBOARD_ROUTES.courierPanel}
          icon={<Bike className="h-8 w-8" />}
          title="Kurye uygulaması"
          description="Teslimat panosunu yeni sekmede açın. Personel hesabı Kullanıcılar’dan eklenir."
          external
        />
        <NavTile
          href={DASHBOARD_ROUTES.onlineOrderSettings}
          icon={<Settings className="h-8 w-8" />}
          title="Ayarlar"
          description="Teslimat ayarları, çalışma saatleri ve mağaza adresi."
        />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${DASHBOARD_PANEL} space-y-1`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function NavTile({
  href,
  icon,
  title,
  description,
  external = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  external?: boolean;
}) {
  const className = `flex items-start gap-3 ${DASHBOARD_TILE}`;
  const body = (
    <>
      <span className="text-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
