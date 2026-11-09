"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageIcon, ListPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { TONE_ACTION } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <div
      className={cn(
        "hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground",
        showPlacement ? COLUMNS_WITH_PLACEMENT : COLUMNS,
      )}
    >
      <span>Ürün</span>
      <span>Kategori</span>
      {showPlacement ? <span>Menü ve şube</span> : null}
      <span className="text-right">Fiyat</span>
      <span className="sr-only">İşlemler</span>
    </div>
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
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 lg:items-center lg:px-4 lg:py-2",
        placement ? COLUMNS_WITH_PLACEMENT : COLUMNS,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ProductThumb key={imageUrl ?? "none"} name={name} imageUrl={imageUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={href}
              className="truncate text-sm font-medium text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
            >
              {name}
            </Link>
            {!available ? (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Satışta değil</span>
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
