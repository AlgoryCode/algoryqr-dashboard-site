"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Field } from "@/components/dashboard/console/ConsoleDialogs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  DEVICE_TYPES,
  DEVICE_TYPE_LABELS,
  createMembershipPlan,
  deleteMembershipPlan,
  formatDuration,
  formatTl,
  getProgram,
  listMembershipPlans,
  parseRateInput,
  rateInputValue,
  updateMembershipPlan,
  updateProgram,
  type DeviceType,
  type LoyaltyProgram,
  type MembershipPlan,
  type MembershipPlanPayload,
  type ProgramPayload,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import { CONSOLE_DIALOG } from "@/components/dashboard/console/console-ui";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const MAX_TIERS = 10;

/** Customer programme for every branch: referral rewards, levels and membership plans. */
export function ProgramPanel() {
  const program = useQuery({ queryKey: ["console-program"], queryFn: getProgram });
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {program.data ? (
        <ProgramForm key={JSON.stringify(program.data)} initial={program.data} />
      ) : (
        <p className="text-sm text-muted-foreground">{program.isError ? "Program yüklenemedi." : "Yükleniyor…"}</p>
      )}
      <PlansSection />
    </div>
  );
}

type TierRow = { key: number; name: string; minSpent: string; discountPercent: string };

function ProgramForm({ initial }: { initial: LoyaltyProgram }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [reward, setReward] = useState(rateInputValue(initial.referralRewardAmount));
  const [welcome, setWelcome] = useState(rateInputValue(initial.referralWelcomeAmount));
  const [tiers, setTiers] = useState<TierRow[]>(() =>
    initial.tiers.map((tier, index) => ({
      key: index,
      name: tier.name,
      minSpent: rateInputValue(tier.minSpent),
      discountPercent: rateInputValue(tier.discountPercent),
    })),
  );
  const [nextKey, setNextKey] = useState(initial.tiers.length);
  const parsedReward = parseRateInput(reward);
  const parsedWelcome = parseRateInput(welcome);
  const parsedTiers = tiers.map((tier) => ({
    name: tier.name.trim(),
    minSpent: parseRateInput(tier.minSpent),
    discountPercent: parseRateInput(tier.discountPercent),
  }));
  const tiersInvalid = parsedTiers.some(
    (tier) => !tier.name || tier.minSpent == null || tier.discountPercent == null || Number(tier.discountPercent) > 100,
  );
  const invalid = parsedReward === undefined || parsedWelcome === undefined || tiersInvalid;

  const save = useMutation({
    mutationFn: (payload: ProgramPayload) => updateProgram(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["console-program"] }),
        queryClient.invalidateQueries({ queryKey: ["device-customers"] }),
      ]);
      notify("info", "Program kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Program kaydedilemedi")),
  });

  function patch(key: number, change: Partial<TierRow>) {
    setTiers((current) => current.map((tier) => (tier.key === key ? { ...tier, ...change } : tier)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    save.mutate({
      referralRewardAmount: parsedReward ?? null,
      referralWelcomeAmount: parsedWelcome ?? null,
      tiers: parsedTiers
        .map((tier) => ({
          name: tier.name,
          minSpent: tier.minSpent as string,
          discountPercent: tier.discountPercent as string,
        }))
        .sort((a, b) => Number(a.minSpent) - Number(b.minSpent)),
    });
  }

  return (
    <form className={`${DASHBOARD_PANEL} space-y-4`} onSubmit={submit}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Arkadaşını getir</h3>
        <p className="text-xs text-muted-foreground">
          Yeni müşteri kart açılırken arkadaşının davet kodunu girerse ikisine de hediye bakiye yüklenir. Boş bırakılan
          ödül kapalıdır.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Davet edene (₺)" htmlFor="program-reward">
          <Input id="program-reward" inputMode="decimal" value={reward} onChange={(e) => setReward(e.target.value)} />
        </Field>
        <Field label="Yeni gelene (₺)" htmlFor="program-welcome">
          <Input id="program-welcome" inputMode="decimal" value={welcome} onChange={(e) => setWelcome(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Seviyeler</h3>
          <p className="text-xs text-muted-foreground">
            Toplam harcaması eşiği geçen müşteri o seviyenin indirimini süre ücretinde otomatik alır (paketlerde değil).
          </p>
        </div>
        {tiers.length === 0 ? <p className="text-sm text-muted-foreground">Seviye yok.</p> : null}
        {tiers.map((tier, index) => (
          <div key={tier.key} className="flex flex-wrap items-end gap-2">
            <Field label={index === 0 ? "Ad" : ""} htmlFor={`tier-name-${tier.key}`}>
              <Input
                id={`tier-name-${tier.key}`}
                className="w-36"
                value={tier.name}
                maxLength={40}
                placeholder="Gümüş"
                onChange={(e) => patch(tier.key, { name: e.target.value })}
              />
            </Field>
            <Field label={index === 0 ? "Harcama eşiği (₺)" : ""} htmlFor={`tier-min-${tier.key}`}>
              <Input
                id={`tier-min-${tier.key}`}
                className="w-32"
                inputMode="decimal"
                value={tier.minSpent}
                onChange={(e) => patch(tier.key, { minSpent: e.target.value })}
              />
            </Field>
            <Field label={index === 0 ? "İndirim (%)" : ""} htmlFor={`tier-pct-${tier.key}`}>
              <Input
                id={`tier-pct-${tier.key}`}
                className="w-24"
                inputMode="decimal"
                value={tier.discountPercent}
                onChange={(e) => patch(tier.key, { discountPercent: e.target.value })}
              />
            </Field>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setTiers((current) => current.filter((t) => t.key !== tier.key))}
            >
              Kaldır
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={tiers.length >= MAX_TIERS}
          onClick={() => {
            setTiers((current) => [...current, { key: nextKey, name: "", minSpent: "", discountPercent: "" }]);
            setNextKey(nextKey + 1);
          }}
        >
          Seviye ekle
        </Button>
        {tiersInvalid ? (
          <p className="text-xs text-destructive">Her seviyeye ad, eşik ve 0–100 arası indirim girin.</p>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending || invalid}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}

// ---- Membership plans ----------------------------------------------------------------------------------------

function PlansSection() {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [editing, setEditing] = useState<MembershipPlan | "new" | null>(null);
  const plans = useQuery({ queryKey: ["console-plans", "all"], queryFn: () => listMembershipPlans(false) });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["console-plans"] });
  }
  const save = useMutation({
    mutationFn: (payload: MembershipPlanPayload) =>
      editing && editing !== "new" ? updateMembershipPlan(editing.id, payload) : createMembershipPlan(payload),
    onSuccess: async () => {
      setEditing(null);
      await refresh();
      notify("info", "Üyelik planı kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Plan kaydedilemedi")),
  });
  const remove = useMutation({
    mutationFn: (planId: number) => deleteMembershipPlan(planId),
    onSuccess: async () => {
      await refresh();
      notify("info", "Plan silindi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Plan silinemedi")),
  });

  return (
    <div className={`${DASHBOARD_PANEL} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Üyelik planları</h3>
          <p className="text-xs text-muted-foreground">
            Ör. aylık 20 saat 1.500 ₺. Satış Müşteriler sekmesinden yapılır; dakikalar oturum bitirirken düşülür.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          Plan ekle
        </Button>
      </div>
      {(plans.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{plans.isLoading ? "Yükleniyor…" : "Plan yok."}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {(plans.data ?? []).map((plan) => (
            <li
              key={plan.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${plan.active ? "" : "opacity-60"}`}
            >
              <span>
                <span className="font-medium">{plan.name}</span>{" "}
                <span className="text-muted-foreground">
                  · {formatDuration(plan.minutes)} · {plan.periodDays} gün · {formatTl(plan.price)} ·{" "}
                  {plan.deviceType ? DEVICE_TYPE_LABELS[plan.deviceType] : "Tüm türler"}
                  {plan.active ? "" : " · Pasif"}
                </span>
              </span>
              <span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(plan)}>
                  Düzenle
                </Button>
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(plan.id)}>
                  Sil
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className={CONSOLE_DIALOG}>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Üyelik planı ekle" : "Planı düzenle"}</DialogTitle>
            <DialogDescription>Satılmış üyelikler satıldıkları koşulla devam eder.</DialogDescription>
          </DialogHeader>
          {editing != null ? (
            <PlanForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              pending={save.isPending}
              onSubmit={(payload) => save.mutate(payload)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: MembershipPlan | null;
  pending: boolean;
  onSubmit: (payload: MembershipPlanPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(rateInputValue(initial?.price));
  const [hours, setHours] = useState(initial ? String(initial.minutes / 60).replace(".", ",") : "20");
  const [period, setPeriod] = useState(String(initial?.periodDays ?? 30));
  const [type, setType] = useState<string>(initial?.deviceType ?? "ALL");
  const [active, setActive] = useState(initial?.active ?? true);
  const parsedPrice = parseRateInput(price);
  const minutes = Math.round(Number(hours.replace(",", ".")) * 60);
  const periodDays = Number(period);
  const invalid =
    !name.trim() ||
    parsedPrice == null ||
    !(minutes >= 1 && minutes <= 100000) ||
    !(Number.isInteger(periodDays) && periodDays >= 1 && periodDays <= 366);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid || parsedPrice == null) return;
    onSubmit({
      name: name.trim(),
      price: parsedPrice,
      minutes,
      periodDays,
      deviceType: type === "ALL" ? null : (type as DeviceType),
      active,
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Ad" htmlFor="plan-name">
        <Input id="plan-name" value={name} maxLength={80} placeholder="Aylık 20 saat" onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fiyat (₺)" htmlFor="plan-price">
          <Input id="plan-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Süre (saat)" htmlFor="plan-hours">
          <Input id="plan-hours" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </Field>
        <Field label="Geçerlilik (gün)" htmlFor="plan-period">
          <Input id="plan-period" inputMode="numeric" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
      </div>
      <Field label="Cihaz türü" htmlFor="plan-type">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="plan-type">
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
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
        Satışta
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending || invalid}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}
