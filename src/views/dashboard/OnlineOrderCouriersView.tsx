"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { STORE_QUERY_KEYS, useMyStore, useStoreCouriers } from "@/hooks/use-store";
import { ApiError } from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_LIST_ITEM, DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  createStoreCourier,
  deleteStoreCourier,
  updateStoreCourier,
  type StoreCourier,
  type StoreCourierPayload,
  type StoreCourierVehicleType,
} from "@/lib/store-api";
import { STORE_VEHICLE_TYPE_LABEL } from "@/lib/store-ui";
import { TONE_ACTION } from "@/components/dashboard/tone";

const EMPTY_FORM: StoreCourierPayload = {
  fullName: "",
  phone: "",
  vehicleType: "MOTORCYCLE",
  active: true,
};

export default function OnlineOrderCouriersView() {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { merchant, isLoading: merchantLoading } = useMyStore();
  const couriersQuery = useStoreCouriers(Boolean(merchant));

  const [form, setForm] = useState<StoreCourierPayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.couriers });
  const reportError = (error: unknown, fallback: string) =>
    notify("danger", error instanceof ApiError ? error.message : fallback);

  const saveMutation = useMutation({
    mutationFn: (payload: StoreCourierPayload) =>
      editingId == null ? createStoreCourier(payload) : updateStoreCourier(editingId, payload),
    onSuccess: async () => {
      await invalidate();
      notify("info", editingId == null ? "Kurye eklendi." : "Kurye güncellendi.");
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: (error) => reportError(error, "Kurye kaydedilemedi."),
  });

  const deleteMutation = useMutation({
    mutationFn: (courierId: number) => deleteStoreCourier(courierId),
    onSuccess: async () => {
      await invalidate();
      notify("info", "Kurye silindi.");
    },
    onError: (error) => reportError(error, "Kurye silinemedi."),
  });

  if (merchantLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor…
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <p className="text-sm text-muted-foreground">Önce mağazanızı kurmanız gerekiyor.</p>
        <Link href={DASHBOARD_ROUTES.onlineOrderSetup} className="text-sm font-medium underline">
          Kurulumu başlat
        </Link>
      </div>
    );
  }

  const couriers = couriersQuery.data ?? [];
  const canSave = form.fullName.trim().length > 0 && form.phone.trim().length > 0;

  const startEdit = (courier: StoreCourier) => {
    setEditingId(courier.id);
    setForm({
      fullName: courier.fullName,
      phone: courier.phone,
      vehicleType: courier.vehicleType,
      active: courier.active,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Kuryeler"
        hint="Kuryelerinizi tanımlayın, sipariş detayından atama yapın. Teslimat panosu kurye uygulamasındadır."
        back={
          <Link href={DASHBOARD_ROUTES.onlineOrder} aria-label="Geri" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        action={
          <Button asChild>
            <a href={DASHBOARD_ROUTES.courierPanel} target="_blank" rel="noopener noreferrer">
              Kurye uygulamasını aç
            </a>
          </Button>
        }
      />

      <div className={`${DASHBOARD_PANEL} space-y-4`}>
        <h2 className="text-sm font-semibold text-foreground">
          {editingId == null ? "Yeni kurye" : "Kuryeyi düzenle"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Ad soyad"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          />
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Telefon"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.vehicleType}
            onChange={(event) =>
              setForm({ ...form, vehicleType: event.target.value as StoreCourierVehicleType })
            }
          >
            {(Object.keys(STORE_VEHICLE_TYPE_LABEL) as StoreCourierVehicleType[]).map((type) => (
              <option key={type} value={type}>
                {STORE_VEHICLE_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
            {editingId == null ? "Kurye ekle" : "Kaydet"}
          </Button>
          {editingId != null ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              Vazgeç
            </Button>
          ) : null}
        </div>
      </div>

      {couriersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Kuryeler yükleniyor…</p>
      ) : couriers.length === 0 ? (
        <div className={`${DASHBOARD_PANEL} text-sm text-muted-foreground`}>
          Henüz kurye eklemediniz.
        </div>
      ) : (
        <div className="space-y-2">
          {couriers.map((courier) => (
            <div key={courier.id} className={`${DASHBOARD_LIST_ITEM} flex items-center gap-3`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{courier.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {courier.phone} · {STORE_VEHICLE_TYPE_LABEL[courier.vehicleType]} ·{" "}
                  {courier.active ? "Aktif" : "Pasif"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${TONE_ACTION.edit}`} onClick={() => startEdit(courier)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${TONE_ACTION.delete}`}
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm(`${courier.fullName} silinsin mi?`)) return;
                  deleteMutation.mutate(courier.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
