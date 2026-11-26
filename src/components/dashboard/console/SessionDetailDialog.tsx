"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Pencil, Plus, Trash2, Undo2 } from "lucide-react";

import { Choice, SessionSummary } from "@/components/dashboard/console/ConsoleDialogs";
import { CONSOLE_DIALOG } from "@/components/dashboard/console/console-ui";
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
import { Textarea } from "@/components/ui/textarea";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  PAYMENT_LABELS,
  editSession,
  formatClock,
  formatTl,
  listProducts,
  listSessionChanges,
  parseRateInput,
  toNumber,
  type AddItemPayload,
  type ConsoleSession,
  type EditSessionPayload,
  type PaymentMethod,
} from "@/lib/console-api";

/** "2026-11-26T23:10:00" → "2026-11-26T23:10" for a datetime-local input. */
function toInputTime(value: string | null | undefined): string {
  return value ? value.slice(0, 16) : "";
}

type NewItem = { key: number; label: string; payload: AddItemPayload; total: number };

/**
 * A finished session: its bill, the corrections made to it, and (unless it was cancelled) a form to correct it —
 * the real end time, a forgotten product, the discount, the payment method, the name or the note.
 */
export function SessionDetailDialog({
  session,
  branchId,
  onOpenChange,
  onChanged,
}: {
  session: ConsoleSession | null;
  branchId: number | null;
  onOpenChange: (open: boolean) => void;
  onChanged: (session: ConsoleSession) => void;
}) {
  const [editing, setEditing] = useState(false);
  const close = (open: boolean) => {
    if (!open) setEditing(false);
    onOpenChange(open);
  };
  const changes = useQuery({
    queryKey: ["console-session-changes", session?.id],
    queryFn: () => listSessionChanges(session?.id as number),
    enabled: session != null && session.editedAt != null,
  });

  return (
    <Dialog open={session != null} onOpenChange={close}>
      <DialogContent className={`${CONSOLE_DIALOG} sm:max-w-xl`}>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {editing ? "Oturumu düzelt" : session?.cancelled ? "Oturum iptal edildi" : "Oturum detayı"}
            {!editing && session?.editedAt ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Düzeltildi
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {session?.consoleName}
            {session?.customerName ? ` · ${session.customerName}` : ""}
            {session ? ` · ${formatClock(session.startedAt)} – ${formatClock(session.endedAt)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {session && editing ? (
          <EditSessionForm
            key={`${session.id}-${session.editedAt ?? ""}`}
            session={session}
            branchId={branchId}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setEditing(false);
              onChanged(updated);
            }}
          />
        ) : session ? (
          <>
            {session.cancelled ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Ücret alınmadı; ciroya ve raporlara katılmıyor.
                {session.cancelReason ? ` Neden: ${session.cancelReason}` : ""}
              </p>
            ) : null}
            {session.note ? (
              <p className="rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Not: </span>
                {session.note}
              </p>
            ) : null}
            <SessionSummary session={session} />
            {session.items.length > 0 ? (
              <ul className="divide-y divide-border rounded-md border border-border text-sm">
                {session.items.map((item) => (
                  <li key={item.id} className="flex justify-between px-3 py-1.5">
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <span className="tabular-nums">{formatTl(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {(changes.data ?? []).length > 0 ? (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <History className="h-4 w-4" /> Değişiklik geçmişi
                </p>
                <ol className="space-y-2">
                  {changes.data?.map((change) => (
                    <li key={change.id} className="rounded-md bg-muted/60 px-3 py-2 text-xs">
                      <p className="text-muted-foreground">
                        {formatClock(change.changedAt)} · {change.changedBy ?? "—"}
                      </p>
                      <p className="mt-0.5 font-medium text-foreground">{change.reason}</p>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {change.lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-between">
              {!session.cancelled ? (
                <Button type="button" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Düzenle
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={() => close(false)}>
                Tamam
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditSessionForm({
  session,
  branchId,
  onCancel,
  onSaved,
}: {
  session: ConsoleSession;
  branchId: number | null;
  onCancel: () => void;
  onSaved: (session: ConsoleSession) => void;
}) {
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();
  const balance = session.paymentMethod === "BALANCE";
  const [customerName, setCustomerName] = useState(session.customerName ?? "");
  const [note, setNote] = useState(session.note ?? "");
  const [payment, setPayment] = useState<PaymentMethod | null>(session.paymentMethod ?? null);
  const [endedAt, setEndedAt] = useState(toInputTime(session.endedAt));
  const [discount, setDiscount] = useState(toNumber(session.discountAmount) > 0 ? String(toNumber(session.discountAmount)) : "");
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<NewItem[]>([]);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("");
  const [freeName, setFreeName] = useState("");
  const [freePrice, setFreePrice] = useState("");

  const products = useQuery({
    queryKey: ["console-products", branchId],
    queryFn: () => listProducts(branchId as number),
    enabled: branchId != null,
    staleTime: 60_000,
  });
  const matches = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase("tr");
    if (!needle) return [];
    return (products.data ?? []).filter((p) => p.name.toLocaleLowerCase("tr").includes(needle)).slice(0, 8);
  }, [products.data, filter]);

  const parsedDiscount = discount.trim() === "" ? "0" : parseRateInput(discount);
  const parsedFreePrice = parseRateInput(freePrice);
  const minEnd = toInputTime(session.startedAt);
  const maxEnd = toInputTime(session.endedAt);
  const endInvalid = endedAt !== "" && (endedAt <= minEnd || endedAt > maxEnd);

  const payload = useMemo<EditSessionPayload>(() => {
    const body: EditSessionPayload = { reason: reason.trim() };
    if (customerName.trim() !== (session.customerName ?? "")) body.customerName = customerName.trim();
    if (note.trim() !== (session.note ?? "")) body.note = note.trim();
    if (payment && payment !== session.paymentMethod) body.paymentMethod = payment;
    if (endedAt && endedAt !== toInputTime(session.endedAt)) body.endedAt = `${endedAt}:00`;
    if (parsedDiscount != null && Number(parsedDiscount) !== toNumber(session.discountAmount)) {
      body.discountAmount = parsedDiscount;
    }
    if (removed.size > 0) body.removeItemIds = [...removed];
    if (added.length > 0) body.addItems = added.map((item) => item.payload);
    return body;
  }, [reason, customerName, note, payment, endedAt, parsedDiscount, removed, added, session]);
  const changed = Object.keys(payload).length > 1;

  const save = useMutation({
    mutationFn: () => editSession(session.id, payload),
    onSuccess: (updated) => {
      notify("info", "Oturum düzeltildi");
      void queryClient.invalidateQueries({ queryKey: ["console-history"] });
      void queryClient.invalidateQueries({ queryKey: ["console-session-changes", session.id] });
      void queryClient.invalidateQueries({ queryKey: ["console-report"] });
      void queryClient.invalidateQueries({ queryKey: ["console-shift"] });
      void queryClient.invalidateQueries({ queryKey: ["device-customers"] });
      onSaved(updated);
    },
    onError: (error) => notify("danger", error instanceof ApiError ? error.message : "Oturum düzeltilemedi"),
  });

  const addItem = (label: string, item: AddItemPayload, total: number) =>
    setAdded((list) => [...list, { key: Date.now() + list.length, label, payload: item, total }]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (changed && reason.trim() && !endInvalid && parsedDiscount != null) save.mutate();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-customer">Müşteri adı</Label>
          <Input id="edit-customer" value={customerName} maxLength={120} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-ended">Gerçek bitiş saati</Label>
          <Input
            id="edit-ended"
            type="datetime-local"
            value={endedAt}
            min={minEnd}
            max={maxEnd}
            aria-invalid={endInvalid}
            onChange={(e) => setEndedAt(e.target.value)}
          />
          <p className={`text-xs ${endInvalid ? "text-destructive" : "text-muted-foreground"}`}>
            Yalnızca öne alınabilir; süre ücreti bu saate göre yeniden hesaplanır.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Ödeme</Label>
        {balance ? (
          <p className="text-sm text-muted-foreground">
            Bakiyeden ödendi; yöntem değişmez, tutar değişirse fark müşterinin bakiyesine yansır.
          </p>
        ) : (
          <Choice<PaymentMethod>
            options={(["CASH", "CARD", "TRANSFER"] as const).map((value) => ({ value, label: PAYMENT_LABELS[value] }))}
            value={payment ?? "CASH"}
            onChange={setPayment}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Ürünler</Label>
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {session.items.map((item) => {
            const gone = removed.has(item.id);
            return (
              <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className={gone ? "text-muted-foreground line-through" : ""}>
                  {item.quantity} × {item.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{formatTl(item.lineTotal)}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={gone ? "Geri al" : "Çıkar"}
                    onClick={() =>
                      setRemoved((set) => {
                        const next = new Set(set);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      })
                    }
                  >
                    {gone ? <Undo2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </span>
              </li>
            );
          })}
          {added.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-2 bg-emerald-500/5 px-3 py-1.5">
              <span>
                <span className="mr-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">Yeni</span>
                {item.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{formatTl(item.total)}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Kaldır"
                  onClick={() => setAdded((list) => list.filter((other) => other.key !== item.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </li>
          ))}
          {session.items.length === 0 && added.length === 0 ? (
            <li className="px-3 py-1.5 text-muted-foreground">Ürün yok.</li>
          ) : null}
        </ul>
        <Input placeholder="Unutulan ürünü menüden ara…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {matches.length > 0 ? (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {matches.map((product) => (
              <button
                key={product.menuProductId}
                type="button"
                className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  addItem(`1 × ${product.name}`, { menuProductId: product.menuProductId, quantity: 1 }, toNumber(product.price));
                  setFilter("");
                }}
              >
                <span className="truncate">{product.name}</span>
                <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                  {formatTl(product.price)} <Plus className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Input placeholder="Menüde olmayan ürün" value={freeName} maxLength={200} onChange={(e) => setFreeName(e.target.value)} />
          <Input
            className="w-28"
            placeholder="Fiyat ₺"
            inputMode="decimal"
            value={freePrice}
            onChange={(e) => setFreePrice(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={freeName.trim() === "" || parsedFreePrice == null}
            onClick={() => {
              if (parsedFreePrice == null) return;
              addItem(`1 × ${freeName.trim()}`, { name: freeName.trim(), unitPrice: parsedFreePrice, quantity: 1 }, Number(parsedFreePrice));
              setFreeName("");
              setFreePrice("");
            }}
          >
            Ekle
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-discount">Toplam indirim (₺)</Label>
          <Input
            id="edit-discount"
            inputMode="decimal"
            value={discount}
            aria-invalid={parsedDiscount == null}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-note">Not</Label>
          <Input id="edit-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-reason">Düzeltme nedeni *</Label>
        <Textarea
          id="edit-reason"
          rows={2}
          maxLength={255}
          value={reason}
          placeholder="Ör. oturum geç bitirildi, müşteri 23:10'da çıktı"
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Değişiklik geçmişe kim, ne zaman ve neden bilgisiyle kaydedilir; ciro, vardiya ve müşteri kartı yeni tutara göre
          güncellenir.
        </p>
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={save.isPending}>
          Vazgeç
        </Button>
        <Button
          type="submit"
          disabled={save.isPending || !changed || reason.trim() === "" || endInvalid || parsedDiscount == null}
        >
          {save.isPending ? "Kaydediliyor…" : "Düzeltmeyi kaydet"}
        </Button>
      </DialogFooter>
    </form>
  );
}
