"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";

import { Choice, Field } from "@/components/dashboard/console/ConsoleDialogs";
import { copyTextToClipboard } from "@/components/dashboard/qr/qr-actions";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import { MENU_APP_ORIGIN } from "@/lib/config";
import {
  MAINTENANCE_KINDS,
  MAINTENANCE_KIND_LABELS,
  addConsoleExpense,
  deviceQrLink,
  formatClock,
  formatTl,
  listMaintenanceLogs,
  parseRateInput,
  rotateConsoleToken,
  toNumber,
  type GameConsole,
  type MaintenanceKind,
} from "@/lib/console-api";
import { CONSOLE_DIALOG } from "@/components/dashboard/console/console-ui";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const KIND_OPTIONS = MAINTENANCE_KINDS.map((kind) => ({ value: kind, label: MAINTENANCE_KIND_LABELS[kind] }));

// ---- Maintenance start / end ---------------------------------------------------------------------------------

export function MaintenanceStartDialog({
  device,
  pending,
  onOpenChange,
  onSubmit,
}: {
  device: GameConsole | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { kind: MaintenanceKind; note?: string }) => void;
}) {
  return (
    <Dialog open={device != null} onOpenChange={onOpenChange}>
      <DialogContent className={CONSOLE_DIALOG}>
        <DialogHeader>
          <DialogTitle>{device?.name} bakıma alınsın</DialogTitle>
          <DialogDescription>Bakımdaki cihazda oturum başlatılamaz ve oturum ona taşınamaz.</DialogDescription>
        </DialogHeader>
        {device ? <MaintenanceStartForm key={device.id} pending={pending} onSubmit={onSubmit} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceStartForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (payload: { kind: MaintenanceKind; note?: string }) => void;
}) {
  const [kind, setKind] = useState<MaintenanceKind>("REPAIR");
  const [note, setNote] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ kind, note: note.trim() || undefined });
      }}
    >
      <div className="space-y-1.5">
        <Label>Neden</Label>
        <Choice<MaintenanceKind> options={KIND_OPTIONS} value={kind} onChange={setKind} />
      </div>
      <Field label="Not (isteğe bağlı)" htmlFor="maintenance-note">
        <Input
          id="maintenance-note"
          value={note}
          maxLength={255}
          placeholder="Ör. sağ kol tetik arızası"
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Bakıma al
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MaintenanceEndDialog({
  device,
  pending,
  onOpenChange,
  onSubmit,
}: {
  device: GameConsole | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { cost?: string; note?: string }) => void;
}) {
  return (
    <Dialog open={device != null} onOpenChange={onOpenChange}>
      <DialogContent className={CONSOLE_DIALOG}>
        <DialogHeader>
          <DialogTitle>{device?.name} bakımı bitsin</DialogTitle>
          <DialogDescription>
            {device?.maintenanceNote ? `${device.maintenanceNote} · ` : ""}
            {device?.maintenanceSince ? `${formatClock(device.maintenanceSince)} beri bakımda` : "Cihaz tekrar kullanılabilir olur."}
          </DialogDescription>
        </DialogHeader>
        {device ? <MaintenanceEndForm key={device.id} pending={pending} onSubmit={onSubmit} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceEndForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (payload: { cost?: string; note?: string }) => void;
}) {
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const parsedCost = parseRateInput(cost);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (parsedCost === undefined) return;
        onSubmit({ cost: parsedCost ?? undefined, note: note.trim() || undefined });
      }}
    >
      <Field label="Masraf (₺, isteğe bağlı)" htmlFor="maintenance-cost">
        <Input
          id="maintenance-cost"
          inputMode="decimal"
          className="w-40"
          value={cost}
          onChange={(event) => setCost(event.target.value)}
        />
        {parsedCost === undefined ? <p className="text-xs text-destructive">Geçerli bir tutar girin.</p> : null}
      </Field>
      <Field label="Not (isteğe bağlı)" htmlFor="maintenance-end-note">
        <Input id="maintenance-end-note" value={note} maxLength={255} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <p className="text-xs text-muted-foreground">Masraf kârlılık raporunda cihazın giderine eklenir.</p>
      <DialogFooter>
        <Button type="submit" disabled={pending || parsedCost === undefined}>
          Bakımı bitir
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---- QR link -------------------------------------------------------------------------------------------------

/**
 * The device's public page (status, remaining time, extension request). The dashboard has no QR image generator,
 * so the link is shown to copy or open; any QR tool can print it.
 */
export function DeviceQrDialog({
  device,
  onOpenChange,
  onRotated,
}: {
  device: GameConsole | null;
  onOpenChange: (open: boolean) => void;
  onRotated: () => Promise<unknown>;
}) {
  const { notify } = useDashboardBanners();
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [token, setToken] = useState<{ id: number; value: string | null } | null>(null);
  const publicToken = device ? (token?.id === device.id ? token.value : device.publicToken) : null;
  const link = publicToken ? deviceQrLink(MENU_APP_ORIGIN, publicToken) : null;

  const rotate = useMutation({
    mutationFn: (consoleId: number) => rotateConsoleToken(consoleId),
    onSuccess: async (updated) => {
      setConfirmRotate(false);
      setToken({ id: updated.id, value: updated.publicToken ?? null });
      await onRotated();
      notify("info", "Yeni bağlantı oluşturuldu; eski QR artık açılmaz.");
    },
    onError: (error) => {
      setConfirmRotate(false);
      notify("danger", errorMessage(error, "Bağlantı yenilenemedi"));
    },
  });

  return (
    <>
      <Dialog open={device != null} onOpenChange={onOpenChange}>
        <DialogContent className={CONSOLE_DIALOG}>
          <DialogHeader>
            <DialogTitle>{device?.name} · QR kodu</DialogTitle>
            <DialogDescription>
              Müşteri cihazın üstündeki QR&apos;ı okutunca kalan süreyi, tutarı görür ve süre uzatma isteyebilir.
            </DialogDescription>
          </DialogHeader>
          {link ? (
            <div className="space-y-3">
              <div className="break-all rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">{link}</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(link);
                    notify(ok ? "info" : "warning", ok ? "Bağlantı kopyalandı" : "Kopyalanamadı");
                  }}
                >
                  <Copy className="mr-1 h-4 w-4" aria-hidden />
                  Kopyala
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" aria-hidden />
                    Aç
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={rotate.isPending}
                  onClick={() => setConfirmRotate(true)}
                >
                  <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
                  Bağlantıyı yenile
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                QR görselini bu bağlantıyla herhangi bir QR oluşturucudan basabilirsiniz. Bağlantıyı yenilerseniz
                eski QR çalışmaz; yenisini basmanız gerekir.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Bu cihazın henüz bir bağlantısı yok.</p>
              <Button
                type="button"
                size="sm"
                disabled={rotate.isPending || device == null}
                onClick={() => device && rotate.mutate(device.id)}
              >
                Bağlantı oluştur
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bağlantı yenilensin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Cihaza yapıştırılmış eski QR kod artık açılmaz. Yeni QR&apos;ı basıp değiştirmeniz gerekir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => device && rotate.mutate(device.id)}>Yenile</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- Maintenance log and expenses (inside the device editor) -------------------------------------------------

export function MaintenanceLogSection({ device, onChanged }: { device: GameConsole; onChanged: () => Promise<unknown> }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [kind, setKind] = useState<MaintenanceKind>("CONTROLLER");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const parsedCost = parseRateInput(cost);
  const logs = useQuery({
    queryKey: ["console-maintenance-logs", device.id],
    queryFn: () => listMaintenanceLogs(device.id),
  });
  const add = useMutation({
    mutationFn: () =>
      addConsoleExpense(device.id, { kind, cost: parsedCost as string, note: note.trim() || undefined }),
    onSuccess: async () => {
      setCost("");
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["console-maintenance-logs", device.id] }),
        queryClient.invalidateQueries({ queryKey: ["console-profitability"] }),
        onChanged(),
      ]);
      notify("info", "Masraf eklendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Masraf eklenemedi")),
  });
  const total = (logs.data ?? []).reduce((sum, log) => sum + toNumber(log.cost), 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (parsedCost == null) return;
    add.mutate();
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-foreground">Bakım ve masraflar</p>
        {total > 0 ? <p className="text-xs text-muted-foreground">Toplam {formatTl(total)}</p> : null}
      </div>
      {(logs.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">{logs.isLoading ? "Yükleniyor…" : "Kayıt yok."}</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
          {(logs.data ?? []).map((log) => (
            <li key={log.id} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {formatClock(log.startedAt)}
                {log.endedAt && log.endedAt !== log.startedAt ? `–${formatClock(log.endedAt)}` : ""} ·{" "}
                {MAINTENANCE_KIND_LABELS[log.kind as MaintenanceKind] ?? log.kind ?? "—"}
                {log.note ? ` · ${log.note}` : ""}
              </span>
              <span className="tabular-nums">{toNumber(log.cost) > 0 ? formatTl(log.cost) : "—"}</span>
            </li>
          ))}
        </ul>
      )}
      <form className="space-y-2" onSubmit={submit}>
        <Label>Masraf ekle (cihaz çalışmaya devam eder)</Label>
        <Choice<MaintenanceKind> options={KIND_OPTIONS} value={kind} onChange={setKind} />
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label="Masraf tutarı"
            className="w-28"
            inputMode="decimal"
            placeholder="₺"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
          />
          <Input
            aria-label="Masraf notu"
            className="min-w-0 flex-1"
            placeholder="Not (ör. yeni kol)"
            maxLength={255}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button type="submit" size="sm" variant="outline" disabled={add.isPending || parsedCost == null}>
            Ekle
          </Button>
        </div>
      </form>
    </div>
  );
}
