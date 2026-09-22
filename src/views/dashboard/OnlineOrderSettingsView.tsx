"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { StoreLinkCard } from "@/components/dashboard/store/StoreLinkCard";
import { StoreWorkingHoursEditor } from "@/components/dashboard/store/StoreWorkingHoursEditor";
import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { STORE_QUERY_KEYS, useMyStore } from "@/hooks/use-store";
import { ApiError } from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  updateMyStore,
  type StoreBusinessInfo,
  type StoreDeliverySettings,
  type StoreDeliveryType,
  type StorePaymentMethod,
  type StoreUpdatePayload,
} from "@/lib/store-api";
import { STORE_DELIVERY_TYPE_LABEL, STORE_PAYMENT_METHOD_LABEL } from "@/lib/store-ui";
import { cn } from "@/lib/utils";

export default function OnlineOrderSettingsView() {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { merchant, isLoading } = useMyStore();

  const [business, setBusiness] = useState<StoreBusinessInfo | null>(null);
  const [delivery, setDelivery] = useState<StoreDeliverySettings | null>(null);
  const [loadedMerchantId, setLoadedMerchantId] = useState<number | null>(null);

  if (merchant && loadedMerchantId !== merchant.id) {
    setLoadedMerchantId(merchant.id);
    setBusiness(merchant.business);
    setDelivery(merchant.delivery);
  }

  const saveMutation = useMutation({
    mutationFn: (payload: StoreUpdatePayload) => updateMyStore(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(STORE_QUERY_KEYS.merchant, updated);
      notify("info", "Mağaza ayarları kaydedildi.");
    },
    onError: (error) => {
      notify("danger", error instanceof ApiError ? error.message : "Ayarlar kaydedilemedi.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor…
      </div>
    );
  }

  if (!merchant || !business || !delivery) {
    return (
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <p className="text-sm text-muted-foreground">Önce mağazanızı kurmanız gerekiyor.</p>
        <Link href={DASHBOARD_ROUTES.onlineOrderSetup} className="text-sm font-medium underline">
          Kurulumu başlat
        </Link>
      </div>
    );
  }

  const updateBusiness = (patch: Partial<StoreBusinessInfo>) =>
    setBusiness({ ...business, ...patch });
  const updateDelivery = (patch: Partial<StoreDeliverySettings>) =>
    setDelivery({ ...delivery, ...patch });

  const toggleValue = <TValue extends string>(list: TValue[], value: TValue): TValue[] =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Mağaza ayarları"
        hint="Teslimat kuralları, çalışma saatleri ve mağaza adresi."
        back={
          <Link href={DASHBOARD_ROUTES.onlineOrder} aria-label="Geri" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        action={
          <Button
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ business, delivery })}
          >
            {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        }
      />

      <StoreLinkCard merchant={merchant} />

      <section className={`${DASHBOARD_PANEL} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Siparişe kapat</h2>
            <p className="text-xs text-muted-foreground">
              Açıkken çalışma saatlerinden bağımsız olarak sipariş alınmaz.
            </p>
          </div>
          <Button
            variant={merchant.manuallyClosed ? "default" : "outline"}
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ manuallyClosed: !merchant.manuallyClosed })}
          >
            {merchant.manuallyClosed ? "Mağazayı aç" : "Mağazayı kapat"}
          </Button>
        </div>
      </section>

      <section className={`${DASHBOARD_PANEL} space-y-4`}>
        <h2 className="text-sm font-semibold text-foreground">İşletme bilgileri</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="İşletme adı">
            <input
              className={INPUT_CLASS}
              value={business.businessName}
              onChange={(event) => updateBusiness({ businessName: event.target.value })}
            />
          </Field>
          <Field label="Telefon">
            <input
              className={INPUT_CLASS}
              value={business.phone ?? ""}
              onChange={(event) => updateBusiness({ phone: event.target.value })}
            />
          </Field>
          <Field label="E-posta">
            <input
              className={INPUT_CLASS}
              value={business.email ?? ""}
              onChange={(event) => updateBusiness({ email: event.target.value })}
            />
          </Field>
          <Field label="İl">
            <input
              className={INPUT_CLASS}
              value={business.city ?? ""}
              onChange={(event) => updateBusiness({ city: event.target.value })}
            />
          </Field>
          <Field label="İlçe">
            <input
              className={INPUT_CLASS}
              value={business.district ?? ""}
              onChange={(event) => updateBusiness({ district: event.target.value })}
            />
          </Field>
          <Field label="Adres" className="sm:col-span-2">
            <textarea
              className={`${INPUT_CLASS} min-h-[80px] py-2`}
              value={business.address ?? ""}
              onChange={(event) => updateBusiness({ address: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className={`${DASHBOARD_PANEL} space-y-4`}>
        <h2 className="text-sm font-semibold text-foreground">Teslimat</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum sepet tutarı (₺)">
            <input
              type="number"
              min={0}
              className={INPUT_CLASS}
              value={delivery.minOrderAmount}
              onChange={(event) => updateDelivery({ minOrderAmount: Number(event.target.value) })}
            />
          </Field>
          <Field label="Teslimat ücreti (₺)">
            <input
              type="number"
              min={0}
              className={INPUT_CLASS}
              value={delivery.deliveryFee}
              onChange={(event) => updateDelivery({ deliveryFee: Number(event.target.value) })}
            />
          </Field>
          <Field label="Ücretsiz teslimat eşiği (₺)">
            <input
              type="number"
              min={0}
              className={INPUT_CLASS}
              value={delivery.freeDeliveryThreshold ?? ""}
              onChange={(event) =>
                updateDelivery({
                  freeDeliveryThreshold: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </Field>
          <Field label="Ortalama hazırlık süresi (dk)">
            <input
              type="number"
              min={0}
              className={INPUT_CLASS}
              value={delivery.avgPrepMinutes}
              onChange={(event) => updateDelivery({ avgPrepMinutes: Number(event.target.value) })}
            />
          </Field>
          <Field label="Teslimat yarıçapı (km)">
            <input
              type="number"
              min={0}
              step="0.5"
              className={INPUT_CLASS}
              value={delivery.deliveryRadiusKm ?? ""}
              onChange={(event) =>
                updateDelivery({
                  deliveryRadiusKm: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </Field>
        </div>

        <Field label="Teslimat türleri">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STORE_DELIVERY_TYPE_LABEL) as StoreDeliveryType[]).map((type) => (
              <TogglePill
                key={type}
                selected={delivery.deliveryTypes.includes(type)}
                label={STORE_DELIVERY_TYPE_LABEL[type]}
                onToggle={() => updateDelivery({ deliveryTypes: toggleValue(delivery.deliveryTypes, type) })}
              />
            ))}
          </div>
        </Field>

        <Field label="Ödeme yöntemleri">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STORE_PAYMENT_METHOD_LABEL) as StorePaymentMethod[]).map((method) => (
              <TogglePill
                key={method}
                selected={delivery.paymentMethods.includes(method)}
                label={STORE_PAYMENT_METHOD_LABEL[method]}
                onToggle={() =>
                  updateDelivery({ paymentMethods: toggleValue(delivery.paymentMethods, method) })
                }
              />
            ))}
          </div>
        </Field>
      </section>

      <section className={`${DASHBOARD_PANEL} space-y-4`}>
        <h2 className="text-sm font-semibold text-foreground">Çalışma saatleri</h2>
        <StoreWorkingHoursEditor
          value={delivery.workingHours}
          onChange={(workingHours) => updateDelivery({ workingHours })}
        />
      </section>
    </div>
  );
}

const INPUT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-xs leading-4 text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TogglePill({
  selected,
  label,
  onToggle,
}: {
  selected: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        selected ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
