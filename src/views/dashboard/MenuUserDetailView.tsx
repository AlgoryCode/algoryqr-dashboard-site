"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { StaffBranchAssignForm } from "@/components/dashboard/staff/StaffRosterControls";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { formatBranchListLabel, type BranchItem } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { useBranches } from "@/hooks/use-branches";
import {
  assignMerchantStaffBranch,
  listMerchantStaff,
  MERCHANT_STAFF_QUERY_KEY,
  parseStaffRole,
  STAFF_ROLE_LABEL,
  WaiterApiError,
  updateMerchantStaff,
} from "@/lib/personnel-management-api";

type MenuUserDetailViewProps = {
  waiterId: number;
};

function formatJoinedAt(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function staffBranchLabel(branches: BranchItem[], branchId?: number | null): string {
  if (branchId == null) return "Şubesiz";
  const branch = branches.find((item) => item.id === branchId);
  return branch ? formatBranchListLabel(branch) : `#${branchId}`;
}

export default function MenuUserDetailView({ waiterId }: MenuUserDetailViewProps) {
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionType, setCommissionType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [commissionScope, setCommissionScope] = useState<"PER_ITEM" | "BILL_TOTAL">("PER_ITEM");
  const [commissionValue, setCommissionValue] = useState("");
  const [accountAction, setAccountAction] = useState<"deactivate" | "activate" | null>(null);

  const { accessLoading, accessError, retryAccess, canUseWaiterPanel } = useWaiterPanelAccess();
  const branchesQuery = useBranches(canUseWaiterPanel && !accessLoading);
  const branches = branchesQuery.data?.content ?? [];

  const usersQuery = useQuery({
    queryKey: MERCHANT_STAFF_QUERY_KEY,
    enabled: canUseWaiterPanel && !accessLoading,
    queryFn: listMerchantStaff,
  });

  const member = useMemo(
    () => (usersQuery.data ?? []).find((w) => w.id === waiterId) ?? null,
    [usersQuery.data, waiterId],
  );

  useEffect(() => {
    if (!member) return;
    setCommissionEnabled(Boolean(member.commissionEnabled));
    setCommissionType(member.commissionType === "FIXED" ? "FIXED" : "PERCENT");
    setCommissionScope(member.commissionScope === "BILL_TOTAL" ? "BILL_TOTAL" : "PER_ITEM");
    const raw = member.commissionValue;
    if (raw == null || raw === "") {
      setCommissionValue("");
      return;
    }
    setCommissionValue(String(raw));
  }, [member]);

  const backHref = DASHBOARD_ROUTES.menuUsers;

  const updateMutation = useMutation({
    mutationFn: (payload: {
      password?: string;
      active?: boolean;
      commissionEnabled?: boolean;
      commissionType?: "PERCENT" | "FIXED";
      commissionScope?: "PER_ITEM" | "BILL_TOTAL";
      commissionValue?: number;
    }) => updateMerchantStaff(waiterId, payload),
    onSuccess: async (_data, vars) => {
      if (vars.password) setPassword("");
      await queryClient.invalidateQueries({ queryKey: MERCHANT_STAFF_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["menu-users"] });
      if (vars.active === true) {
        notify("info", "Kullanıcı aktifleştirildi.");
      } else if (vars.active === false) {
        notify("info", "Kullanıcı pasifleştirildi.");
      } else {
        notify("info", "Kullanıcı güncellendi.");
      }
    },
    onError: (err) => {
      notify("danger", err instanceof WaiterApiError ? err.message : "Güncelleme başarısız.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (branchId: number | null) => assignMerchantStaffBranch(waiterId, branchId),
    onSuccess: async (_data, branchId) => {
      await queryClient.invalidateQueries({ queryKey: MERCHANT_STAFF_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["menu-users"] });
      await queryClient.invalidateQueries({ queryKey: ["branchDetailUsers"] });
      notify("info", branchId == null ? "Personel şubeden çıkarıldı." : "Personel şubeye atandı.");
    },
    onError: (err) => {
      notify("danger", err instanceof WaiterApiError ? err.message : "Şube ataması yapılamadı.");
    },
  });

  if (accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personel detayı" hint="Personel hesabı" />
        <DashboardLoadingState label="Kullanıcı bilgileri yükleniyor…" />
      </div>
    );
  }

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (!canUseWaiterPanel) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personel detayı" hint="Personel hesabı" />
        <p className="text-sm text-muted-foreground">Personel paneli bu hesapta açık değil.</p>
      </div>
    );
  }

  const busy = updateMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title={member?.displayName || "Personel detayı"}
        hint={`${STAFF_ROLE_LABEL[parseStaffRole(member?.staffRole)]} hesabı`}
        back={
          <Link href={backHref} aria-label="Personeller listesine dön" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      {usersQuery.isLoading ? (
        <DashboardLoadingState label="Kullanıcı bilgileri yükleniyor…" />
      ) : !member ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Kullanıcı bulunamadı.</p>
          <Button variant="outline" asChild>
            <Link href={backHref}>Listeye dön</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <section className={`${DASHBOARD_SURFACE} p-4 space-y-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-foreground">{member.displayName}</p>
              <span
                className={
                  member.active
                    ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
                    : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                }
              >
                {member.active ? "Aktif" : "Pasif"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">@{member.username}</p>
            <p className="text-sm text-muted-foreground">
              Şube:{" "}
              <span className="font-medium text-foreground">
                {staffBranchLabel(branches, member.branchId)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Rol: {STAFF_ROLE_LABEL[parseStaffRole(member.staffRole)]}
            </p>
            <p className="text-sm text-muted-foreground">
              {member.branchId == null
                ? "Şube atanana kadar bu hesap giriş yapınca işlem göremez."
                : "Bu hesap yalnızca kendi şubesinin işlemlerini görür."}
            </p>
            <p className="text-sm text-muted-foreground">
              Eklenme: {formatJoinedAt(member.createdAt)}
            </p>
          </section>

          <section className={`${DASHBOARD_SURFACE} space-y-3 p-4`}>
            <h2 className="text-base font-semibold">Şube</h2>
            <StaffBranchAssignForm
              staffRole={parseStaffRole(member.staffRole)}
              branchId={member.branchId ?? null}
              branches={branches}
              pending={assignMutation.isPending}
              onAssign={(branchId) => assignMutation.mutate(branchId)}
            />
          </section>

          <section className={`${DASHBOARD_SURFACE} space-y-3 p-4`}>
            <h2 className="text-base font-semibold">Şifre sıfırla</h2>
            <div className="space-y-1.5">
              <Label htmlFor="detail-password">Yeni şifre</Label>
              <Input
                id="detail-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <Button
              type="button"
              disabled={busy || password.trim().length < 6}
              onClick={() => updateMutation.mutate({ password: password.trim() })}
            >
              {updateMutation.isPending && password ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Şifreyi güncelle"
              )}
            </Button>
          </section>

          {member.staffRole !== "KITCHEN" && member.staffRole !== "COURIER" ? (
          <section className={`${DASHBOARD_SURFACE} space-y-3 p-4`}>
            <h2 className="text-base font-semibold">Komisyon</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={commissionEnabled}
                onChange={(e) => setCommissionEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Komisyon ile çalışır
            </label>
            {commissionEnabled ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm ${
                      commissionScope === "PER_ITEM"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setCommissionScope("PER_ITEM")}
                  >
                    Ürün başına
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm ${
                      commissionScope === "BILL_TOTAL"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setCommissionScope("BILL_TOTAL")}
                  >
                    Hesap toplamı
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm ${
                      commissionType === "PERCENT"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setCommissionType("PERCENT")}
                  >
                    Yüzde (%)
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm ${
                      commissionType === "FIXED"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setCommissionType("FIXED")}
                  >
                    Sabit tutar (TL)
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="commission-value">
                    {commissionType === "PERCENT" ? "Yüzde değeri" : "Sabit tutar"}
                  </Label>
                  <Input
                    id="commission-value"
                    type="number"
                    min={0}
                    max={commissionType === "PERCENT" ? 100 : undefined}
                    step={commissionType === "PERCENT" ? "0.1" : "0.01"}
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                    placeholder={commissionType === "PERCENT" ? "örn. 5" : "örn. 50"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {commissionType === "PERCENT"
                      ? "Her onaylanan sipariş toplamı üzerinden hesaplanır."
                      : "Komisyon muaf ürünler hariç, adisyona eklenen her ürün adedi için uygulanır."}
                  </p>
                </div>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (commissionEnabled) {
                  const parsed = Number.parseFloat(commissionValue);
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    notify("danger", "Geçerli bir komisyon değeri girin.");
                    return;
                  }
                  if (commissionType === "PERCENT" && parsed > 100) {
                    notify("danger", "Yüzde komisyon 100'den büyük olamaz.");
                    return;
                  }
                  updateMutation.mutate({
                    commissionEnabled: true,
                    commissionType,
                    commissionScope,
                    commissionValue: parsed,
                  });
                  return;
                }
                updateMutation.mutate({ commissionEnabled: false });
              }}
            >
              Komisyon ayarını kaydet
            </Button>
          </section>
          ) : null}

          <section className={`${DASHBOARD_SURFACE} p-4`}>
            <h2 className="text-base font-semibold">Hesap</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {member.active
                ? "Pasifleştirilen kullanıcı giriş yapamaz."
                : "Aktifleştirilen kullanıcı tekrar giriş yapabilir."}
            </p>
            {member.active ? (
              <Button
                type="button"
                variant="destructive"
                className="mt-3"
                disabled={busy}
                onClick={() => setAccountAction("deactivate")}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Pasifleştir"
                )}
              </Button>
            ) : (
              <Button
                type="button"
                className="mt-3"
                disabled={busy}
                onClick={() => setAccountAction("activate")}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Aktifleştir"
                )}
              </Button>
            )}
          </section>
        </div>
      )}

      <AlertDialog
        open={accountAction != null}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) {
            setAccountAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {accountAction === "activate" ? "Garson aktifleştirilsin mi?" : "Garson pasifleştirilsin mi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {accountAction === "activate" ? (
                <>
                  <span className="font-medium text-foreground">{member?.displayName}</span> tekrar
                  giriş yapabilecek.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">{member?.displayName}</span> giriş
                  yapamayacak.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateMutation.isPending}
              className={accountAction === "deactivate" ? "bg-destructive hover:bg-destructive/90" : undefined}
              onClick={(event) => {
                event.preventDefault();
                if (!accountAction) return;
                updateMutation.mutate(
                  { active: accountAction === "activate" },
                  {
                    onSuccess: () => setAccountAction(null),
                  },
                );
              }}
            >
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {accountAction === "activate" ? "Aktifleştir" : "Pasifleştir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
