"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { ChefChatBadge } from "@/lib/chef/chef-chat-badges";

type MenuChefQuickBadgesProps = {
  publicId: string;
  open?: boolean;
  disabled?: boolean;
  onSelect: (badge: ChefChatBadge) => void;
  themeVariant?: "petek-waffle";
};

const badgeIcons: Record<string, typeof Sparkles> = {
  chef_recommended: Sparkles,
  popular: TrendingUp,
};

export function MenuChefQuickBadges({
  publicId,
  open = true,
  disabled = false,
  onSelect,
  themeVariant,
}: MenuChefQuickBadgesProps) {
  const [badges, setBadges] = useState<ChefChatBadge[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void fetch(`/api/menu/chef/badges?publicId=${encodeURIComponent(publicId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Chef badges request failed"))))
      .then((data: { badges?: ChefChatBadge[] }) => {
        if (cancelled) return;
        setBadges(Array.isArray(data.badges) ? data.badges : []);
      })
      .catch(() => {
        if (!cancelled) setBadges([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, publicId]);

  if (badges.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 pt-2.5",
        themeVariant === "petek-waffle" && "petek-chef-quick-badges",
      )}
    >
      {badges.map((badge, index) => {
        const Icon = badgeIcons[badge.id] ?? Sparkles;
        return (
          <motion.button
            key={badge.id}
            type="button"
            disabled={disabled}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.22 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(badge)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-[#1c2824]/10 bg-[#f7f8f7] px-2.5 py-1 text-[12px] font-medium tracking-[-0.01em] text-[#2a3833] transition hover:border-[#2a3833]/20 hover:bg-white disabled:pointer-events-none disabled:opacity-40",
              themeVariant === "petek-waffle" && "petek-chef-quick-badge",
            )}
          >
            <Icon className="h-3.5 w-3.5 text-[#5f7a6d]" strokeWidth={2.25} />
            {badge.label}
          </motion.button>
        );
      })}
    </div>
  );
}
