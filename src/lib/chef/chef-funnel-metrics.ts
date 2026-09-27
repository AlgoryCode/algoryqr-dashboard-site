import type { MenuAnalyticsReportResponse } from "@/lib/api";

export type ChefFunnelMetrics = {
  chatOpens: number;
  recommendationShown: number;
  productAdds: number;
  crossSellShown: number;
  crossSellAdds: number;
  ordersSubmitted: number;
  recommendationToAddRate: number | null;
  chatToOrderRate: number | null;
  feedbackLikes: number;
  feedbackDislikes: number;
};

function stepCount(journeys: MenuAnalyticsReportResponse["sampleJourneys"], type: string): number {
  let total = 0;
  for (const journey of journeys ?? []) {
    for (const step of journey.steps ?? []) {
      if (step.type === type) total += 1;
    }
  }
  return total;
}

export function computeChefFunnelMetrics(
  visits: MenuAnalyticsReportResponse,
): ChefFunnelMetrics {
  const journeys = visits.sampleJourneys ?? [];
  const chatOpens = stepCount(journeys, "CHEF_CHAT_OPEN");
  const recommendationShown = stepCount(journeys, "CHEF_RECOMMENDATION_SHOWN");
  const productAdds = stepCount(journeys, "CHEF_PRODUCT_ADD");
  const crossSellShown = stepCount(journeys, "CHEF_CROSS_SELL_SHOWN");
  const crossSellAdds = stepCount(journeys, "CHEF_CROSS_SELL_ADD");
  const ordersSubmitted = stepCount(journeys, "ORDER_SUBMITTED");

  let feedbackLikes = 0;
  let feedbackDislikes = 0;
  for (const journey of journeys) {
    for (const step of journey.steps ?? []) {
      if (step.type !== "CHEF_RECOMMENDATION_FEEDBACK") continue;
      const name = step.name?.toLowerCase() ?? "";
      if (name.includes("like")) feedbackLikes += 1;
      if (name.includes("dislike")) feedbackDislikes += 1;
    }
  }

  return {
    chatOpens,
    recommendationShown,
    productAdds,
    crossSellShown,
    crossSellAdds,
    ordersSubmitted,
    recommendationToAddRate:
      recommendationShown > 0 ? productAdds / recommendationShown : null,
    chatToOrderRate: chatOpens > 0 ? ordersSubmitted / chatOpens : null,
    feedbackLikes,
    feedbackDislikes,
  };
}
