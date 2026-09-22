"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { invalidateBranches } from "@/hooks/use-branches";
import { ApiError, getApiErrorCode } from "@/lib/api";
import { createBranchRequest } from "@/lib/branch";
import Link from "next/link";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import { createMenuWaiter, WaiterApiError } from "@/lib/waiter-api";

export default function BranchCreateView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { accessLoading: menuAccessLoading, canUseDigitalMenu } = useDigitalMenuAccess();
  const { accessLoading: waiterAccessLoading, canUseWaiterPanel } = useWaiterPanelAccess();
  const accessLoading = menuAccessLoading || waiterAccessLoading;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [waiterDisplayName, setWaiterDisplayName] = useState("");
  const [waiterUsername, setWaiterUsername] = useState("");
  const [waiterPassword, setWaiterPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      notify("warning", "Şube adı zorunludur.");
      return;
    }
    const waiterName = waiterDisplayName.trim();
    const waiterUser = waiterUsername.trim();
    const waiterPass = waiterPassword;
    const waiterStarted = Boolean(waiterName || waiterUser || waiterPass);
    if (canUseWaiterPanel && waiterStarted && (!waiterName || !waiterUser || waiterPass.length < 6)) {
      notify("warning", "Garson hesabı için görünen ad, kullanıcı adı ve en az 6 karakter şifre gerekir.");
      return;
    }
    setSaving(true);
    try {
      const created = await createBranchRequest({
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      await invalidateBranches(queryClient);
      if (canUseWaiterPanel && waiterName && waiterUser && waiterPass.length >= 6) {
        try {
          await createMenuWaiter(created.id, {
            username: waiterUser,
            password: waiterPass,
            displayName: waiterName,
            staffRole: "WAITER",
          });
        } catch (waiterError) {
          notify(
            "warning",
            waiterError instanceof WaiterApiError
              ? `Şube oluşturuldu ancak garson hesabı eklenemedi: ${waiterError.message}`
              : "Şube oluşturuldu ancak garson hesabı eklenemedi. Kullanıcılar sayfasından ekleyebilirsiniz.",
          );
          router.push(DASHBOARD_ROUTES.digitalMenuCreateForBranch(created.id));
          return;
        }
      }
      notify("info", "Şube oluşturuldu.");
      router.push(DASHBOARD_ROUTES.digitalMenuCreateForBranch(created.id));
    } catch (error) {
      if (getApiErrorCode(error) === "EXTRA_BRANCH_REQUIRED") {
        router.push(DASHBOARD_ROUTES.catalogProductCheckout("QR_BRANCH"));
        return;
      }
      notify("danger", error instanceof ApiError ? error.message : "Şube oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  if (accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader title="Yeni şube" hint="İsim, adres ve iletişim bilgilerini girin." />
        <DashboardLoadingState label="Şube formu hazırlanıyor…" />
      </div>
    );
  }

  if (!canUseDigitalMenu) {
    return <p className="text-sm text-muted-foreground">Şube eklemek için aktif paket gerekir.</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Yeni şube"
        hint="İsim, adres ve iletişim bilgilerini girin."
        back={
          <Link href={DASHBOARD_ROUTES.digitalMenu} aria-label="Menüye dön" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />
      <div className={`${DASHBOARD_PANEL} space-y-4`}>
        <div className="space-y-2">
          <Label htmlFor="branch-name">Şube adı</Label>
          <Input id="branch-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-address">Adres</Label>
          <Input id="branch-address" value={address} onChange={(event) => setAddress(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-phone">Telefon</Label>
          <Input id="branch-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-email">E-posta</Label>
          <Input id="branch-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      </div>
      {canUseWaiterPanel ? (
        <div className={`${DASHBOARD_PANEL} space-y-4`}>
          <div>
            <h2 className="text-base font-semibold text-foreground">Garson hesabı</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Bu şube için yalnızca garson hesabı açılır. Mutfak yoksa sonra şube ayarlarından ekleyebilirsiniz.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waiter-display">Görünen ad</Label>
            <Input
              id="waiter-display"
              value={waiterDisplayName}
              onChange={(event) => setWaiterDisplayName(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waiter-username">Kullanıcı adı</Label>
            <Input
              id="waiter-username"
              value={waiterUsername}
              onChange={(event) => setWaiterUsername(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waiter-password">Şifre</Label>
            <Input
              id="waiter-password"
              type="password"
              value={waiterPassword}
              onChange={(event) => setWaiterPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
            />
          </div>
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(DASHBOARD_ROUTES.digitalMenu)}>
          Vazgeç
        </Button>
        <Button variant="hero" disabled={saving} onClick={() => void submit()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Şube oluştur"}
        </Button>
      </div>
    </div>
  );
}
