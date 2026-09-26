import {
  getMenuReservationsRequest,
  type MenuReservationPageApiResponse,
  type MenuReservationStatus,
} from "@/lib/api";
import type { BranchItem } from "@/lib/branch";

const EMPTY_PAGE: MenuReservationPageApiResponse = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
};

export type BranchReservationsQuery = {
  status?: MenuReservationStatus | "all";
  page?: number;
  size?: number;
};

function sortByReservationAtDesc(
  a: { reservationAt: string },
  b: { reservationAt: string },
): number {
  return new Date(b.reservationAt).getTime() - new Date(a.reservationAt).getTime();
}

/**
 * Şube rezervasyonları: şubedeki her menü için `/menu/{menuId}/reservations` çağrılır ve sonuçlar birleştirilir.
 * (Upstream henüz `GET /branches/:id/reservations` sunmuyor.)
 */
export async function listBranchReservations(
  branch: BranchItem,
  params: BranchReservationsQuery = {},
): Promise<MenuReservationPageApiResponse> {
  const menus = branch.menus ?? [];
  if (menus.length === 0) return { ...EMPTY_PAGE, size: params.size ?? 20 };

  const size = params.size ?? 20;
  const status = params.status ?? "all";
  const fetchSize = 100;

  const pages = await Promise.all(
    menus.map((menu) =>
      getMenuReservationsRequest(menu.menuId, {
        status,
        page: 0,
        size: fetchSize,
      }),
    ),
  );

  const merged = pages.flatMap((page) => page.content).sort(sortByReservationAtDesc);

  const page = params.page ?? 0;
  const start = page * size;
  const content = merged.slice(start, start + size);
  const totalElements = merged.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    hasNext: start + size < totalElements,
  };
}
