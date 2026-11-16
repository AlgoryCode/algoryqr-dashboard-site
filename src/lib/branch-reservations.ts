import { getBranchReservationsRequest, type MenuReservationApiItem } from "@/lib/api";

const RANGE_PAGE_SIZE = 100;
/** Safety cap: 20 pages × 100 per branch is far beyond a real time window. */
const RANGE_MAX_PAGES = 20;

/**
 * Every reservation of the given branches within the days, all statuses. The page filters, counts and pages
 * them itself, so the tiles and filters stay instant and work across several branches at once.
 */
export async function listBranchReservationsInRange(
  branchIds: number[],
  range: { from?: string; to?: string },
): Promise<MenuReservationApiItem[]> {
  const perBranch = await Promise.all(
    branchIds.map(async (branchId) => {
      const items: MenuReservationApiItem[] = [];
      for (let page = 0; page < RANGE_MAX_PAGES; page += 1) {
        const result = await getBranchReservationsRequest(branchId, {
          status: "all",
          ...range,
          page,
          size: RANGE_PAGE_SIZE,
        });
        items.push(...result.content.map((item) => ({ ...item, branchId: item.branchId ?? branchId })));
        if (!result.hasNext) break;
      }
      return items;
    }),
  );
  return perBranch.flat();
}
