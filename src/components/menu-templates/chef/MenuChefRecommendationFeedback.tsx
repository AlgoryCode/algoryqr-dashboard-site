"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";

import type { ChefTurnFeedbackValue } from "@/lib/chef/submit-chef-turn-feedback";
import { cn } from "@/lib/utils";

type MenuChefRecommendationFeedbackProps = {
  value?: ChefTurnFeedbackValue;
  disabled?: boolean;
  onSelect: (value: ChefTurnFeedbackValue) => void;
  themeVariant?: "petek-waffle";
};

export function MenuChefRecommendationFeedback({
  value,
  disabled,
  onSelect,
  themeVariant,
}: MenuChefRecommendationFeedbackProps) {
  return (
    <div className={cn("flex items-center gap-1.5 pt-0.5", themeVariant === "petek-waffle" && "petek-chef-feedback")}>
      <span className="mr-1 text-[11.5px] text-[#7a8a83]">Bu öneri işinize yaradı mı?</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect("like")}
        aria-pressed={value === "like"}
        aria-label="Beğen"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition disabled:opacity-40 ${
          value === "like"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-[#1c2824]/10 bg-white/80 text-[#5f6f68] hover:bg-white"
        }`}
      >
        <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect("dislike")}
        aria-pressed={value === "dislike"}
        aria-label="Beğenme"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition disabled:opacity-40 ${
          value === "dislike"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-[#1c2824]/10 bg-white/80 text-[#5f6f68] hover:bg-white"
        }`}
      >
        <ThumbsDown className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden />
      </button>
    </div>
  );
}
