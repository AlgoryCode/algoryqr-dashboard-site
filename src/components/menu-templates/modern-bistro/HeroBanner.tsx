"use client";

import { MapPin, MessageCircle, Phone } from "lucide-react";

import { resolveMenuHeroImage } from "@/lib/menu-assets";
import { cn } from "@/lib/utils";

import { useMenuLocale } from "../shared/menu-locale";
import { usePublicMenuTheme } from "../shared/public-menu-theme";
import { ModernBistroBrandAvatar } from "./BrandAvatar";

type ModernBistroHeroBannerProps = {
  businessName: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  slogan?: string | null;
  phone?: string | null;
  address?: string | null;
  onBrandClick?: () => void;
};

function whatsAppHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function ModernBistroHeroBanner({
  businessName,
  logoUrl,
  coverUrl,
  slogan,
  phone,
  address,
  onBrandClick,
}: ModernBistroHeroBannerProps) {
  const { t } = useMenuLocale();
  const theme = usePublicMenuTheme();
  const heroImage = resolveMenuHeroImage(coverUrl, theme.heroImage);
  const logoLeft = theme.heroLogoPlacement === "start";
  const subtitle = slogan?.trim() || t.bonAppetit;
  const trimmedPhone = phone?.trim();
  const trimmedAddress = address?.trim();
  const waHref = trimmedPhone ? whatsAppHref(trimmedPhone) : null;

  const avatar = (
    <ModernBistroBrandAvatar
      businessName={businessName}
      logoUrl={logoUrl}
      size={logoLeft ? "md" : "lg"}
    />
  );

  const brand = onBrandClick ? (
    <button
      type="button"
      onClick={onBrandClick}
      className={cn("rounded-full transition-opacity hover:opacity-90", logoLeft && "flex min-w-0 items-center gap-3")}
      aria-label={businessName}
    >
      {avatar}
      {logoLeft ? (
        <span className="min-w-0 text-left">
          <span className="block truncate text-base font-bold tracking-tight text-white drop-shadow">
            {businessName}
          </span>
          <span className="mt-0.5 block truncate text-sm text-white/85">{subtitle}</span>
        </span>
      ) : null}
    </button>
  ) : (
    <span className={cn(logoLeft && "flex min-w-0 items-center gap-3")}>
      {avatar}
      {logoLeft ? (
        <span className="min-w-0">
          <span className="block truncate text-base font-bold tracking-tight text-white drop-shadow">
            {businessName}
          </span>
          <span className="mt-0.5 block truncate text-sm text-white/85">{subtitle}</span>
        </span>
      ) : null}
    </span>
  );

  return (
    <section className="relative w-full">
      <div className="relative aspect-[16/9] w-full sm:aspect-[2/1]">
        <div className="absolute inset-0 overflow-hidden">
          {heroImage ? (
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#e0117a,#c77dff)]" />
          )}
          {logoLeft ? (
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          ) : null}
        </div>

        {trimmedAddress || trimmedPhone ? (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
            {trimmedAddress ? (
              <a
                href={mapsHref(trimmedAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
                aria-label={trimmedAddress}
              >
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
              </a>
            ) : null}
            {trimmedPhone ? (
              <a
                href={`tel:${trimmedPhone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
                aria-label={trimmedPhone}
              >
                <Phone className="h-4 w-4" strokeWidth={1.75} />
              </a>
            ) : null}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
                aria-label={t.whatsapp}
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              </a>
            ) : null}
          </div>
        ) : null}

        <div
          className={
            logoLeft
              ? "absolute bottom-4 left-4 z-10 max-w-[85%]"
              : "absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2"
          }
        >
          {brand}
        </div>
      </div>

      {logoLeft ? null : (
        <div className="border-b border-[var(--mb-border)] bg-[var(--mb-surface)] px-4 pb-4 pt-12 text-center sm:px-6">
          {onBrandClick ? (
            <button
              type="button"
              onClick={onBrandClick}
              className="mx-auto block max-w-full transition-opacity hover:opacity-80"
            >
              <h1 className="truncate text-lg font-bold tracking-tight text-[var(--mb-fg)]">
                {businessName}
              </h1>
              <p className="mt-1.5 truncate font-serif text-[15px] italic text-[var(--mb-brand-subtitle)]">
                {subtitle}
              </p>
            </button>
          ) : (
            <>
              <h1 className="truncate text-lg font-bold tracking-tight text-[var(--mb-fg)]">
                {businessName}
              </h1>
              <p className="mt-1.5 truncate font-serif text-[15px] italic text-[var(--mb-brand-subtitle)]">
                {subtitle}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
