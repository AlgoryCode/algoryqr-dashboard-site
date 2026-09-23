"use client";

import Link from "next/link";
import { Mail, MapPin, Pencil, Phone, Store, UtensilsCrossed } from "lucide-react";

import { CARD } from "@/components/dashboard/branch-detail/branch-detail-cards";
import type { BranchOverview } from "@/components/dashboard/branch-detail/branch-detail-types";
import type { MenuRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import { Button } from "@/components/ui/button";
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

export function InfoCard({ name, menus, overview }: { name: string; menus: MenuRow[]; overview: BranchOverview }) {
  const rows = [
    { icon: Store, label: "Şube adı", value: name },
    { icon: MapPin, label: "Adres", value: overview.address || "—" },
    { icon: Phone, label: "Telefon", value: overview.phone || "—" },
    { icon: Mail, label: "E-posta", value: overview.email || "—" },
    { icon: UtensilsCrossed, label: "Mutfak", value: overview.kitchenOn ? "Açık" : "Kapalı" },
  ];
  return (
    <article className={cn(CARD, "p-4")}>
      <h2 className="text-sm font-semibold text-foreground">Şube bilgileri</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-2.5">
            <row.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">{row.label}</p>
              <p className="truncate text-sm text-foreground">{row.value}</p>
            </div>
          </li>
        ))}
      </ul>
      <MenuLinks menus={menus} />
    </article>
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
