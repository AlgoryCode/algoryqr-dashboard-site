import {
  Coffee,
  Cookie,
  CupSoda,
  GlassWater,
  IceCream,
  type LucideIcon,
  UtensilsCrossed,
} from "lucide-react";

const ICON_RULES: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /waffle|bubble|dondurma|gelato|ice.?cream/, icon: IceCream },
  { pattern: /cup|kova|bardak/, icon: CupSoda },
  { pattern: /sicak|kahve|coffee|latte|cay|espresso|cappuccino/, icon: Coffee },
  { pattern: /soguk|icecek|soda|kola|limonata|tea/, icon: GlassWater },
  { pattern: /tatli|dessert|cookie|pasta/, icon: Cookie },
];

function foldIconKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

export function menuCategoryIcon(slugOrName: string | null | undefined): LucideIcon {
  const haystack = foldIconKey(slugOrName ?? "");
  if (!haystack) return UtensilsCrossed;
  const match = ICON_RULES.find((rule) => rule.pattern.test(haystack));
  return match?.icon ?? UtensilsCrossed;
}
