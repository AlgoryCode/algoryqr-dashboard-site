"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Choice, Field } from "@/components/dashboard/console/ConsoleDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  CONTROLLER_TYPES,
  DAY_LABELS,
  DEVICE_TYPES,
  DEVICE_TYPE_LABELS,
  createTariff,
  deleteTariff,
  formatDays,
  getRate,
  getTypeRates,
  listTariffs,
  parseRateInput,
  rateInputValue,
  toNumber,
  updateRate,
  updateTypeRates,
  type ConsoleRate,
  type DeviceType,
  type RatePayload,
  type TariffPayload,
  type TypeRate,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function SettingsPanel({ branchId, onChanged }: { branchId: number; onChanged: () => Promise<unknown> }) {
  const rate = useQuery({ queryKey: ["console-rate", branchId], queryFn: () => getRate(branchId) });
  const typeRates = useQuery({ queryKey: ["console-type-rates", branchId], queryFn: () => getTypeRates(branchId) });
  const tariffs = useQuery({ queryKey: ["console-tariffs", branchId], queryFn: () => listTariffs(branchId) });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rate.data ? (
        <BranchRules key={JSON.stringify(rate.data)} branchId={branchId} initial={rate.data} onChanged={onChanged} />
      ) : (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      )}
      {typeRates.data ? (
        <TypeRates key={JSON.stringify(typeRates.data)} branchId={branchId} initial={typeRates.data} onChanged={onChanged} />
      ) : null}
      <div className="xl:col-span-2">
        <Tariffs branchId={branchId} tariffs={tariffs.data ?? []} onChanged={onChanged} />
      </div>
    </div>
  );
}

const ROUNDING_OPTIONS = [1, 5, 10, 15, 30, 60].map((value) => ({
  value,
  label: value === 1 ? "Dakika" : `${value} dk`,
}));

function BranchRules({
  branchId,
  initial,
  onChanged,
}: {
  branchId: number;
  initial: ConsoleRate;
  onChanged: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [hourly, setHourly] = useState(rateInputValue(initial.defaultHourlyRate));
  const [multi, setMulti] = useState(rateInputValue(initial.defaultMultiHourlyRate));
  const [minimum, setMinimum] = useState(String(initial.minimumMinutes ?? 0));
  const [rounding, setRounding] = useState(initial.roundingMinutes ?? 1);
  const [loyaltyOn, setLoyaltyOn] = useState(initial.loyaltyEveryMinutes != null);
  const [everyHours, setEveryHours] = useState(
    initial.loyaltyEveryMinutes != null ? String(initial.loyaltyEveryMinutes / 60) : "10",
  );
  const [reward, setReward] = useState(String(initial.loyaltyRewardMinutes ?? 60));

  const parsedHourly = parseRateInput(hourly);
  const parsedMulti = parseRateInput(multi);
  const minimumValue = Number(minimum);
  const everyMinutes = Math.round(Number(everyHours.replace(",", ".")) * 60);
  const rewardValue = Number(reward);
  const invalid =
    parsedHourly === undefined ||
    parsedMulti === undefined ||
    !(Number.isInteger(minimumValue) && minimumValue >= 0 && minimumValue <= 1440) ||
    (loyaltyOn && !(everyMinutes > 0 && Number.isInteger(rewardValue) && rewardValue > 0));

  const save = useMutation({
    mutationFn: (payload: RatePayload) => updateRate(branchId, payload),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["console-rate"] }), onChanged()]);
      notify("info", "Şube ayarları kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Ayarlar kaydedilemedi")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    save.mutate({
      defaultHourlyRate: parsedHourly ?? null,
      defaultMultiHourlyRate: parsedMulti ?? null,
      minimumMinutes: minimumValue,
      roundingMinutes: rounding,
      loyaltyEveryMinutes: loyaltyOn ? everyMinutes : null,
      loyaltyRewardMinutes: loyaltyOn ? rewardValue : null,
    });
  }

  return (
    <form className={`${DASHBOARD_PANEL} space-y-4`} onSubmit={submit}>
      <h3 className="text-sm font-semibold text-foreground">Şube ücreti ve kurallar</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Varsayılan saatlik ücret (₺)" htmlFor="branch-rate">
          <Input id="branch-rate" inputMode="decimal" value={hourly} onChange={(e) => setHourly(e.target.value)} />
        </Field>
        <Field label="Varsayılan 4 kol ücreti (₺)" htmlFor="branch-multi">
          <Input id="branch-multi" inputMode="decimal" value={multi} onChange={(e) => setMulti(e.target.value)} />
        </Field>
      </div>
      <Field label="Asgari ücretlenen süre (dk)" htmlFor="branch-minimum">
        <Input
          id="branch-minimum"
          className="w-32"
          inputMode="numeric"
          value={minimum}
          onChange={(e) => setMinimum(e.target.value)}
        />
      </Field>
      <div className="space-y-1.5">
        <Label>Yuvarlama</Label>
        <Choice<number> options={ROUNDING_OPTIONS} value={rounding} onChange={setRounding} />
        <p className="text-xs text-muted-foreground">
          Oynanan süre bu bloğun katına yukarı yuvarlanır; örn. 15 dk seçiliyse 7 dk oyun 15 dk ücretlenir.
        </p>
      </div>
      <div className="space-y-2 border-t border-border pt-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={loyaltyOn} onChange={(e) => setLoyaltyOn(e.target.checked)} />
          Sadakat programı
        </label>
        {loyaltyOn ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Input className="w-20" inputMode="decimal" value={everyHours} onChange={(e) => setEveryHours(e.target.value)} />
            <span>saat ücretli oyuna</span>
            <Input className="w-20" inputMode="numeric" value={reward} onChange={(e) => setReward(e.target.value)} />
            <span>dk ücretsiz</span>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Müşteri kartı bağlı oturumlarda işler.</p>
      </div>
      <Button type="submit" disabled={save.isPending || invalid}>
        Kaydet
      </Button>
    </form>
  );
}

function TypeRates({
  branchId,
  initial,
  onChanged,
}: {
  branchId: number;
  initial: TypeRate[];
  onChanged: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [values, setValues] = useState<Record<DeviceType, { hourly: string; multi: string }>>(() => {
    const map = {} as Record<DeviceType, { hourly: string; multi: string }>;
    for (const type of DEVICE_TYPES) {
      const found = initial.find((r) => r.deviceType === type);
      map[type] = { hourly: rateInputValue(found?.hourlyRate), multi: rateInputValue(found?.multiHourlyRate) };
    }
    return map;
  });
  const invalid = DEVICE_TYPES.some(
    (type) => parseRateInput(values[type].hourly) === undefined || parseRateInput(values[type].multi) === undefined,
  );

  const save = useMutation({
    mutationFn: () =>
      updateTypeRates(
        branchId,
        DEVICE_TYPES.map((type) => ({
          deviceType: type,
          hourlyRate: parseRateInput(values[type].hourly) ?? null,
          multiHourlyRate: CONTROLLER_TYPES.has(type) ? (parseRateInput(values[type].multi) ?? null) : null,
        })).filter((r) => r.hourlyRate != null || r.multiHourlyRate != null),
      ),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["console-type-rates"] }), onChanged()]);
      notify("info", "Tür ücretleri kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Tür ücretleri kaydedilemedi")),
  });

  return (
    <div className={`${DASHBOARD_PANEL} space-y-3`}>
      <h3 className="text-sm font-semibold text-foreground">Türe göre ücret</h3>
      <p className="text-xs text-muted-foreground">
        Cihazın kendi ücreti yoksa türün ücreti, o da yoksa şube ücreti kullanılır. Boş bırakılan tür şube ücretini alır.
      </p>
      <div className="space-y-2">
        {DEVICE_TYPES.map((type) => (
          <div key={type} className="grid grid-cols-[120px_1fr_1fr] items-center gap-2 text-sm">
            <span>{DEVICE_TYPE_LABELS[type]}</span>
            <Input
              inputMode="decimal"
              placeholder="Saatlik ₺"
              aria-label={`${DEVICE_TYPE_LABELS[type]} saatlik ücret`}
              value={values[type].hourly}
              onChange={(e) => setValues({ ...values, [type]: { ...values[type], hourly: e.target.value } })}
            />
            {CONTROLLER_TYPES.has(type) ? (
              <Input
                inputMode="decimal"
                placeholder="4 kol ₺"
                aria-label={`${DEVICE_TYPE_LABELS[type]} 4 kol ücreti`}
                value={values[type].multi}
                onChange={(e) => setValues({ ...values, [type]: { ...values[type], multi: e.target.value } })}
              />
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
      <Button type="button" disabled={save.isPending || invalid} onClick={() => save.mutate()}>
        Kaydet
      </Button>
    </div>
  );
}

const DAY_PRESETS: { value: string; label: string; days: number[] }[] = [
  { value: "all", label: "Her gün", days: [1, 2, 3, 4, 5, 6, 7] },
  { value: "weekdays", label: "Hafta içi", days: [1, 2, 3, 4, 5] },
  { value: "weekend", label: "Hafta sonu", days: [6, 7] },
];

function Tariffs({
  branchId,
  tariffs,
  onChanged,
}: {
  branchId: number;
  tariffs: { id: number; name: string; deviceType?: DeviceType | null; days: number[]; startTime: string; endTime: string; adjustPercent: number | string }[];
  onChanged: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("ALL");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("16:00");
  const [percent, setPercent] = useState("-20");
  const percentValue = Number(percent.replace(",", "."));
  const invalid =
    !name.trim() ||
    days.length === 0 ||
    !start ||
    !end ||
    start === end ||
    !Number.isFinite(percentValue) ||
    percentValue < -100 ||
    percentValue > 500;

  async function refresh() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["console-tariffs"] }), onChanged()]);
  }
  const create = useMutation({
    mutationFn: (payload: TariffPayload) => createTariff(branchId, payload),
    onSuccess: async () => {
      setName("");
      await refresh();
      notify("info", "Tarife eklendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Tarife eklenemedi")),
  });
  const remove = useMutation({
    mutationFn: (tariffId: number) => deleteTariff(tariffId),
    onSuccess: async () => {
      await refresh();
      notify("info", "Tarife silindi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Tarife silinemedi")),
  });

  function toggleDay(day: number) {
    setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  }

  return (
    <div className={`${DASHBOARD_PANEL} space-y-4`}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Saat dilimi tarifeleri</h3>
        <p className="text-xs text-muted-foreground">
          Seçili günlerde ve saatlerde saatlik ücrete yüzde ekler veya düşer (ör. hafta içi gündüz −%20, gece +%25).
          Bitiş başlangıçtan önceyse gece yarısını geçer. Bir türe özel tarife, tüm türlere olandan önce gelir.
        </p>
      </div>
      {tariffs.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {tariffs.map((t) => {
            const pct = toNumber(t.adjustPercent);
            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className="font-medium">{t.name}</span>{" "}
                  <span className="text-muted-foreground">
                    · {formatDays(t.days)} · {t.startTime.slice(0, 5)}–{t.endTime.slice(0, 5)} ·{" "}
                    {t.deviceType ? DEVICE_TYPE_LABELS[t.deviceType] : "Tüm türler"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={`tabular-nums font-medium ${pct < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    {pct > 0 ? "+" : ""}%{pct.toLocaleString("tr-TR")}
                  </span>
                  <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(t.id)}>
                    Sil
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Tarife yok; her saat aynı ücret uygulanır.</p>
      )}

      <form
        className="space-y-3 border-t border-border pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (invalid) return;
          create.mutate({
            name: name.trim(),
            deviceType: type === "ALL" ? null : (type as DeviceType),
            days: [...days].sort((a, b) => a - b),
            startTime: start,
            endTime: end,
            adjustPercent: String(percentValue),
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Ad" htmlFor="tariff-name">
            <Input id="tariff-name" value={name} maxLength={80} placeholder="Gündüz indirimi" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Tür" htmlFor="tariff-type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="tariff-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm türler</SelectItem>
                {DEVICE_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {DEVICE_TYPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="space-y-1.5">
          <Label>Günler</Label>
          <div className="flex flex-wrap gap-1">
            {DAY_PRESETS.map((preset) => (
              <Button key={preset.value} type="button" size="sm" variant="ghost" onClick={() => setDays(preset.days)}>
                {preset.label}
              </Button>
            ))}
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={days.includes(day) ? "default" : "outline"}
                onClick={() => toggleDay(day)}
              >
                {DAY_LABELS[day]}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Başlangıç" htmlFor="tariff-start">
            <Input id="tariff-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Bitiş" htmlFor="tariff-end">
            <Input id="tariff-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Ücret değişimi (%)" htmlFor="tariff-percent">
            <Input id="tariff-percent" className="w-28" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </Field>
          <Button type="submit" disabled={create.isPending || invalid}>
            Tarife ekle
          </Button>
        </div>
      </form>
    </div>
  );
}
