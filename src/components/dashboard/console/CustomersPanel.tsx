"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Choice, Field } from "@/components/dashboard/console/ConsoleDialogs";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  PAYMENT_LABELS,
  adjustCustomer,
  createCustomer,
  customerTransactions,
  formatClock,
  formatDuration,
  formatTl,
  parseRateInput,
  searchCustomers,
  topUpCustomer,
  updateCustomer,
  type CustomerPayload,
  type DeviceCustomer,
  type PaymentMethod,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const TXN_LABELS = { TOPUP: "Yükleme", SPEND: "Harcama", ADJUST: "Düzeltme" } as const;

export function CustomersPanel({ loyaltyText }: { loyaltyText: string | null }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<DeviceCustomer | "new" | null>(null);
  const [selected, setSelected] = useState<DeviceCustomer | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const customers = useQuery({
    queryKey: ["device-customers", "list", debounced, page],
    queryFn: () => searchCustomers(debounced, page, 20),
  });

  async function refresh(updated?: DeviceCustomer) {
    if (updated) setSelected(updated);
    await queryClient.invalidateQueries({ queryKey: ["device-customers"] });
    await queryClient.invalidateQueries({ queryKey: ["device-customer-txns"] });
  }

  const save = useMutation({
    mutationFn: (payload: CustomerPayload) =>
      editing && editing !== "new" ? updateCustomer(editing.id, payload) : createCustomer(payload),
    onSuccess: async (customer) => {
      setEditing(null);
      await refresh(selected?.id === customer.id ? customer : undefined);
      notify("info", "Müşteri kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Müşteri kaydedilemedi")),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className={DASHBOARD_PANEL}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Input
            className="max-w-xs"
            placeholder="Ad veya telefon ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button size="sm" onClick={() => setEditing("new")}>
            Müşteri ekle
          </Button>
        </div>
        {loyaltyText ? <p className="mb-3 text-xs text-muted-foreground">Sadakat: {loyaltyText}</p> : null}
        {customers.isLoading ? (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        ) : (customers.data?.content ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Müşteri kartı yok.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="text-right">Ücretsiz</TableHead>
                  <TableHead className="text-right">Toplam süre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(customers.data?.content ?? []).map((c) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer ${selected?.id === c.id ? "bg-muted" : ""}`}
                    onClick={() => setSelected(c)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatTl(c.balance)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.freeMinutes} dk</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(c.totalMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage(page - 1)}>
                Önceki
              </Button>
              <Button size="sm" variant="outline" disabled={!customers.data?.hasNext} onClick={() => setPage(page + 1)}>
                Sonraki
              </Button>
            </div>
          </>
        )}
      </div>

      {selected ? (
        <CustomerDetail
          key={selected.id}
          customer={selected}
          onEdit={() => setEditing(selected)}
          onUpdated={(c) => refresh(c)}
        />
      ) : (
        <div className={`${DASHBOARD_PANEL} text-sm text-muted-foreground`}>
          Bakiye yüklemek ve hareketleri görmek için bir müşteri seçin.
        </div>
      )}

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Müşteri ekle" : "Müşteriyi düzenle"}</DialogTitle>
            <DialogDescription>Telefon aynı işletmede tek bir karta ait olabilir.</DialogDescription>
          </DialogHeader>
          {editing != null ? (
            <CustomerForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              pending={save.isPending}
              onSubmit={(p) => save.mutate(p)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CustomerForm({
  initial,
  initialName,
  pending,
  onSubmit,
}: {
  initial: DeviceCustomer | null;
  initialName?: string;
  pending: boolean;
  onSubmit: (payload: CustomerPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? initialName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), phone: phone.trim() || undefined, note: note.trim() || undefined });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Ad" htmlFor="customer-name">
        <Input id="customer-name" value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Telefon" htmlFor="customer-phone">
        <Input id="customer-phone" value={phone} maxLength={32} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Not" htmlFor="customer-note">
        <Input id="customer-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || !name.trim()}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}

function CustomerDetail({
  customer,
  onEdit,
  onUpdated,
}: {
  customer: DeviceCustomer;
  onEdit: () => void;
  onUpdated: (customer: DeviceCustomer) => Promise<void>;
}) {
  const { notify } = useDashboardBanners();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [minutes, setMinutes] = useState("");
  const parsedAmount = parseRateInput(amount);
  const minutesValue = Number(minutes);
  const txns = useQuery({
    queryKey: ["device-customer-txns", customer.id],
    queryFn: () => customerTransactions(customer.id),
  });

  const topUp = useMutation({
    mutationFn: () => topUpCustomer(customer.id, { amount: parsedAmount as string, paymentMethod: method }),
    onSuccess: async (updated) => {
      setAmount("");
      await onUpdated(updated);
      notify("info", "Bakiye yüklendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Bakiye yüklenemedi")),
  });
  const giveMinutes = useMutation({
    mutationFn: () => adjustCustomer(customer.id, { freeMinutesDelta: minutesValue, note: "Elle verildi" }),
    onSuccess: async (updated) => {
      setMinutes("");
      await onUpdated(updated);
      notify("info", "Ücretsiz dakika güncellendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Güncellenemedi")),
  });

  return (
    <div className={`${DASHBOARD_PANEL} space-y-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">{customer.name}</p>
          <p className="text-xs text-muted-foreground">{customer.phone ?? "Telefon yok"}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Düzenle
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Bakiye</dt>
        <dd className="text-right font-semibold tabular-nums">{formatTl(customer.balance)}</dd>
        <dt className="text-muted-foreground">Ücretsiz dakika</dt>
        <dd className="text-right tabular-nums">{customer.freeMinutes} dk</dd>
        <dt className="text-muted-foreground">Sadakat ilerleme</dt>
        <dd className="text-right tabular-nums">{customer.loyaltyProgressMinutes} dk</dd>
        <dt className="text-muted-foreground">Toplam harcama</dt>
        <dd className="text-right tabular-nums">{formatTl(customer.totalSpent)}</dd>
      </dl>

      <div className="space-y-2 border-t border-border pt-3">
        <Label htmlFor="topup-amount">Bakiye yükle</Label>
        <div className="flex gap-2">
          <Input
            id="topup-amount"
            className="w-28"
            inputMode="decimal"
            placeholder="₺"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button
            size="sm"
            disabled={topUp.isPending || parsedAmount == null || Number(parsedAmount) <= 0}
            onClick={() => topUp.mutate()}
          >
            Yükle
          </Button>
        </div>
        <Choice<PaymentMethod>
          options={(["CASH", "CARD", "TRANSFER"] as const).map((m) => ({ value: m, label: PAYMENT_LABELS[m] }))}
          value={method}
          onChange={setMethod}
        />
        <p className="text-xs text-muted-foreground">
          Yükleme muhasebeye gelir yazılmaz; gelir, bakiyeyle ödenen oturum bitince yazılır.
        </p>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <Label htmlFor="give-minutes">Ücretsiz dakika ver / al</Label>
        <div className="flex gap-2">
          <Input
            id="give-minutes"
            className="w-28"
            inputMode="numeric"
            placeholder="Ör. 60 veya -30"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={giveMinutes.isPending || !Number.isInteger(minutesValue) || minutesValue === 0}
            onClick={() => giveMinutes.mutate()}
          >
            Uygula
          </Button>
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-3">
        <p className="text-sm font-medium text-foreground">Hareketler</p>
        {(txns.data?.content ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Hareket yok.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {txns.data?.content.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {formatClock(t.createdAt)} · {TXN_LABELS[t.type]}
                  {t.paymentMethod && t.type === "TOPUP" ? ` (${PAYMENT_LABELS[t.paymentMethod]})` : ""}
                  {t.note ? ` · ${t.note}` : ""}
                </span>
                <span className="tabular-nums">{formatTl(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
