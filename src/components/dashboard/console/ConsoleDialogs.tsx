"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

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
  gamesForDevice,
  listGames,
  listPackages,
  listProducts,
  packagesForDevice,
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
  type QuoteOptions,
  type StartSessionPayload,
} from "@/lib/console-api";

/** The value after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

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
  branchId,
  console: editing,
  pending,
  onOpenChange,
  onSubmit,
  extra,
}: {
  open: boolean;
  branchId: number;
  console: GameConsole | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  /** `gameIds` is the full list of games installed on the device. */
  onSubmit: (payload: ConsolePayload, gameIds: number[]) => void;
  /** Shown under the form when editing, e.g. the maintenance log. */
  extra?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Cihazı düzenle" : "Cihaz ekle"}</DialogTitle>
          <DialogDescription>
            Ücret boş kalırsa önce cihaz türünün, sonra şubenin ücreti kullanılır.
          </DialogDescription>
        </DialogHeader>
        <ConsoleForm
          key={editing?.id ?? "new"}
          branchId={branchId}
          editing={editing}
          pending={pending}
          onSubmit={onSubmit}
        />
        {editing ? extra : null}
      </DialogContent>
    </Dialog>
  );
}

function ConsoleForm({
  branchId,
  editing,
  pending,
  onSubmit,
}: {
  branchId: number;
  editing: GameConsole | null;
  pending: boolean;
  onSubmit: (payload: ConsolePayload, gameIds: number[]) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<DeviceType>(editing?.deviceType ?? "PLAYSTATION");
  const [rate, setRate] = useState(rateInputValue(editing?.hourlyRate));
  const [multiRate, setMultiRate] = useState(rateInputValue(editing?.multiHourlyRate));
  const [cost, setCost] = useState(rateInputValue(editing?.purchaseCost));
  const [purchasedOn, setPurchasedOn] = useState(editing?.purchasedOn ?? "");
  const [gameIds, setGameIds] = useState<number[]>(() => (editing?.games ?? []).map((g) => g.id));
  const games = useQuery({
    queryKey: ["console-games", branchId],
    queryFn: () => listGames(branchId),
    staleTime: 60_000,
  });
  const parsedRate = parseRateInput(rate);
  const parsedMulti = parseRateInput(multiRate);
  const parsedCost = parseRateInput(cost);
  const showMulti = CONTROLLER_TYPES.has(type);
  const invalid =
    name.trim() === "" ||
    parsedRate === undefined ||
    parsedCost === undefined ||
    (showMulti && parsedMulti === undefined);

  function toggleGame(id: number, checked: boolean) {
    setGameIds((current) => (checked ? [...current.filter((g) => g !== id), id] : current.filter((g) => g !== id)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit(
      {
        name: name.trim(),
        deviceType: type,
        hourlyRate: parsedRate ?? null,
        multiHourlyRate: showMulti ? (parsedMulti ?? null) : null,
        purchaseCost: parsedCost ?? null,
        purchasedOn: purchasedOn || null,
      },
      gameIds,
    );
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Alış fiyatı (₺)" htmlFor="device-cost">
          <Input
            id="device-cost"
            inputMode="decimal"
            value={cost}
            placeholder="Kârlılık raporu için"
            onChange={(event) => setCost(event.target.value)}
          />
          {parsedCost === undefined ? <p className="text-xs text-destructive">Geçerli bir tutar girin.</p> : null}
        </Field>
        <Field label="Alış tarihi" htmlFor="device-purchased">
          <Input
            id="device-purchased"
            type="date"
            value={purchasedOn}
            onChange={(event) => setPurchasedOn(event.target.value)}
          />
        </Field>
      </div>
      <div className="space-y-1.5">
        <Label>Yüklü oyunlar</Label>
        {(games.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {games.isLoading ? "Yükleniyor…" : "Oyun kütüphanesi boş; Ayarlar › Oyunlar ve paketler'den ekleyin."}
          </p>
        ) : (
          <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
            {(games.data ?? []).map((game) => (
              <label key={game.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={gameIds.includes(game.id)}
                  onCheckedChange={(checked) => toggleGame(game.id, checked === true)}
                />
                <span className="truncate">{game.name}</span>
              </label>
            ))}
          </div>
        )}
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
  const [packageId, setPackageId] = useState<number | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const packagesQuery = useQuery({
    queryKey: ["console-packages", target.branchId, "active"],
    queryFn: () => listPackages(target.branchId, true),
    staleTime: 30_000,
  });
  const gamesQuery = useQuery({
    queryKey: ["console-games", target.branchId],
    queryFn: () => listGames(target.branchId),
    staleTime: 60_000,
  });
  const packages = useMemo(
    () => packagesForDevice(packagesQuery.data ?? [], target.deviceType),
    [packagesQuery.data, target.deviceType],
  );
  const games = useMemo(() => gamesForDevice(gamesQuery.data ?? [], target.id), [gamesQuery.data, target.id]);
  const chosenPackage = packages.find((p) => p.id === packageId) ?? null;
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
      packageId: chosenPackage?.id,
      gameId: gameId ?? undefined,
    });
  }

  function pickPackage(raw: string) {
    const next = raw === "none" ? null : (packages.find((p) => String(p.id) === raw) ?? null);
    setPackageId(next?.id ?? null);
    if (!next) return;
    if (PLAN_OPTIONS.some((option) => option.value === next.minutes)) {
      setPlan(next.minutes);
    } else {
      setPlan(-1);
      setCustomPlan(String(next.minutes));
    }
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
      {packages.length > 0 ? (
        <Field label="Paket (isteğe bağlı)" htmlFor="session-package">
          <Select value={packageId != null ? String(packageId) : "none"} onValueChange={pickPackage}>
            <SelectTrigger id="session-package">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Paket yok · saatlik ücret</SelectItem>
              {packages.map((p) => (
                <SelectItem key={p.id} value={String(p.id)} disabled={!p.availableNow}>
                  {p.name} · {formatDuration(p.minutes)} · {formatTl(p.price)}
                  {p.availableNow ? "" : " (şu an geçerli değil)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {chosenPackage ? (
            <p className="text-xs text-muted-foreground">
              Paket süresi bitince aşan süre saatlik ücretle eklenir.
            </p>
          ) : null}
        </Field>
      ) : null}
      {games.length > 0 ? (
        <Field label="Oyun (isteğe bağlı)" htmlFor="session-game">
          <Select value={gameId != null ? String(gameId) : "none"} onValueChange={(raw) => setGameId(raw === "none" ? null : Number(raw))}>
            <SelectTrigger id="session-game">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Seçilmedi</SelectItem>
              {games.map(({ game, installed }) => (
                <SelectItem key={game.id} value={String(game.id)}>
                  {game.name}
                  {installed ? "" : " (bu cihazda yüklü değil)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
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

function BreakdownLine({ label, value, minus }: { label: string; value: number | string | null | undefined; minus?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">
        {minus ? "−" : ""}
        {formatTl(value)}
      </dd>
    </>
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
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [discountKind, setDiscountKind] = useState<"amount" | "percent">("amount");
  const [discount, setDiscount] = useState("");
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [useMembership, setUseMembership] = useState(false);
  const [useBonus, setUseBonus] = useState(false);
  const parsedDiscount = parseRateInput(discount);
  const percentTooHigh = discountKind === "percent" && parsedDiscount != null && Number(parsedDiscount) > 100;
  const discountValid = parsedDiscount !== undefined && !percentTooHigh;

  const options: QuoteOptions = {
    useLoyaltyMinutes: useLoyalty,
    useMembershipMinutes: useMembership,
    useBonusBalance: useBonus,
    discountAmount: discountValid && discountKind === "amount" && parsedDiscount ? parsedDiscount : undefined,
    discountPercent: discountValid && discountKind === "percent" && parsedDiscount ? parsedDiscount : undefined,
  };
  const optionsKey = JSON.stringify(options);
  const debouncedKey = useDebouncedValue(optionsKey);
  const settled = debouncedKey === optionsKey;
  const quote = useQuery({
    queryKey: ["console-quote", session.id, debouncedKey],
    queryFn: () => quoteSession(session.id, JSON.parse(debouncedKey) as QuoteOptions),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });

  const q = quote.data;
  const hasCustomer = q?.customerId != null;
  // An older server has no final amount in the quote; work it out like before.
  const total =
    q?.amount != null
      ? toNumber(q.amount)
      : applyDiscount(toNumber(q?.grossAmount) - (useLoyalty ? toNumber(q?.loyaltyValue) : 0), discountKind, discount);
  const balance = toNumber(q?.customerBalance);
  const balanceShort = method === "BALANCE" && (!hasCustomer || balance < total);
  const calculating = !settled || quote.isFetching;
  const invalid = !discountValid || balanceShort || !q || calculating;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onSubmit({
      paymentMethod: method,
      discountAmount: options.discountAmount,
      discountPercent: options.discountPercent,
      useLoyaltyMinutes: useLoyalty || undefined,
      useMembershipMinutes: useMembership || undefined,
      useBonusBalance: useBonus || undefined,
    });
  }

  if (!q) {
    return (
      <p className="text-sm text-muted-foreground">
        {quote.isError ? "Tutar alınamadı. Tekrar deneyin." : "Tutar hesaplanıyor…"}
      </p>
    );
  }

  const membershipAvailable = q.membershipMinutesAvailable ?? 0;
  const bonusBalance = toNumber(q.bonusBalance);
  const tierPercent = toNumber(q.tierDiscountPercent);

  return (
    <form className="space-y-4" onSubmit={submit}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Oynanan süre</dt>
        <dd className="text-right tabular-nums">{formatStopwatch(q.playedSeconds)}</dd>
        <dt className="text-muted-foreground">Ücretlenen</dt>
        <dd className="text-right tabular-nums">{formatDuration(q.durationMinutes)}</dd>
        <BreakdownLine label={q.packageName ? `Süre ücreti (paket: ${q.packageName})` : "Süre ücreti"} value={q.timeAmount} />
        {toNumber(q.itemsAmount) > 0 ? <BreakdownLine label="Ürünler" value={q.itemsAmount} /> : null}
        {toNumber(q.membershipValue) > 0 && (q.membershipMinutesUsed ?? 0) > 0 ? (
          <BreakdownLine label={`Üyelik (${q.membershipMinutesUsed} dk)`} value={q.membershipValue} minus />
        ) : null}
        {q.loyaltyDiscount != null ? (
          toNumber(q.loyaltyDiscount) > 0 ? (
            <BreakdownLine label={`Ücretsiz dakikalar (${q.loyaltyMinutesUsed ?? 0} dk)`} value={q.loyaltyDiscount} minus />
          ) : null
        ) : useLoyalty && toNumber(q.loyaltyValue) > 0 ? (
          <BreakdownLine label="Ücretsiz dakikalar" value={q.loyaltyValue} minus />
        ) : null}
        {toNumber(q.tierDiscountAmount) > 0 ? (
          <BreakdownLine
            label={`Seviye indirimi${q.tierName ? ` · ${q.tierName}` : ""} (%${tierPercent.toLocaleString("tr-TR")})`}
            value={q.tierDiscountAmount}
            minus
          />
        ) : null}
        {toNumber(q.bonusUsed) > 0 ? <BreakdownLine label="Hediye bakiye" value={q.bonusUsed} minus /> : null}
        {toNumber(q.manualDiscount) > 0 ? <BreakdownLine label="İndirim" value={q.manualDiscount} minus /> : null}
      </dl>
      {q.tierName && toNumber(q.tierDiscountAmount) <= 0 && tierPercent > 0 ? (
        <p className="text-xs text-muted-foreground">
          Seviye: {q.tierName} (%{tierPercent.toLocaleString("tr-TR")})
          {q.packageName ? " · paketli oturumda seviye indirimi uygulanmaz" : ""}
        </p>
      ) : null}

      <div className="space-y-2">
        {membershipAvailable > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={useMembership} onCheckedChange={(checked) => setUseMembership(checked === true)} />
            Üyelik dakikası kullan ({membershipAvailable} dk var)
          </label>
        ) : null}
        {q.loyaltyMinutesUsable > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={useLoyalty} onCheckedChange={(checked) => setUseLoyalty(checked === true)} />
            {q.loyaltyMinutesUsable} ücretsiz dakikayı kullan ({formatTl(q.loyaltyValue)})
          </label>
        ) : null}
        {bonusBalance > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={useBonus} onCheckedChange={(checked) => setUseBonus(checked === true)} />
            Hediye bakiye kullan ({formatTl(bonusBalance)} var)
          </label>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="finish-discount">İndirim</Label>
        <div className="flex gap-2">
          <Input
            id="finish-discount"
            inputMode="decimal"
            className="w-32"
            placeholder="0"
            value={discount}
            aria-invalid={!discountValid}
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
        <span className={`text-2xl font-semibold tabular-nums text-foreground ${calculating ? "opacity-50" : ""}`}>
          {formatTl(total)}
        </span>
      </div>
      <DialogFooter>
        <Button type="submit" variant="destructive" disabled={pending || invalid}>
          {pending ? "Bitiriliyor…" : calculating ? "Hesaplanıyor…" : "Bitir ve tahsil et"}
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
        {session.packageName ? (
          <>
            <dt className="text-muted-foreground">Paket</dt>
            <dd className="text-right">{session.packageName}</dd>
          </>
        ) : null}
        {session.gameName ? (
          <>
            <dt className="text-muted-foreground">Oyun</dt>
            <dd className="text-right">{session.gameName}</dd>
          </>
        ) : null}
        {(session.membershipMinutesUsed ?? 0) > 0 ? (
          <>
            <dt className="text-muted-foreground">Üyelikten düşülen</dt>
            <dd className="text-right tabular-nums">{session.membershipMinutesUsed} dk</dd>
          </>
        ) : null}
        {toNumber(session.tierDiscountAmount) > 0 ? (
          <>
            <dt className="text-muted-foreground">Seviye indirimi</dt>
            <dd className="text-right tabular-nums">−{formatTl(session.tierDiscountAmount)}</dd>
          </>
        ) : null}
        {toNumber(session.bonusUsed) > 0 ? (
          <>
            <dt className="text-muted-foreground">Hediye bakiye</dt>
            <dd className="text-right tabular-nums">−{formatTl(session.bonusUsed)}</dd>
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
