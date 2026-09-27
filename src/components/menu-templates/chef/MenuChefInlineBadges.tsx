"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import type { ChefChatBadge } from "@/lib/chef/chef-chat-badges";

type MenuChefInlineBadgesProps = {
  badges: ChefChatBadge[];
  disabled?: boolean;
  onSelect: (badge: ChefChatBadge) => void;
};

export function MenuChefInlineBadges({
  badges,
  disabled = false,
  onSelect,
}: MenuChefInlineBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {badges.map((badge, index) => (
        <motion.button
          key={badge.id}
          type="button"
          disabled={disabled}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.22 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(badge)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#1c2824]/10 bg-[#f7f8f7] px-2.5 py-1 text-[12px] font-medium tracking-[-0.01em] text-[#2a3833] transition hover:border-[#2a3833]/20 hover:bg-white disabled:pointer-events-none disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#5f7a6d]" strokeWidth={2.25} />
          {badge.label}
        </motion.button>
      ))}
    </div>
  );
}
