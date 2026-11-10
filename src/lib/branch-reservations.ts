import { getMenuReservationsRequest, type MenuReservationApiItem } from "@/lib/api";

const RANGE_PAGE_SIZE = 100;
/** Safety cap: 20 pages × 100 per menu is far beyond a real time window. */
const RANGE_MAX_PAGES = 20;

/**
 * Every reservation of the given menus within the days, all statuses. The page filters, counts and pages
 * them itself, so the tiles and filters stay instant and work across several branches at once.
 */
export async function listMenuReservationsInRange(
  menuIds: number[],
  range: { from?: string; to?: string },
): Promise<MenuReservationApiItem[]> {
  const perMenu = await Promise.all(
    menuIds.map(async (menuId) => {
      const items: MenuReservationApiItem[] = [];
      for (let page = 0; page < RANGE_MAX_PAGES; page += 1) {
        const result = await getMenuReservationsRequest(menuId, {
          status: "all",
          ...range,
          page,
          size: RANGE_PAGE_SIZE,
        });
        items.push(...result.content.map((item) => ({ ...item, menuId: item.menuId ?? menuId })));
        if (!result.hasNext) break;
      }
      return items;
    }),
  );
  return perMenu.flat();
}
