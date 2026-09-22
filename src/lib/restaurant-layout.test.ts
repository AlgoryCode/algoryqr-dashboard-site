import { describe, expect, it } from "vitest";

import {
  clampTableCenter,
  groupWaiterTablesByArea,
  hasNamedAreas,
  isDuplicateAreaName,
  isDuplicateTableName,
  isPlacedOnFloor,
  mergeTableFloorLayout,
  nextFreeLayoutPosition,
  parseLayoutShape,
  parseTableNumberRange,
  resolveTableCapacity,
  rotateLayout,
  snapLayoutValue,
  tableCapacitySelectOptions,
  tableNameForNumber,
  tablesIntersectingMarquee,
  translateFloorGroup,
  nextTableNumber,
  allocateTableNumber,
  tablesInArea,
  unusedSuggestedAreas,
} from "./restaurant-layout";

describe("restaurant-layout", () => {
  it("hides suggested areas that already exist", () => {
    expect(unusedSuggestedAreas([{ name: "teras" }, { name: "VIP" }])).toEqual([
      "İç Mekan",
      "Dış Mekan",
      "Bahçe",
      "Bar",
    ]);
  });

  it("groups tables under an area id", () => {
    const tables = [
      { id: 1, areaId: 4 },
      { id: 2, areaId: null },
      { id: 3, areaId: 4 },
    ];
    expect(tablesInArea(tables, 4).map((table) => table.id)).toEqual([1, 3]);
    expect(tablesInArea(tables, null).map((table) => table.id)).toEqual([2]);
  });

  it("groups waiter tables by area name", () => {
    const groups = groupWaiterTablesByArea([
      { areaId: 1, areaName: "Teras", tableName: "1" },
      { areaId: 1, areaName: "Teras", tableName: "2" },
      { areaId: null, areaName: null, tableName: "Bar" },
    ]);
    expect(groups.map((group) => group.label)).toEqual(["Teras"]);
    expect(groups[0].tables).toHaveLength(2);
    expect(groups.flatMap((group) => group.tables).map((table) => table.tableName)).toEqual(["1", "2"]);
    expect(hasNamedAreas(groups.flatMap((group) => group.tables))).toBe(true);
  });

  it("rejects duplicate area names ignoring case", () => {
    const areas = [{ id: 1, name: "Teras" }];
    expect(isDuplicateAreaName(areas, " teras ")).toBe(true);
    expect(isDuplicateAreaName(areas, "Teras", 1)).toBe(false);
    expect(isDuplicateAreaName(areas, "Bahçe")).toBe(false);
  });

  it("rejects duplicate table names in the same area", () => {
    const tables = [
      { id: 1, name: "Masa 1", areaId: 4 },
      { id: 2, name: "Masa 1", areaId: 5 },
    ];
    expect(isDuplicateTableName(tables, "masa 1", 4)).toBe(true);
    expect(isDuplicateTableName(tables, "Masa 1", 4, 1)).toBe(false);
    expect(isDuplicateTableName(tables, "Masa 2", 4)).toBe(false);
  });

  it("snaps coordinates to the floor grid", () => {
    expect(snapLayoutValue(13.4, true, 2)).toBe(14);
    expect(snapLayoutValue(13.4, false)).toBe(13.4);
  });

  it("keeps table centers inside the floor", () => {
    expect(clampTableCenter(0, 0, "SQUARE", 4)).toEqual({ x: 7, y: 7 });
    expect(clampTableCenter(100, 100, "ROUND", 2)).toEqual({ x: 94, y: 94 });
  });

  it("resolves capacity options for the editor", () => {
    expect(resolveTableCapacity(null)).toBe(4);
    expect(resolveTableCapacity(6)).toBe(6);
    expect(tableCapacitySelectOptions(4)).toEqual([2, 4, 6, 8]);
    expect(tableCapacitySelectOptions(10)).toEqual([2, 4, 6, 8, 10]);
  });

  it("places the next table in an empty cell", () => {
    const first = nextFreeLayoutPosition([]);
    const second = nextFreeLayoutPosition([
      { layoutX: first.x, layoutY: first.y, layoutShape: "RECTANGLE", capacity: 4 },
    ]);
    expect(first.x).not.toBe(second.x);
    expect(isPlacedOnFloor({ layoutX: first.x, layoutY: first.y })).toBe(true);
  });

  it("rotates tables in 90 degree steps", () => {
    expect(rotateLayout(270)).toBe(0);
    expect(rotateLayout(0, -90)).toBe(270);
  });

  it("prefers server coordinates over locally stored ones", () => {
    const merged = mergeTableFloorLayout(
      { id: 1, layoutX: 40, layoutY: 20, layoutShape: null, layoutRotation: null },
      { x: 10, y: 10, rotation: 90, shape: "ROUND" },
    );
    expect(merged.layoutX).toBe(40);
    expect(merged.layoutY).toBe(20);
    expect(merged.layoutShape).toBe("ROUND");
    expect(parseLayoutShape("round")).toBe("ROUND");
  });

  it("builds masa-(number) names from a range", () => {
    const range = parseTableNumberRange("1", "3");
    expect(range).toEqual({ ok: true, numbers: [1, 2, 3] });
    expect(tableNameForNumber(3)).toBe("masa-3");
  });

  it("accepts reversed ranges and rejects empty or oversized ones", () => {
    expect(parseTableNumberRange("8", "6")).toEqual({ ok: true, numbers: [6, 7, 8] });
    expect(parseTableNumberRange("", "")).toMatchObject({ ok: false });
    expect(parseTableNumberRange("1", "80")).toMatchObject({ ok: false });
  });

  it("picks the number after the highest table in the area", () => {
    expect(
      nextTableNumber([
        { name: "masa-1", tableNumber: 1 },
        { name: "masa-8", tableNumber: 8 },
        { name: "masa-2", tableNumber: 2 },
      ]),
    ).toBe(9);
    expect(nextTableNumber([])).toBe(1);
    expect(allocateTableNumber([{ name: "masa-3", tableNumber: 3 }], 3)).toBe(4);
  });

  it("selects tables whose floor boxes intersect a marquee", () => {
    const tables = [
      { id: 1, layoutX: 20, layoutY: 20, layoutShape: "SQUARE", capacity: 4 },
      { id: 2, layoutX: 80, layoutY: 80, layoutShape: "SQUARE", capacity: 4 },
      { id: 3, layoutX: 50, layoutY: 50, layoutShape: "RECTANGLE", capacity: 4 },
    ];
    expect(tablesIntersectingMarquee(tables, 10, 10, 30, 30).map((table) => table.id)).toEqual([1]);
    expect(
      tablesIntersectingMarquee(tables, 10, 10, 90, 90)
        .map((table) => table.id)
        .sort((a, b) => a - b),
    ).toEqual([1, 2, 3]);
  });

  it("moves a table group together and keeps every table on the floor", () => {
    const tables = [
      { id: 1, layoutX: 20, layoutY: 20, layoutShape: "SQUARE", capacity: 4 },
      { id: 2, layoutX: 80, layoutY: 80, layoutShape: "SQUARE", capacity: 4 },
    ];
    const moved = translateFloorGroup(tables, 40, 0, false);
    expect(moved[0]).toEqual({ id: 1, x: 33, y: 20 });
    expect(moved[1]).toEqual({ id: 2, x: 93, y: 80 });
    const left = translateFloorGroup(tables, -40, 0, false);
    expect(left[0]).toEqual({ id: 1, x: 7, y: 20 });
    expect(left[1]).toEqual({ id: 2, x: 67, y: 80 });
  });
});


describe("restaurant-layout", () => {
  it("hides suggested areas that already exist", () => {
    expect(unusedSuggestedAreas([{ name: "teras" }, { name: "VIP" }])).toEqual([
      "İç Mekan",
      "Dış Mekan",
      "Bahçe",
      "Bar",
    ]);
  });

  it("groups tables under an area id", () => {
    const tables = [
      { id: 1, areaId: 4 },
      { id: 2, areaId: null },
      { id: 3, areaId: 4 },
    ];
    expect(tablesInArea(tables, 4).map((table) => table.id)).toEqual([1, 3]);
    expect(tablesInArea(tables, null).map((table) => table.id)).toEqual([2]);
  });

  it("groups waiter tables by area name", () => {
    const groups = groupWaiterTablesByArea([
      { areaId: 1, areaName: "Teras", tableName: "1" },
      { areaId: 1, areaName: "Teras", tableName: "2" },
      { areaId: null, areaName: null, tableName: "Bar" },
    ]);
    expect(groups.map((group) => group.label)).toEqual(["Teras"]);
    expect(groups[0].tables).toHaveLength(2);
    expect(groups.flatMap((group) => group.tables).map((table) => table.tableName)).toEqual(["1", "2"]);
    expect(hasNamedAreas(groups.flatMap((group) => group.tables))).toBe(true);
  });

  it("rejects duplicate area names ignoring case", () => {
    const areas = [{ id: 1, name: "Teras" }];
    expect(isDuplicateAreaName(areas, " teras ")).toBe(true);
    expect(isDuplicateAreaName(areas, "Teras", 1)).toBe(false);
    expect(isDuplicateAreaName(areas, "Bahçe")).toBe(false);
  });

  it("rejects duplicate table names in the same area", () => {
    const tables = [
      { id: 1, name: "Masa 1", areaId: 4 },
      { id: 2, name: "Masa 1", areaId: 5 },
    ];
    expect(isDuplicateTableName(tables, "masa 1", 4)).toBe(true);
    expect(isDuplicateTableName(tables, "Masa 1", 4, 1)).toBe(false);
    expect(isDuplicateTableName(tables, "Masa 2", 4)).toBe(false);
  });
});
