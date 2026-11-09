import type { ComponentType } from "react";

export const TONES = {
  red: "bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]",
  green: "bg-[#E8FDF2] text-[#128C7E] dark:bg-[#128C7E]/20 dark:text-[#4ADE80]",
  violet: "bg-[#F5F3FF] text-[#8B5CF6] dark:bg-[#8B5CF6]/15 dark:text-[#A78BFA]",
  teal: "bg-[#EAFBF9] text-[#00A699] dark:bg-[#00A699]/15 dark:text-[#2DD4BF]",
  orange: "bg-[#FFF4E8] text-[#C2410C] dark:bg-[#F97316]/15 dark:text-[#FB923C]",
  blue: "bg-[#EFF6FF] text-[#2563EB] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]",
} as const;

export type Tone = keyof typeof TONES;

/** Filled tile for the selected item: same hue as the soft tile, so selection keeps the icon's colour. */
export const TONE_SOLID: Record<Tone, string> = {
  red: "bg-[#F03245] text-white",
  green: "bg-[#128C7E] text-white",
  violet: "bg-[#8B5CF6] text-white",
  teal: "bg-[#00A699] text-white",
  orange: "bg-[#EA580C] text-white",
  blue: "bg-[#2563EB] text-white",
};

/** Row backgrounds that follow an item's colour: resting selection and pointer hover. */
export const TONE_ROW: Record<Tone, { selected: string; hover: string }> = {
  red: { selected: "bg-[#FFF0F3] dark:bg-[#F03245]/15", hover: "hover:bg-[#FFF0F3] dark:hover:bg-[#F03245]/10" },
  green: { selected: "bg-[#E8FDF2] dark:bg-[#128C7E]/20", hover: "hover:bg-[#E8FDF2] dark:hover:bg-[#128C7E]/15" },
  violet: { selected: "bg-[#F5F3FF] dark:bg-[#8B5CF6]/15", hover: "hover:bg-[#F5F3FF] dark:hover:bg-[#8B5CF6]/10" },
  teal: { selected: "bg-[#EAFBF9] dark:bg-[#00A699]/15", hover: "hover:bg-[#EAFBF9] dark:hover:bg-[#00A699]/10" },
  orange: { selected: "bg-[#FFF4E8] dark:bg-[#F97316]/15", hover: "hover:bg-[#FFF4E8] dark:hover:bg-[#F97316]/10" },
  blue: { selected: "bg-[#EFF6FF] dark:bg-[#3B82F6]/15", hover: "hover:bg-[#EFF6FF] dark:hover:bg-[#3B82F6]/10" },
};

export const TONE_BUTTON =
  "inline-flex h-9 items-center justify-center rounded-[10px] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-125";

/** Appended to a ghost icon Button; the hover colours replace the Button's own through tailwind-merge. */
export const TONE_ACTION = {
  delete: `rounded-[10px] ${TONES.red} hover:bg-[#FFE3E9] hover:text-[#F03245] dark:hover:bg-[#F03245]/25 dark:hover:text-[#FB7185]`,
  edit: `rounded-[10px] ${TONES.violet} hover:bg-[#EDE9FE] hover:text-[#8B5CF6] dark:hover:bg-[#8B5CF6]/25 dark:hover:text-[#A78BFA]`,
  assign: `rounded-[10px] ${TONES.teal} hover:bg-[#D5F5F1] hover:text-[#00A699] dark:hover:bg-[#00A699]/25 dark:hover:text-[#2DD4BF]`,
} as const;

const TILE_SIZES = {
  sm: { tile: "h-5 w-5 rounded-md", icon: "h-3 w-3" },
  md: { tile: "h-6 w-6 rounded-lg", icon: "h-3.5 w-3.5" },
  lg: { tile: "h-8 w-8 rounded-[10px]", icon: "h-4 w-4" },
} as const;

export function ToneIcon({
  tone,
  icon: Icon,
  size = "md",
  solid = false,
}: {
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  size?: keyof typeof TILE_SIZES;
  solid?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center transition-colors ${TILE_SIZES[size].tile} ${solid ? TONE_SOLID[tone] : TONES[tone]}`}
    >
      <Icon className={`${TILE_SIZES[size].icon} [stroke-width:1.75]`} />
    </span>
  );
}
