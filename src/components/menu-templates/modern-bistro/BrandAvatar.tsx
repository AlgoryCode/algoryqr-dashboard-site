"use client";

import { resolveMenuLogoUrl } from "@/lib/menu-assets";
import { cn } from "@/lib/utils";

type ModernBistroBrandAvatarProps = {
  businessName: string;
  logoUrl?: string | null;
  size?: "md" | "lg";
  className?: string;
};

export function ModernBistroBrandAvatar({
  businessName,
  logoUrl,
  size = "md",
  className,
}: ModernBistroBrandAvatarProps) {
  const src = resolveMenuLogoUrl(logoUrl);
  const sizeClass = size === "lg" ? "h-20 w-20" : "h-14 w-14";
  const initial = businessName.trim().slice(0, 1).toUpperCase() || "•";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--mb-surface)] bg-[var(--mb-muted-surface)] shadow-[var(--mb-card-shadow)]",
        sizeClass,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={businessName} className="h-full w-full object-contain p-1" />
      ) : (
        <span className="text-lg font-bold text-[var(--mb-primary)]">{initial}</span>
      )}
    </span>
  );
}
