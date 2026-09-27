import { describe, expect, it } from "vitest";
import { mapDirectoryItemToDashboardQrItem } from "@/components/dashboard/menu/DigitalMenuPicker";
import type { DigitalMenuDirectoryItem } from "@/lib/digital-menu-directory";

describe("DigitalMenuPicker mapping", () => {
  it("maps directory item to DashboardQrItem", () => {
    const item: DigitalMenuDirectoryItem = {
      menuId: 12,
      qrId: 34,
      businessName: "Test İşletme",
      branchId: 7,
      branchName: "Merkez",
      active: true,
    };
    const mapped = mapDirectoryItemToDashboardQrItem(item);
    expect(mapped.id).toBe(34);
    expect(mapped.menuId).toBe(12);
    expect(mapped.name).toBe("Test İşletme");
    expect(mapped.type).toBe("menu");
    expect(mapped.active).toBe(true);
    expect(mapped.details).toMatchObject({ type: "menu", businessName: "Test İşletme", menuId: 12, branchId: 7 });
  });
});

