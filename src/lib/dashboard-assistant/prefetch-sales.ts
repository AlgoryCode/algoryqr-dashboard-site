import { getBranchRevenueReportRequest } from "@/lib/api";
import {
  buildSalesPeriodSnapshot,
  periodRangesForAssistant,
  type AssistantSalesCachePayload,
} from "@/lib/dashboard-assistant/sales-snapshot";
import { writeAssistantSalesCache } from "@/lib/dashboard-assistant/sales-cache";

export type PrefetchAssistantSalesInput = {
  branchId: number;
  menuId: number | null;
  branchName?: string | null;
  menuName?: string | null;
};

export async function prefetchAssistantSalesReports(
  input: PrefetchAssistantSalesInput,
): Promise<AssistantSalesCachePayload> {
  const ranges = periodRangesForAssistant();
  const periods = await Promise.all(
    ranges.map(async ({ period, current, previous }) => {
      const [currentReport, previousReport] = await Promise.all([
        getBranchRevenueReportRequest(input.branchId, current.from, current.to, input.menuId),
        getBranchRevenueReportRequest(input.branchId, previous.from, previous.to, input.menuId).catch(
          () => null,
        ),
      ]);
      return buildSalesPeriodSnapshot(period, currentReport, previousReport);
    }),
  );

  const payload: AssistantSalesCachePayload = {
    version: 1,
    branchId: input.branchId,
    menuId: input.menuId,
    branchName: input.branchName ?? null,
    menuName: input.menuName ?? null,
    fetchedAt: new Date().toISOString(),
    periods,
  };

  writeAssistantSalesCache(payload);
  return payload;
}
