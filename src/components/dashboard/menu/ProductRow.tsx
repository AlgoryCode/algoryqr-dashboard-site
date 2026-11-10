"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageIcon, ListPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { LIST_ROW, LIST_ROW_LINK, ListHead } from "@/components/dashboard/ListLayout";
import { ToneBadge } from "@/components/dashboard/ToneBadge";
import { TONE_ACTION } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRODUCT_FLAG_TONE } from "@/lib/badge-tones";
import { cn } from "@/lib/utils";

const COLUMNS_WITH_PLACEMENT =
  "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_5.5rem_7.5rem] lg:gap-4";
const COLUMNS = "lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_5.5rem_7.5rem] lg:gap-4";

function ProductThumb({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-muted lg:size-11">
      {imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- merchant images come from arbitrary hosts
        <img
          src={imageUrl}
          alt={name}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground/60" aria-hidden />
      )}
    </span>
  );
}

export function ProductListHead({ showPlacement }: { showPlacement: boolean }) {
  return (
    <ListHead
      columns={showPlacement ? COLUMNS_WITH_PLACEMENT : COLUMNS}
      labels={[
        "Ürün",
        "Kategori",
        ...(showPlacement ? ["Menü ve şube"] : []),
        { right: "Fiyat" },
        { srOnly: "İşlemler" },
      ]}
    />
  );
}

export function ProductRow({
  name,
  imageUrl,
  href,
  category,
  placement,
  price,
  available,
  onAssign,
  onDelete,
}: {
  name: string;
  imageUrl?: string | null;
  href: string;
  category?: string | null;
  /** Omit on pages already limited to a single menu. */
  placement?: { menu: string; branch: string | null };
  price: string | null;
  available: boolean;
  onAssign?: () => void;
  onDelete: () => void;
}) {
  const placementText = placement ? [placement.menu, placement.branch].filter(Boolean).join(" · ") : null;

  return (
    <li
      className={cn(LIST_ROW, placement ? COLUMNS_WITH_PLACEMENT : COLUMNS)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ProductThumb key={imageUrl ?? "none"} name={name} imageUrl={imageUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={href}
              className={cn("truncate text-sm font-medium text-foreground", LIST_ROW_LINK)}
            >
              {name}
            </Link>
            {!available ? (
              <ToneBadge tone={PRODUCT_FLAG_TONE.unavailable}>Satışta değil</ToneBadge>
            ) : null}
          </div>
          {category ? <p className="truncate text-xs text-muted-foreground lg:hidden">{category}</p> : null}
          {placementText ? <p className="truncate text-xs text-muted-foreground lg:hidden">{placementText}</p> : null}
        </div>
      </div>

      <p className="hidden truncate text-sm text-muted-foreground lg:block">{category ?? "—"}</p>

      {placement ? (
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm text-foreground">{placement.menu}</p>
          {placement.branch ? <p className="truncate text-xs text-muted-foreground">{placement.branch}</p> : null}
        </div>
      ) : null}

      <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
        {price ?? <span className="font-normal text-muted-foreground">Fiyat yok</span>}
      </p>

      <div className="relative z-10 hidden items-center justify-end gap-1 lg:flex">
        {onAssign ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-8", TONE_ACTION.assign)}
            onClick={onAssign}
            aria-label={`${name} ürününü menüye ata`}
            title="Menüye ata"
          >
            <ListPlus className="size-3.5" />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" className={cn("size-8", TONE_ACTION.edit)} asChild>
          <Link href={href} aria-label={`${name} ürününü düzenle`} title="Düzenle">
            <Pencil className="size-3.5" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-8", TONE_ACTION.delete)}
          onClick={onDelete}
          aria-label={`${name} ürününü sil`}
          title="Sil"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="relative z-10 lg:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`${name} işlemleri`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem asChild>
              <Link href={href}>
                <Pencil className="size-3.5" />
                Düzenle
              </Link>
            </DropdownMenuItem>
            {onAssign ? (
              <DropdownMenuItem onSelect={onAssign}>
                <ListPlus className="size-3.5" />
                Menüye ata
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="size-3.5" />
              Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
