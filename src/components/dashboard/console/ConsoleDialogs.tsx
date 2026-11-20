"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { CustomerPicker } from "@/components/dashboard/console/CustomerPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  CONTROLLER_TYPES,
  DEVICE_TYPES,
  DEVICE_TYPE_LABELS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  applyDiscount,
  formatClock,
  formatDuration,
  formatStopwatch,
  formatTl,
  listProducts,
  parseRateInput,
  quoteSession,
  rateInputValue,
  toNumber,
  type AddItemPayload,
  type ConsolePayload,
  type ConsoleSession,
  type DeviceCustomer,
  type DeviceType,
  type FinishPayload,
  type GameConsole,
  type PaymentMethod,
  type StartSessionPayload,
} from "@/lib/console-api";

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/** A row of toggle buttons; the selected one is filled. */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: NoInfer<T>; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={String(option.value)}
          type="button"
          size="sm"
          variant={option.value === value ? "default" : "outline"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

// ---- Device editor ------------------------------------------------------------------------------------------

export function ConsoleEditorDialog({
  open,
  console: editing,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  console: GameConsole | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ConsolePayload) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Cihazı düzenle" : "Cihaz ekle"}</DialogTitle>
          <DialogDescription>
            Ücret boş kalırsa önce cihaz türünün, sonra şubenin ücreti kullanılır.
          </DialogDescription>
        </DialogHeader>
        <ConsoleForm key={editing?.id ?? "new"} editing={editing} pending={pending} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}

function ConsoleForm({
  editing,
  pending,
  onSubmit,
}: {
  editing: GameConsole | null;
  pending: boolean;
  onSubmit: (payload: ConsolePayload) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<DeviceType>(editing?.deviceType ?? "PLAYSTATION");
  const [rate, setRate] = useState(rateInputValue(editing?.hourlyRate));
  const [multiRate, setMultiRate] = useState(rateInputValue(editing?.multiHourlyRate));
  const parsedRate = parseRateInput(rate);
  const parsedMulti = parseRateInput(multiRate);
  const showMulti = CONTROLLER_TYPES.has(type);
  const invalid = name.trim() === "" || parsedRate === undefined || (showMulti && parsedMulti === undefined);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit({
      name: name.trim(),
      deviceType: type,
      hourlyRate: parsedRate ?? null,
      multiHourlyRate: showMulti ? (parsedMulti ?? null) : null,
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Ad" htmlFor="device-name">
        <Input
          id="device-name"
          value={name}
          maxLength={120}
          placeholder="PS5 - Masa 1"
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Tür" htmlFor="device-type">
        <Select value={type} onValueChange={(value) => setType(value as DeviceType)}>
          <SelectTrigger id="device-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {DEVICE_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Saatlik ücret (₺)" htmlFor="device-rate">
          <Input
            id="device-rate"
            inputMode="decimal"
            value={rate}
            placeholder="Tür / şube ücreti"
            onChange={(event) => setRate(event.target.value)}
          />
          {parsedRate === undefined ? <p className="text-xs text-destructive">Geçerli bir tutar girin.</p> : null}
        </Field>
        {showMulti ? (
          <Field label="4 kol saatlik ücret (₺)" htmlFor="device-multi-rate">
            <Input
              id="device-multi-rate"
              inputMode="decimal"
              value={multiRate}
              placeholder="Tür / şube ücreti"
              onChange={(event) => setMultiRate(event.target.value)}
            />
            {parsedMulti === undefined ? <p className="text-xs text-destructive">Geçerli bir tutar girin.</p> : null}
          </Field>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || invalid}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---- Start --------------------------------------------------------------------------------------------------

const PLAN_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Serbest" },
  { value: 30, label: "30 dk" },
  { value: 60, label: "1 saat" },
  { value: 120, label: "2 saat" },
  { value: -1, label: "Diğer" },
];

export function StartSessionDialog({
  console: target,
  pending,
  onOpenChange,
  onSubmit,
}: {
  console: GameConsole | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: StartSessionPayload) => void;
}) {
  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.name} için oturum başlat</DialogTitle>
          <DialogDescription>
            Saatlik ücret: {formatTl(target?.effectiveHourlyRate)}
            {target && CONTROLLER_TYPES.has(target.deviceType)
              ? ` · 4 kol: ${formatTl(target.effectiveMultiHourlyRate)}`
              : ""}
            . Süre şimdi başlar.
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <StartForm
            key={target.id}
            target={target}
            pending={pending}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StartForm({
  target,
  pending,
  onSubmit,
}: {
  target: GameConsole;
  pending: boolean;
  onSubmit: (payload: StartSessionPayload) => void;
}) {
  const [customer, setCustomer] = useState<DeviceCustomer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState(0);
  const [customPlan, setCustomPlan] = useState("");
  const [controllers, setControllers] = useState(2);
  const showControllers = CONTROLLER_TYPES.has(target.deviceType);
  const customMinutes = Number(customPlan);
  const customInvalid = plan === -1 && !(Number.isInteger(customMinutes) && customMinutes > 0 && customMinutes <= 1440);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (customInvalid) return;
    const plannedMinutes = plan === -1 ? customMinutes : plan > 0 ? plan : undefined;
    onSubmit({
      customerId: customer?.id,
      customerName: customer ? undefined : customerName.trim() || undefined,
      note: note.trim() || undefined,
      plannedMinutes,
      controllerCount: showControllers ? controllers : undefined,
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-1.5">
        <Label>Müşteri kartı (isteğe bağlı)</Label>
        <CustomerPicker selected={customer} onSelect={setCustomer} />
      </div>
      {customer ? null : (
        <Field label="Müşteri adı (isteğe bağlı)" htmlFor="session-customer">
          <Input
            id="session-customer"
            value={customerName}
            maxLength={120}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </Field>
      )}
      <div className="space-y-1.5">
        <Label>Süre</Label>
        <Choice<number> options={PLAN_OPTIONS} value={plan} onChange={setPlan} />
        {plan === -1 ? (
          <Input
            inputMode="numeric"
            className="mt-2 w-40"
            placeholder="Dakika"
            value={customPlan}
            aria-invalid={customInvalid}
            onChange={(event) => setCustomPlan(event.target.value)}
          />
        ) : null}
        <p className="text-xs text-muted-foreground">Süre dolunca kart kırmızıya döner ve sesli uyarı verir.</p>
      </div>
      {showControllers ? (
        <div className="space-y-1.5">
          <Label>Kol sayısı</Label>
          <Choice<number>
            options={[
              { value: 2, label: "2 kol" },
              { value: 4, label: "4 kol" },
            ]}
            value={controllers}
            onChange={setControllers}
          />
        </div>
      ) : null}
      <Field label="Not (isteğe bağlı)" htmlFor="session-note">
        <Input id="session-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || customInvalid}>
          Başlat
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---- Finish -------------------------------------------------------------------------------------------------

export function FinishSessionDialog({
  session,
  pending,
  onOpenChange,
  onSubmit,
}: {
  session: ConsoleSession | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FinishPayload) => void;
}) {
  return (
    <Dialog open={session != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oturumu bitir</DialogTitle>
          <DialogDescription>
            {session?.consoleName}
            {session?.customerName ? ` · ${session.customerName}` : ""}
          </DialogDescription>
        </DialogHeader>
        {session ? <FinishForm key={session.id} session={session} pending={pending} onSubmit={onSubmit} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FinishForm({
  session,
  pending,
  onSubmit,
}: {
  session: ConsoleSession;
  pending: boolean;
  onSubmit: (payload: FinishPayload) => void;
}) {
  const quote = useQuery({
    queryKey: ["console-quote", session.id],
    queryFn: () => quoteSession(session.id),
    refetchInterval: 30_000,
  });
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [discountKind, setDiscountKind] = useState<"amount" | "percent">("amount");
  const [discount, setDiscount] = useState("");
  const [useLoyalty, setUseLoyalty] = useState(false);
  const parsedDiscount = parseRateInput(discount);
  const percentTooHigh = discountKind === "percent" && parsedDiscount != null && Number(parsedDiscount) > 100;

  const q = quote.data;
  const hasCustomer = q?.customerId != null;
  const loyaltyValue = useLoyalty ? toNumber(q?.loyaltyValue) : 0;
  const afterLoyalty = toNumber(q?.grossAmount) - loyaltyValue;
  const total = applyDiscount(afterLoyalty, discountKind, discount);
  const balance = toNumber(q?.customerBalance);
  const balanceShort = method === "BALANCE" && (!hasCustomer || balance < total);
  const invalid = parsedDiscount === undefined || percentTooHigh || balanceShort || !q;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit({
      paymentMethod: method,
      discountAmount: discountKind === "amount" && parsedDiscount ? parsedDiscount : undefined,
      discountPercent: discountKind === "percent" && parsedDiscount ? parsedDiscount : undefined,
      useLoyaltyMinutes: useLoyalty || undefined,
    });
  }

  if (quote.isLoading || !q) {
    return <p className="text-sm text-muted-foreground">Tutar hesaplanıyor…</p>;
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Oynanan süre</dt>
        <dd className="text-right tabular-nums">{formatStopwatch(q.playedSeconds)}</dd>
        <dt className="text-muted-foreground">Ücretlenen</dt>
        <dd className="text-right tabular-nums">{formatDuration(q.durationMinutes)}</dd>
        <dt className="text-muted-foreground">Süre ücreti</dt>
        <dd className="text-right tabular-nums">{formatTl(q.timeAmount)}</dd>
        {toNumber(q.itemsAmount) > 0 ? (
          <>
            <dt className="text-muted-foreground">Ürünler</dt>
            <dd className="text-right tabular-nums">{formatTl(q.itemsAmount)}</dd>
          </>
        ) : null}
        {loyaltyValue > 0 ? (
          <>
            <dt className="text-muted-foreground">Ücretsiz dakikalar</dt>
            <dd className="text-right tabular-nums">−{formatTl(loyaltyValue)}</dd>
          </>
        ) : null}
      </dl>

      {q.loyaltyMinutesUsable > 0 ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={useLoyalty} onCheckedChange={(checked) => setUseLoyalty(checked === true)} />
          {q.loyaltyMinutesUsable} ücretsiz dakikayı kullan ({formatTl(q.loyaltyValue)})
        </label>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="finish-discount">İndirim</Label>
        <div className="flex gap-2">
          <Input
            id="finish-discount"
            inputMode="decimal"
            className="w-32"
            placeholder="0"
            value={discount}
            aria-invalid={parsedDiscount === undefined || percentTooHigh}
            onChange={(event) => setDiscount(event.target.value)}
          />
          <Choice<"amount" | "percent">
            options={[
              { value: "amount" as const, label: "₺" },
              { value: "percent" as const, label: "%" },
            ]}
            value={discountKind}
            onChange={setDiscountKind}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Ödeme</Label>
        <Choice<PaymentMethod>
          options={PAYMENT_METHODS.filter((m) => m !== "BALANCE" || hasCustomer).map((m) => ({
            value: m,
            label: m === "BALANCE" ? `${PAYMENT_LABELS[m]} (${formatTl(balance)})` : PAYMENT_LABELS[m],
          }))}
          value={method}
          onChange={setMethod}
        />
        {balanceShort ? <p className="text-xs text-destructive">Müşterinin bakiyesi yetmiyor.</p> : null}
      </div>

      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-base font-semibold text-foreground">Ödenecek</span>
        <span className="text-2xl font-semibold tabular-nums text-foreground">{formatTl(total)}</span>
      </div>
      <DialogFooter>
        <Button type="submit" variant="destructive" disabled={pending || invalid}>
          {pending ? "Bitiriliyor…" : "Bitir ve tahsil et"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FinishedSessionDialog({
  session,
  onOpenChange,
}: {
  session: ConsoleSession | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={session != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oturum bitti</DialogTitle>
          <DialogDescription>
            {session?.consoleName}
            {session?.customerName ? ` · ${session.customerName}` : ""}
          </DialogDescription>
        </DialogHeader>
        {session ? <SessionSummary session={session} /> : null}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Tamam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SessionSummary({ session }: { session: ConsoleSession }) {
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Başlangıç</dt>
        <dd className="text-right tabular-nums">{formatClock(session.startedAt)}</dd>
        <dt className="text-muted-foreground">Bitiş</dt>
        <dd className="text-right tabular-nums">{formatClock(session.endedAt)}</dd>
        <dt className="text-muted-foreground">Ücretlenen süre</dt>
        <dd className="text-right tabular-nums">{formatDuration(session.durationMinutes)}</dd>
        <dt className="text-muted-foreground">Süre ücreti</dt>
        <dd className="text-right tabular-nums">{formatTl(session.timeAmount)}</dd>
        {toNumber(session.itemsAmount) > 0 ? (
          <>
            <dt className="text-muted-foreground">Ürünler</dt>
            <dd className="text-right tabular-nums">{formatTl(session.itemsAmount)}</dd>
          </>
        ) : null}
        {toNumber(session.discountAmount) > 0 ? (
          <>
            <dt className="text-muted-foreground">İndirim</dt>
            <dd className="text-right tabular-nums">−{formatTl(session.discountAmount)}</dd>
          </>
        ) : null}
        {session.paymentMethod ? (
          <>
            <dt className="text-muted-foreground">Ödeme</dt>
            <dd className="text-right">{PAYMENT_LABELS[session.paymentMethod]}</dd>
          </>
        ) : null}
        <dt className="pt-2 text-base font-semibold text-foreground">Tahsil edilen</dt>
        <dd className="pt-2 text-right text-2xl font-semibold tabular-nums text-foreground">
          {formatTl(session.amount)}
        </dd>
      </dl>
      {session.segments.length > 1 ? (
        <div className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {session.segments.map((segment, index) => (
            <p key={`${segment.startedAt}-${index}`}>
              {segment.consoleName ?? `#${segment.consoleId}`} · {formatClock(segment.startedAt)}–
              {formatClock(segment.endedAt)} · {formatTl(segment.hourlyRate)}/sa
              {segment.controllerCount > 2 ? ` · ${segment.controllerCount} kol` : ""}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---- Transfer -----------------------------------------------------------------------------------------------

export function TransferDialog({
  session,
  consoles,
  busyIds,
  pending,
  onOpenChange,
  onSubmit,
}: {
  session: ConsoleSession | null;
  consoles: GameConsole[];
  busyIds: Set<number>;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { consoleId?: number; controllerCount?: number }) => void;
}) {
  const [target, setTarget] = useState<number | null>(null);
  const [controllers, setControllers] = useState<number>(session?.controllerCount ?? 2);
  const free = consoles.filter((c) => c.id !== session?.consoleId && !busyIds.has(c.id));
  const targetConsole = consoles.find((c) => c.id === (target ?? session?.consoleId));
  const showControllers = targetConsole != null && CONTROLLER_TYPES.has(targetConsole.deviceType);
  const unchanged = target == null && controllers === (session?.controllerCount ?? 2);

  return (
    <Dialog
      open={session != null}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setTarget(null);
          setControllers(2);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cihaz / kol değiştir</DialogTitle>
          <DialogDescription>
            Şimdiye kadarki süre eski cihazın ücretiyle, bundan sonrası yenisiyle hesaplanır.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cihaz</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={target == null ? "default" : "outline"}
                onClick={() => setTarget(null)}
              >
                Aynı cihaz ({session?.consoleName})
              </Button>
              {free.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  variant={target === c.id ? "default" : "outline"}
                  onClick={() => setTarget(c.id)}
                >
                  {c.name} · {formatTl(c.effectiveHourlyRate)}
                </Button>
              ))}
            </div>
            {free.length === 0 ? <p className="text-xs text-muted-foreground">Boş başka cihaz yok.</p> : null}
          </div>
          {showControllers ? (
            <div className="space-y-1.5">
              <Label>Kol sayısı</Label>
              <Choice<number>
                options={[
                  { value: 2, label: "2 kol" },
                  { value: 4, label: "4 kol" },
                ]}
                value={controllers}
                onChange={setControllers}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={pending || unchanged}
            onClick={() =>
              onSubmit({ consoleId: target ?? undefined, controllerCount: showControllers ? controllers : undefined })
            }
          >
            Değiştir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Items --------------------------------------------------------------------------------------------------

export function ItemsDialog({
  session,
  branchId,
  pending,
  onOpenChange,
  onAdd,
  onRemove,
}: {
  session: ConsoleSession | null;
  branchId: number | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (payload: AddItemPayload) => void;
  onRemove: (itemId: number) => void;
}) {
  const products = useQuery({
    queryKey: ["console-products", branchId],
    queryFn: () => listProducts(branchId as number),
    enabled: session != null && branchId != null,
    staleTime: 60_000,
  });
  const [filter, setFilter] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [freeName, setFreeName] = useState("");
  const [freePrice, setFreePrice] = useState("");
  const parsedFreePrice = parseRateInput(freePrice);
  const visible = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase("tr");
    return (products.data ?? [])
      .filter((p) => !needle || p.name.toLocaleLowerCase("tr").includes(needle))
      .slice(0, 40);
  }, [products.data, filter]);

  return (
    <Dialog open={session != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ürünler · {session?.consoleName}</DialogTitle>
          <DialogDescription>Eklenen ürünler oturum bitince süre ücretiyle birlikte tahsil edilir.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {(session?.items ?? []).length > 0 ? (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {session?.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{formatTl(item.lineTotal)}</span>
                    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => onRemove(item.id)}>
                      Çıkar
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz ürün yok.</p>
          )}

          <div className="flex items-end gap-2">
            <Field label="Menüden ara" htmlFor="item-filter">
              <Input id="item-filter" value={filter} onChange={(event) => setFilter(event.target.value)} />
            </Field>
            <Field label="Adet" htmlFor="item-qty">
              <Input
                id="item-qty"
                className="w-20"
                inputMode="numeric"
                value={String(quantity)}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setQuantity(Number.isInteger(next) && next > 0 && next < 1000 ? next : 1);
                }}
              />
            </Field>
          </div>
          <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
            {products.isLoading ? (
              <p className="text-sm text-muted-foreground">Menü yükleniyor…</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu şubenin menüsünde ürün bulunamadı.</p>
            ) : (
              visible.map((product) => (
                <button
                  key={product.menuProductId}
                  type="button"
                  disabled={pending}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  onClick={() => onAdd({ menuProductId: product.menuProductId, quantity })}
                >
                  <span className="truncate">{product.name}</span>
                  <span className="tabular-nums text-muted-foreground">{formatTl(product.price)}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <Field label="Menüde olmayan ürün" htmlFor="item-free-name">
              <Input id="item-free-name" value={freeName} maxLength={200} onChange={(e) => setFreeName(e.target.value)} />
            </Field>
            <Field label="Fiyat (₺)" htmlFor="item-free-price">
              <Input
                id="item-free-price"
                className="w-28"
                inputMode="decimal"
                value={freePrice}
                onChange={(e) => setFreePrice(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={pending || freeName.trim() === "" || parsedFreePrice == null}
              onClick={() => {
                if (parsedFreePrice == null) return;
                onAdd({ name: freeName.trim(), unitPrice: parsedFreePrice, quantity });
                setFreeName("");
                setFreePrice("");
              }}
            >
              Ekle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
