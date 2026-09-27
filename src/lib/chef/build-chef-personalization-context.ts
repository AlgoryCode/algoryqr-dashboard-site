export type ChefMenuLocale = "tr" | "en" | "ru" | "ar";

export type ChefMealPeriod = "breakfast" | "lunch" | "dinner" | "late";

export type ChefPersonalizationContext = {
  mealPeriod: ChefMealPeriod;
  locale: ChefMenuLocale;
  priorOrderProductIds: number[];
};

function inferMealPeriod(hour: number): ChefMealPeriod {
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 23) return "dinner";
  return "late";
}

const MEAL_LABELS: Record<ChefMealPeriod, string> = {
  breakfast: "kahvaltı / sabah",
  lunch: "öğle",
  dinner: "akşam",
  late: "geç saat",
};

export function buildChefPersonalizationContext(
  locale: ChefMenuLocale,
  priorOrderProductIds: number[] = [],
  now = new Date(),
): ChefPersonalizationContext {
  return {
    mealPeriod: inferMealPeriod(now.getHours()),
    locale,
    priorOrderProductIds: priorOrderProductIds.slice(0, 20),
  };
}

export function chefPersonalizationPrefix(ctx: ChefPersonalizationContext): string {
  const parts = [`Günün saati: ${MEAL_LABELS[ctx.mealPeriod]}.`, `Menü dili: ${ctx.locale}.`];
  if (ctx.priorOrderProductIds.length > 0) {
    parts.push(
      `Misafir daha önce sipariş verdiği ürün id'leri (tekrar önerebilirsin): ${ctx.priorOrderProductIds.join(", ")}.`,
    );
  }
  return `[Kişiselleştirme: ${parts.join(" ")}]`;
}
