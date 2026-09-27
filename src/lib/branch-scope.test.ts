import { describe, expect, it } from "vitest";

import { ordersForStaffBranch, parseBranchScope, stampMenuOrder } from "@/lib/branch-scope";
import { filterManagedOrders } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

function order(partial: Partial<OrderResponse> & Pick<OrderResponse, "id" | "status">): OrderResponse {
  return { ...partial };
}

describe("branch scope", () => {
  it("parses a branch id and treats everything else as the full flow", () => {
    expect(parseBranchScope(null)).toBe("all");
    expect(parseBranchScope("all")).toBe("all");
    expect(parseBranchScope("12")).toBe(12);
    expect(parseBranchScope("0")).toBe("all");
    expect(parseBranchScope("kadikoy")).toBe("all");
  });

  it("stamps menu orders with the branch they were loaded from", () => {
    expect(stampMenuOrder(order({ id: 1, status: "CONFIRMED" }), { menuId: 8, branchId: 3 })).toMatchObject({
      menuId: 8,
      branchId: 3,
    });
  });

  it("keeps the manager's full flow and narrows a selected branch", () => {
    const orders = [
      order({ id: 1, status: "CONFIRMED", branchId: 3 }),
      order({ id: 2, status: "CONFIRMED", branchId: 9 }),
      order({ id: 3, status: "CONFIRMED", orderSource: "STORE" }),
    ];
    expect(filterManagedOrders(orders, { branchId: "all" }).map((item) => item.id)).toEqual([1, 2, 3]);
    expect(filterManagedOrders(orders, { branchId: 3 }).map((item) => item.id)).toEqual([1]);
  });

  it("drops staff orders that belong to another branch", () => {
    const orders = [
      order({ id: 1, status: "CONFIRMED" }),
      order({ id: 2, status: "CONFIRMED", branchId: 4 }),
      order({ id: 3, status: "CONFIRMED", branchId: 7 }),
    ];
    expect(ordersForStaffBranch(orders, 4).map((item) => item.id)).toEqual([1, 2]);
  });
});
