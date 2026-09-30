"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  Building2,
  Check,
  CircleHelp,
  Copy,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";

import type { BranchOverview } from "@/components/dashboard/branch-detail/branch-detail-types";
import type { MenuRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { invalidateBranches } from "@/hooks/use-branches";
import { ApiError } from "@/lib/api";
import { updateBranchRequest } from "@/lib/branch";
import { ACCOUNT_CARD } from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

export function Hero({ branchId, name, overview }: { branchId: number; name: string; overview: BranchOverview }) {
  return (
    <section className="relative min-h-[168px] overflow-hidden rounded-2xl bg-zinc-900 text-white">
      {overview.photoUrl ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(overview.photoUrl)})` }} />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
      <div className="relative flex min-h-[168px] flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", overview.active ? "bg-emerald-500 text-white" : "bg-white/20 text-white")}>
            {overview.active ? "Açık" : "Kapalı"}
          </span>
          <Button asChild variant="secondary" className="h-9 rounded-xl bg-white/95 px-3 text-zinc-900 hover:bg-white">
            <Link href={DASHBOARD_ROUTES.branchSettings(branchId)}>
              <Pencil />
              Düzenle
            </Link>
          </Button>
        </div>
        <BranchTitle name={name} address={overview.address} phone={overview.phone} />
      </div>
    </section>
  );
}

export function InfoCard({
  branchId,
  name,
  menus,
  overview,
  className,
}: {
  branchId: number;
  name: string;
  menus: MenuRow[];
  overview: BranchOverview;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kitchenOn, setKitchenOn] = useState(overview.kitchenOn);
  const [kitchenSaving, setKitchenSaving] = useState(false);
  const [courierOn, setCourierOn] = useState(overview.courierOn);
  const [courierSaving, setCourierSaving] = useState(false);
  const [draft, setDraft] = useState(() => infoDraft(name, overview));
  const shown = editing ? draft : infoDraft(name, overview);
  const rows = infoRows(shown);

  useEffect(() => {
    setKitchenOn(overview.kitchenOn);
    setCourierOn(overview.courierOn);
  }, [overview.kitchenOn, overview.courierOn]);

  const branchPayload = (flags: { kitchenEnabled: boolean; courierEnabled: boolean }) => ({
    name: name.trim(),
    address: overview.address?.trim() || undefined,
    phone: overview.phone?.trim() || undefined,
    email: overview.email?.trim() || undefined,
    ...flags,
  });

  const saveKitchen = async (next: boolean) => {
    const previous = kitchenOn;
    setKitchenOn(next);
    setKitchenSaving(true);
    try {
      await updateBranchRequest(branchId, branchPayload({ kitchenEnabled: next, courierEnabled: courierOn }));
      await invalidateBranches(queryClient);
    } catch (error) {
      setKitchenOn(previous);
      toast({
        title: error instanceof ApiError ? error.message : "Mutfak güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setKitchenSaving(false);
    }
  };

  const saveCourier = async (next: boolean) => {
    const previous = courierOn;
    setCourierOn(next);
    setCourierSaving(true);
    try {
      await updateBranchRequest(branchId, branchPayload({ kitchenEnabled: kitchenOn, courierEnabled: next }));
      await invalidateBranches(queryClient);
    } catch (error) {
      setCourierOn(previous);
      toast({
        title: error instanceof ApiError ? error.message : "Kurye güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setCourierSaving(false);
    }
  };

  const startEditing = () => {
    setDraft(infoDraft(name, overview));
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(infoDraft(name, overview));
    setEditing(false);
  };

  const saveEditing = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Şube adı zorunludur.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateBranchRequest(branchId, {
        name: draft.name.trim(),
        address: draft.address.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        kitchenEnabled: kitchenOn,
        courierEnabled: courierOn,
      });
      await invalidateBranches(queryClient);
      setEditing(false);
      toast({ title: "Şube bilgileri güncellendi." });
    } catch (error) {
      toast({
        title: error instanceof ApiError ? error.message : "Şube güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={cn(ACCOUNT_CARD, "p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Şube bilgileri</h2>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full text-zinc-950 hover:bg-[#fafafa] disabled:opacity-60"
                aria-label="İptal et"
                disabled={saving}
                onClick={cancelEditing}
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full text-zinc-950 hover:bg-[#fafafa] disabled:opacity-60"
                aria-label="Kaydet"
                disabled={saving}
                onClick={() => void saveEditing()}
              >
                <Save className="size-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full text-zinc-950 hover:bg-[#fafafa]"
              aria-label="Düzenle"
              onClick={startEditing}
            >
              <Pencil className="size-4" />
            </button>
          )}
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        <IdRow icon={Hash} label="Şube ID" value={branchId} />
        <IdRow
          icon={Building2}
          label="İşletme ID"
          value={overview.merchantId}
          hint="Personel girişinde kullanılır"
        />
        {rows.map((row) => (
          <li key={row.key} className="flex items-start gap-2.5">
            <row.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">{row.label}</p>
              <InfoValue row={row} draft={draft} editing={editing} onChange={setDraft} />
            </div>
          </li>
        ))}
        <li className="flex items-start gap-2.5">
          <UtensilsCrossed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[11px] text-muted-foreground">Mutfak</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-zinc-950"
                    aria-label="Mutfak ne işe yarar"
                  >
                    <CircleHelp className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-left font-normal leading-relaxed">
                  Açıkken bu şubenin siparişleri mutfak ekranına düşer ve mutfak hesabı eklenebilir.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="mt-1 flex items-center justify-between gap-3 text-sm text-foreground">
              <span className="flex items-center gap-2">
                <Switch
                  checked={kitchenOn}
                  disabled={kitchenSaving}
                  onCheckedChange={(next) => void saveKitchen(next)}
                  aria-label="Mutfak"
                />
                {kitchenOn ? "Açık" : "Kapalı"}
              </span>
              <a
                href={DASHBOARD_ROUTES.kitchenScreen(branchId)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Mutfağa git
              </a>
            </span>
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <Bike className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[11px] text-muted-foreground">Kurye</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-zinc-950"
                    aria-label="Kurye ne işe yarar"
                  >
                    <CircleHelp className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-left font-normal leading-relaxed">
                  Açıkken mutfak siparişleri kuryeye teslim edebilir; kurye hesabıyla giriş yapan personel kendi teslimatlarını görür.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="mt-1 flex items-center justify-between gap-3 text-sm text-foreground">
              <span className="flex items-center gap-2">
                <Switch
                  checked={courierOn}
                  disabled={courierSaving}
                  onCheckedChange={(next) => void saveCourier(next)}
                  aria-label="Kurye"
                />
                {courierOn ? "Açık" : "Kapalı"}
              </span>
              <a
                href={DASHBOARD_ROUTES.staffGate}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Kurye ekranına git
              </a>
            </span>
          </div>
        </li>
      </ul>
      <MenuLinks menus={menus} />
    </article>
  );
}

type InfoDraft = {
  name: string;
  address: string;
  phone: string;
  email: string;
};

type InfoRow = {
  key: keyof InfoDraft;
  icon: typeof Store;
  label: string;
  value: string;
};

function infoDraft(name: string, overview: BranchOverview): InfoDraft {
  return {
    name,
    address: overview.address ?? "",
    phone: overview.phone ?? "",
    email: overview.email ?? "",
  };
}

function infoRows(draft: InfoDraft): InfoRow[] {
  return [
    { key: "name", icon: Store, label: "Şube adı", value: draft.name || "—" },
    { key: "address", icon: MapPin, label: "Adres", value: draft.address || "—" },
    { key: "phone", icon: Phone, label: "Telefon", value: draft.phone || "—" },
    { key: "email", icon: Mail, label: "E-posta", value: draft.email || "—" },
  ];
}

function IdRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Store;
  label: string;
  value: number;
  hint?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: `${label} kopyalanamadı.`, variant: "destructive" });
    }
  };

  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <span className="flex items-center gap-2 text-sm text-foreground">
          <span className="font-mono tabular-nums">{value}</span>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-full text-zinc-950 hover:bg-[#fafafa]"
            aria-label={`${label} kopyala`}
            onClick={() => void copy()}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        </span>
      </div>
    </li>
  );
}

function InfoValue({
  row,
  draft,
  editing,
  onChange,
}: {
  row: InfoRow;
  draft: InfoDraft;
  editing: boolean;
  onChange: (next: InfoDraft) => void;
}) {
  if (!editing) {
    return <p className="truncate text-sm text-foreground">{row.value}</p>;
  }
  return (
    <Input
      value={draft[row.key]}
      onChange={(event) => onChange({ ...draft, [row.key]: event.target.value })}
      className="mt-1 h-8"
      aria-label={row.label}
    />
  );
}

function BranchTitle({ name, address, phone }: { name: string; address: string | null; phone: string | null }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
      <Contact address={address} phone={phone} />
    </div>
  );
}

function Contact({ address, phone }: { address: string | null; phone: string | null }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
      {address ? (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {address}
        </span>
      ) : null}
      {phone ? (
        <span className="inline-flex items-center gap-1.5">
          <Phone className="size-3.5" />
          {phone}
        </span>
      ) : null}
    </div>
  );
}

function MenuLinks({ menus }: { menus: MenuRow[] }) {
  if (menus.length === 0) return null;
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-[11px] text-muted-foreground">Menüler</p>
      <ul className="mt-2 space-y-1.5">
        {menus.map((menu) => (
          <li key={menu.menuId}>
            <Link href={DASHBOARD_ROUTES.digitalMenuEdit(menu.qrId)} className="text-sm text-foreground hover:underline">
              {menu.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
