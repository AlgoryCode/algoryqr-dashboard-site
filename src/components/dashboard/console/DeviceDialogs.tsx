"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, ExternalLink, Printer, RefreshCw } from "lucide-react";

import { Choice, Field } from "@/components/dashboard/console/ConsoleDialogs";
import { copyTextToClipboard, downloadQrImage, getQrDataUrl } from "@/components/dashboard/qr/qr-actions";
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
import {
  MAINTENANCE_KINDS,
  MAINTENANCE_KIND_LABELS,
  addConsoleExpense,
  formatClock,
  getConsoleQr,
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

// ---- QR code ---------------------------------------------------------------------------------------------------

/**
 * The device's QR: the customer scans it to see the remaining time and amount and to ask for more time. Shown,
 * downloaded and printed from here; renewing the link is confirmed inside the same dialog.
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
  const queryClient = useQueryClient();
  const [view, setView] = useState<"qr" | "confirm">("qr");
  const [renewed, setRenewed] = useState(false);
  const consoleId = device?.id ?? null;

  const qr = useQuery({
    queryKey: ["console", "qr", consoleId],
    queryFn: () => getConsoleQr(consoleId as number),
    enabled: consoleId != null,
    staleTime: 60_000,
  });

  const rotate = useMutation({
    mutationFn: (id: number) => rotateConsoleToken(id),
    onSuccess: async () => {
      setView("qr");
      setRenewed(true);
      await queryClient.invalidateQueries({ queryKey: ["console", "qr", consoleId] });
      await onRotated();
    },
    onError: (error) => notify("danger", errorMessage(error, "Bağlantı yenilenemedi")),
  });

  const close = (open: boolean) => {
    if (!open) {
      setView("qr");
      setRenewed(false);
    }
    onOpenChange(open);
  };

  const data = qr.data;
  const imageUrl = data ? getQrDataUrl(data.imageBase64) : null;

  return (
    <Dialog open={device != null} onOpenChange={close}>
      <DialogContent className={`${CONSOLE_DIALOG} sm:max-w-sm`}>
        {view === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Bağlantı yenilensin mi?</DialogTitle>
              <DialogDescription>
                Cihazdaki eski QR artık açılmaz. Yeni QR&apos;ı yazdırıp eskisinin yerine yapıştırmanız gerekir.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={rotate.isPending} onClick={() => setView("qr")}>
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={rotate.isPending || consoleId == null}
                onClick={() => consoleId != null && rotate.mutate(consoleId)}
              >
                {rotate.isPending ? "Yenileniyor…" : "Yenile"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{device?.name}</DialogTitle>
              <DialogDescription>Müşteri okutunca kalan süreyi ve tutarı görür, ek süre isteyebilir.</DialogDescription>
            </DialogHeader>

            <div className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-lg border border-border bg-white p-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, nothing to optimise
                <img src={imageUrl} alt={`${device?.name ?? "Cihaz"} QR kodu`} className="h-full w-full" />
              ) : qr.isError ? (
                <p className="px-4 text-center text-sm text-muted-foreground">QR yüklenemedi.</p>
              ) : (
                <div className="h-full w-full animate-pulse rounded bg-muted" />
              )}
            </div>

            {renewed ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Yeni bağlantı oluşturuldu. Eski QR artık açılmaz; bunu yazdırıp değiştirin.
              </p>
            ) : null}

            {data ? (
              <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{data.url}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  aria-label="Bağlantıyı kopyala"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(data.url);
                    notify(ok ? "info" : "warning", ok ? "Bağlantı kopyalandı" : "Kopyalanamadı");
                  }}
                >
                  <Copy className="h-4 w-4" aria-hidden />
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" asChild>
                  <a href={data.url} target="_blank" rel="noopener noreferrer" aria-label="Sayfayı aç">
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                disabled={!data}
                onClick={() => {
                  if (data && !printDeviceQr(data.imageBase64, data.consoleName)) {
                    notify("warning", "Yazdırma başlatılamadı");
                  }
                }}
              >
                <Printer className="mr-1 h-4 w-4" aria-hidden />
                Yazdır
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!data}
                onClick={() => data && downloadQrImage(data.imageBase64, `${data.consoleName} QR`)}
              >
                <Download className="mr-1 h-4 w-4" aria-hidden />
                İndir
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mx-auto text-muted-foreground"
              disabled={consoleId == null}
              onClick={() => setView("confirm")}
            >
              <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
              Bağlantıyı yenile
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Prints the QR card through a hidden frame, so no extra window or tab opens. */
function printDeviceQr(imageBase64: string, deviceName: string) {
  const dataUrl = getQrDataUrl(imageBase64);
  if (!dataUrl) return false;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }
  const name = escapeHtml(deviceName);
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name} QR</title>
<style>
@page{size:A6;margin:10mm}
html,body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111}
.card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:100vh;text-align:center}
h1{margin:0;font-size:22px}
img{width:60mm;height:60mm}
p{margin:0;font-size:13px;color:#444}
</style></head><body><div class="card"><h1>${name}</h1><img src="${dataUrl}" alt="QR"><p>Kalan süreni gör, ek süre iste</p></div></body></html>`);
  doc.close();
  const cleanup = () => window.setTimeout(() => frame.remove(), 500);
  const image = doc.querySelector("img");
  const go = () => {
    win.focus();
    win.addEventListener("afterprint", cleanup, { once: true });
    win.print();
    // Some browsers never fire afterprint; drop the frame anyway after a while.
    window.setTimeout(() => frame.remove(), 60_000);
  };
  if (image && !image.complete) {
    image.addEventListener("load", go, { once: true });
  } else {
    go();
  }
  return true;
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
