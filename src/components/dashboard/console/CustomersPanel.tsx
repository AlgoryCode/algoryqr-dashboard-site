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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  DEVICE_TYPE_LABELS,
  PAYMENT_LABELS,
  adjustCustomer,
  cancelMembership,
  createCustomer,
  customerInsights,
  customerTransactions,
  daysSince,
  formatClock,
  formatDuration,
  formatTl,
  getCustomer,
  giftCustomer,
  listMembershipPlans,
  listMemberships,
  parseRateInput,
  searchCustomers,
  sellMembership,
  toNumber,
  topUpCustomer,
  updateCustomer,
  type CustomerPayload,
  type DeviceCustomer,
  type PaymentMethod,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import { CONSOLE_DIALOG } from "@/components/dashboard/console/console-ui";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const TXN_LABELS: Record<string, string> = {
  TOPUP: "Yükleme",
  SPEND: "Harcama",
  ADJUST: "Düzeltme",
  GIFT: "Hediye bakiye",
  REFERRAL: "Davet ödülü",
};

export function CustomersPanel({ branchId, loyaltyText }: { branchId: number; loyaltyText: string | null }) {
  const [view, setView] = useState<"cards" | "insights">("cards");
  return (
    <div className="space-y-3">
      <Choice<"cards" | "insights">
        options={[
          { value: "cards", label: "Müşteri kartları" },
          { value: "insights", label: "Öne çıkanlar" },
        ]}
        value={view}
        onChange={setView}
      />
      {view === "cards" ? <CustomerCards branchId={branchId} loyaltyText={loyaltyText} /> : <CustomerInsightsView />}
    </div>
  );
}

function lastVisitText(customer: DeviceCustomer, now: Date): string {
  const days = daysSince(customer.lastVisitAt, now);
  if (days == null) return "—";
  return days === 0 ? "Bugün" : `${days} gün önce`;
}

const LAPSED_OPTIONS = [14, 30, 60, 90].map((value) => ({ value, label: `${value} gün` }));

function CustomerInsightsView() {
  const [lapsedDays, setLapsedDays] = useState(30);
  const insights = useQuery({
    queryKey: ["device-customers", "insights", lapsedDays],
    queryFn: () => customerInsights(lapsedDays, 20),
  });
  const now = new Date();
  const data = insights.data;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className={DASHBOARD_PANEL}>
        <h3 className="mb-1 text-sm font-semibold text-foreground">En değerli müşteriler</h3>
        <p className="mb-3 text-xs text-muted-foreground">Toplam harcamaya göre.</p>
        {!data ? (
          <p className="text-sm text-muted-foreground">{insights.isError ? "Yüklenemedi." : "Yükleniyor…"}</p>
        ) : data.top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz harcama yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead className="hidden md:table-cell">Telefon</TableHead>
                <TableHead className="hidden md:table-cell text-right">Ziyaret</TableHead>
                <TableHead className="text-right">Harcama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.top.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-medium">{c.name}</span>
                    {c.tierName ? <span className="ml-2 text-xs text-muted-foreground">{c.tierName}</span> : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{c.phone ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums">{c.visits ?? 0}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatTl(c.totalSpent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <div className={DASHBOARD_PANEL}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Uzun süredir gelmeyenler</h3>
            <p className="text-xs text-muted-foreground">Telefonla arayıp davet edebilirsiniz.</p>
          </div>
          <Choice<number> options={LAPSED_OPTIONS} value={lapsedDays} onChange={setLapsedDays} />
        </div>
        {!data ? (
          <p className="text-sm text-muted-foreground">{insights.isError ? "Yüklenemedi." : "Yükleniyor…"}</p>
        ) : data.lapsed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{lapsedDays} günden uzun süredir gelmeyen müşteri yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Son gelme</TableHead>
                <TableHead className="hidden md:table-cell text-right">Harcama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lapsed.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone ? <a className="underline-offset-2 hover:underline" href={`tel:${c.phone}`}>{c.phone}</a> : "—"}</TableCell>
                  <TableCell>{lastVisitText(c, now)}</TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums">{formatTl(c.totalSpent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function CustomerCards({ branchId, loyaltyText }: { branchId: number; loyaltyText: string | null }) {
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
    await queryClient.invalidateQueries({ queryKey: ["device-customer-memberships"] });
    await queryClient.invalidateQueries({ queryKey: ["console-shift"] });
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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
                  <TableHead className="hidden md:table-cell">Telefon</TableHead>
                  <TableHead className="hidden md:table-cell">Seviye</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Hediye</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Ücretsiz</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Ziyaret</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Toplam süre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(customers.data?.content ?? []).map((c) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer ${selected?.id === c.id ? "bg-muted" : ""}`}
                    onClick={() => setSelected(c)}
                  >
                    <TableCell>
                      <span className="font-medium">{c.name}</span>
                      {c.phone || c.tierName ? (
                        <span className="block text-xs text-muted-foreground md:hidden">
                          {[c.phone, c.tierName].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{c.phone ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.tierName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatTl(c.balance)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums">
                      {toNumber(c.bonusBalance) > 0 ? formatTl(c.bonusBalance) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums">{c.freeMinutes} dk</TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums">{c.visits ?? 0}</TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums">{formatDuration(c.totalMinutes)}</TableCell>
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
          branchId={branchId}
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
        <DialogContent className={CONSOLE_DIALOG}>
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
  const [referral, setReferral] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      note: note.trim() || undefined,
      referralCode: initial == null ? referral.trim().toUpperCase() || undefined : undefined,
    });
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
      {initial == null ? (
        <Field label="Davet kodu (arkadaşının kodu, isteğe bağlı)" htmlFor="customer-referral">
          <Input
            id="customer-referral"
            value={referral}
            maxLength={16}
            autoCapitalize="characters"
            onChange={(e) => setReferral(e.target.value)}
          />
        </Field>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={pending || !name.trim()}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}

function CustomerDetail({
  branchId,
  customer,
  onEdit,
  onUpdated,
}: {
  branchId: number;
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
    mutationFn: () =>
      topUpCustomer(customer.id, { amount: parsedAmount as string, paymentMethod: method, branchId }),
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
        <dt className="text-muted-foreground">Hediye bakiye</dt>
        <dd className="text-right tabular-nums">{formatTl(customer.bonusBalance ?? 0)}</dd>
        <dt className="text-muted-foreground">Seviye</dt>
        <dd className="text-right">
          {customer.tierName
            ? `${customer.tierName}${toNumber(customer.tierDiscountPercent) > 0 ? ` (%${toNumber(customer.tierDiscountPercent).toLocaleString("tr-TR")})` : ""}`
            : "—"}
        </dd>
        <dt className="text-muted-foreground">Üyelik dakikası</dt>
        <dd className="text-right tabular-nums">{customer.membershipMinutes ?? 0} dk</dd>
        <dt className="text-muted-foreground">Ziyaret</dt>
        <dd className="text-right tabular-nums">
          {customer.visits ?? 0} · son {lastVisitText(customer, new Date())}
        </dd>
        <dt className="text-muted-foreground">Davet kodu</dt>
        <dd className="text-right font-mono">{customer.referralCode ?? "—"}</dd>
      </dl>

      <GiftSection customer={customer} onUpdated={onUpdated} />
      <MembershipsSection
        branchId={branchId}
        customer={customer}
        onChanged={async () => onUpdated(await getCustomer(customer.id).catch(() => customer))}
      />

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
                  {formatClock(t.createdAt)} · {TXN_LABELS[t.type] ?? t.type}
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

function GiftSection({
  customer,
  onUpdated,
}: {
  customer: DeviceCustomer;
  onUpdated: (customer: DeviceCustomer) => Promise<void>;
}) {
  const { notify } = useDashboardBanners();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const parsed = parseRateInput(amount);
  const gift = useMutation({
    mutationFn: () => giftCustomer(customer.id, { amount: parsed as string, note: note.trim() || undefined }),
    onSuccess: async (updated) => {
      setAmount("");
      setNote("");
      await onUpdated(updated);
      notify("info", "Hediye bakiye yüklendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Hediye bakiye yüklenemedi")),
  });

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Label htmlFor="gift-amount">Hediye bakiye</Label>
      <div className="flex gap-2">
        <Input
          id="gift-amount"
          className="w-28"
          inputMode="decimal"
          placeholder="₺"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          aria-label="Hediye notu"
          className="min-w-0 flex-1"
          placeholder="Not (ör. doğum günü)"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={gift.isPending || parsed == null || Number(parsed) <= 0}
          onClick={() => gift.mutate()}
        >
          Ver
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Hediye bakiye gelir yazılmaz; oturum bitirirken indirim olarak kullanılır.
      </p>
    </div>
  );
}

function MembershipsSection({
  branchId,
  customer,
  onChanged,
}: {
  branchId: number;
  customer: DeviceCustomer;
  onChanged: () => Promise<void>;
}) {
  const { notify } = useDashboardBanners();
  const [planId, setPlanId] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const memberships = useQuery({
    queryKey: ["device-customer-memberships", customer.id],
    queryFn: () => listMemberships(customer.id),
  });
  const plans = useQuery({
    queryKey: ["console-plans", "active"],
    queryFn: () => listMembershipPlans(true),
    staleTime: 60_000,
  });
  const plan = (plans.data ?? []).find((p) => String(p.id) === planId) ?? null;
  const balanceShort = method === "BALANCE" && plan != null && toNumber(customer.balance) < toNumber(plan.price);

  const sell = useMutation({
    mutationFn: () => sellMembership(customer.id, { planId: Number(planId), paymentMethod: method, branchId }),
    onSuccess: async () => {
      setPlanId("");
      await onChanged();
      notify("info", "Üyelik satıldı");
    },
    onError: (error) => notify("danger", errorMessage(error, "Üyelik satılamadı")),
  });
  const cancel = useMutation({
    mutationFn: (membershipId: number) => cancelMembership(membershipId),
    onSuccess: async () => {
      await onChanged();
      notify("info", "Üyelik iptal edildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Üyelik iptal edilemedi")),
  });

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-sm font-medium text-foreground">Üyelikler</p>
      {(memberships.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">{memberships.isLoading ? "Yükleniyor…" : "Üyelik yok."}</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {(memberships.data ?? []).map((m) => (
            <li key={m.id} className={`flex items-center justify-between gap-2 ${m.usable ? "" : "opacity-60"}`}>
              <span>
                <span className="font-medium text-foreground">{m.planName ?? "Üyelik"}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {m.minutesLeft}/{m.minutesTotal} dk · {formatClock(m.endsAt)} bitiş
                  {m.deviceType ? ` · ${DEVICE_TYPE_LABELS[m.deviceType]}` : ""}
                  {m.cancelled ? " · İptal" : !m.usable ? " · Bitti" : ""}
                </span>
              </span>
              {!m.cancelled && m.usable ? (
                <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(m.id)}>
                  İptal
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {(plans.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Satmak için Ayarlar › Program&apos;dan üyelik planı ekleyin.</p>
      ) : (
        <div className="space-y-2">
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger aria-label="Üyelik planı">
              <SelectValue placeholder="Plan seçin" />
            </SelectTrigger>
            <SelectContent>
              {(plans.data ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} · {formatDuration(p.minutes)} · {p.periodDays} gün · {formatTl(p.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Choice<PaymentMethod>
            options={(["CASH", "CARD", "TRANSFER", "BALANCE"] as const).map((m) => ({
              value: m,
              label: m === "BALANCE" ? `${PAYMENT_LABELS[m]} (${formatTl(customer.balance)})` : PAYMENT_LABELS[m],
            }))}
            value={method}
            onChange={setMethod}
          />
          {balanceShort ? <p className="text-xs text-destructive">Bakiye yetmiyor.</p> : null}
          <Button size="sm" disabled={sell.isPending || plan == null || balanceShort} onClick={() => sell.mutate()}>
            Üyelik sat{plan ? ` · ${formatTl(plan.price)}` : ""}
          </Button>
        </div>
      )}
    </div>
  );
}
