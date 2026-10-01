/** Stamp and reward are written when the order is delivered, then reversed on cancel or reject. */
export const CAMPAIGN_QUALIFICATION_MOMENT = "ORDER_DELIVERED" as const;

/** Additive cart/order campaign fields from qr-service PR #90. */
export type StampCardProgress = {
  campaignId: number;
  campaignName: string;
  currentQuantity: number;
  requiredQuantity: number;
  earned: boolean;
};

export type OrderCampaignSummary = {
  campaignProductCount?: number;
  guestOrder?: boolean;
  rewardEligible?: boolean;
  hint?: string | null;
  stampCardProgress?: StampCardProgress[];
};

export function getStampCardProgress(
  summary: OrderCampaignSummary | null | undefined,
): StampCardProgress[] {
  return summary?.stampCardProgress ?? [];
}
