export const SUGGESTED_RESTAURANT_AREAS = [
  "İç Mekan",
  "Dış Mekan",
  "Teras",
  "Bahçe",
  "VIP",
  "Bar",
] as const;

export const UNGROUPED_AREA_LABEL = "Alansız masalar";

export type LayoutArea = {
  id: number;
  menuId: number;
  name: string;
  sortOrder?: number;
};

export type LayoutTableLike = {
  id?: number;
  name?: string;
  areaId?: number | null;
  areaName?: string | null;
};

export function normalizeLayoutName(name: string): string {
  return name.trim().toLocaleLowerCase("tr");
}

export function isDuplicateAreaName(
  areas: { id?: number; name: string }[],
  name: string,
  excludeId?: number | null,
): boolean {
  const key = normalizeLayoutName(name);
  if (!key) return false;
  return areas.some(
    (area) => area.id !== excludeId && normalizeLayoutName(area.name) === key,
  );
}

export function isDuplicateTableName(
  tables: LayoutTableLike[],
  name: string,
  areaId: number | null,
  excludeId?: number | null,
): boolean {
  const key = normalizeLayoutName(name);
  if (!key) return false;
  return tables.some(
    (table) =>
      table.id !== excludeId &&
      (table.areaId ?? null) === areaId &&
      normalizeLayoutName(table.name ?? "") === key,
  );
}

export function unusedSuggestedAreas(existing: { name: string }[]): string[] {
  const names = new Set(existing.map((area) => area.name.trim().toLocaleLowerCase("tr")));
  return SUGGESTED_RESTAURANT_AREAS.filter(
    (name) => !names.has(name.toLocaleLowerCase("tr")),
  );
}

export function tablesInArea<T extends LayoutTableLike>(tables: T[], areaId: number | null): T[] {
  if (areaId == null) {
    return tables.filter((table) => table.areaId == null);
  }
  return tables.filter((table) => table.areaId === areaId);
}

export function groupWaiterTablesByArea<T extends LayoutTableLike>(
  tables: T[],
): { key: string; label: string; tables: T[] }[] {
  const groups = new Map<string, { label: string; tables: T[] }>();
  const order: string[] = [];

  for (const table of tables) {
    const label = table.areaName?.trim();
    if (!label) continue;
    const key = table.areaId != null ? `area:${table.areaId}` : `name:${label.toLocaleLowerCase("tr")}`;
    if (!groups.has(key)) {
      groups.set(key, { label, tables: [] });
      order.push(key);
    }
    groups.get(key)!.tables.push(table);
  }

  return order.map((key) => ({ key, ...groups.get(key)! }));
}

export function hasNamedAreas<T extends LayoutTableLike>(tables: T[]): boolean {
  return tables.some((table) => !!table.areaName?.trim());
}

export const LAYOUT_SHAPES = ["ROUND", "SQUARE", "RECTANGLE"] as const;
export type LayoutShape = (typeof LAYOUT_SHAPES)[number];

export const LAYOUT_GRID_STEP = 2;
export const DEFAULT_TABLE_CAPACITY = 4;
export const TABLE_CAPACITY_OPTIONS = [2, 4, 6, 8] as const;
export const DEFAULT_LAYOUT_SHAPE: LayoutShape = "RECTANGLE";

export function resolveTableCapacity(capacity?: number | null): number {
  if (capacity != null && Number.isFinite(capacity) && capacity > 0) {
    return Math.trunc(capacity);
  }
  return DEFAULT_TABLE_CAPACITY;
}

export function tableCapacitySelectOptions(capacity?: number | null): number[] {
  const current = resolveTableCapacity(capacity);
  if ((TABLE_CAPACITY_OPTIONS as readonly number[]).includes(current)) {
    return [...TABLE_CAPACITY_OPTIONS];
  }
  return [...TABLE_CAPACITY_OPTIONS, current].sort((a, b) => a - b);
}

export const TABLE_RANGE_NAME_PREFIX = "masa-";
export const MAX_TABLES_PER_RANGE = 50;

export type ParsedTableNumberRange =
  | { ok: true; numbers: number[] }
  | { ok: false; error: string };

export function tableNameForNumber(n: number): string {
  return `${TABLE_RANGE_NAME_PREFIX}${n}`;
}

export type NumberedTableLike = {
  name?: string | null;
  tableNumber?: number | null;
};

export function tableSortNumber(table: NumberedTableLike): number | null {
  if (table.tableNumber != null && Number.isFinite(table.tableNumber) && table.tableNumber >= 1) {
    return Math.trunc(table.tableNumber);
  }
  const name = table.name?.trim() ?? "";
  const match = name.match(/^masa-(\d+)$/i) ?? name.match(/(\d+)\s*$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function nextTableNumber(tables: NumberedTableLike[]): number {
  let max = 0;
  for (const table of tables) {
    const n = tableSortNumber(table);
    if (n != null && n > max) max = n;
  }
  return max + 1;
}

export function allocateTableNumber(
  tables: NumberedTableLike[],
  requested?: number | null,
): number {
  const preferred =
    requested != null && Number.isInteger(requested) && requested >= 1 ? requested : nextTableNumber(tables);
  const taken = new Set(
    tables
      .map(tableSortNumber)
      .filter((n): n is number => n != null),
  );
  let n = preferred;
  while (taken.has(n)) n += 1;
  return n;
}

export function parseTableNumberRange(fromRaw: string, toRaw: string): ParsedTableNumberRange {
  const fromTrim = fromRaw.trim();
  const toTrim = toRaw.trim();
  if (!fromTrim && !toTrim) {
    return { ok: false, error: "Masa aralığını girin. Örnek: 1–8 → masa-1 … masa-8." };
  }
  if (!fromTrim || !toTrim) {
    return { ok: false, error: "Masa aralığı için başlangıç ve bitiş numarası girin." };
  }
  const from = Number(fromTrim);
  const to = Number(toTrim);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) {
    return { ok: false, error: "Masa aralığı 1 veya daha büyük tam sayı olmalı." };
  }
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const count = end - start + 1;
  if (count > MAX_TABLES_PER_RANGE) {
    return {
      ok: false,
      error: `Tek seferde en fazla ${MAX_TABLES_PER_RANGE} masa oluşturulabilir.`,
    };
  }
  const numbers: number[] = [];
  for (let n = start; n <= end; n += 1) numbers.push(n);
  return { ok: true, numbers };
}

export type TableLayoutSize = { width: number; height: number };

export type FloorPlacement = {
  x: number;
  y: number;
  rotation: number;
  shape: LayoutShape;
};

type StoredFloorLayout = Record<string, FloorPlacement>;

const FLOOR_LAYOUT_STORAGE_PREFIX = "algory_floor_layout_";

export function parseLayoutShape(value?: string | null): LayoutShape {
  const key = value?.trim().toUpperCase();
  if (key === "ROUND" || key === "SQUARE" || key === "RECTANGLE") return key;
  return DEFAULT_LAYOUT_SHAPE;
}

export function clampLayoutPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function snapLayoutValue(value: number, snap: boolean, step = LAYOUT_GRID_STEP): number {
  const clamped = clampLayoutPercent(value);
  if (!snap) return Math.round(clamped * 10) / 10;
  const safeStep = step > 0 ? step : LAYOUT_GRID_STEP;
  return Math.round(clamped / safeStep) * safeStep;
}

export function tableLayoutSize(shape: LayoutShape, capacity?: number | null): TableLayoutSize {
  const seats = Math.max(2, Math.min(12, capacity && capacity > 0 ? capacity : DEFAULT_TABLE_CAPACITY));
  if (shape === "ROUND") {
    const diameter = seats <= 2 ? 12 : seats <= 4 ? 14 : seats <= 6 ? 16 : 18;
    return { width: diameter, height: diameter };
  }
  if (shape === "SQUARE") {
    const side = seats <= 2 ? 12 : seats <= 4 ? 14 : 16;
    return { width: side, height: side };
  }
  return {
    width: seats <= 2 ? 14 : seats <= 4 ? 18 : seats <= 6 ? 22 : 24,
    height: seats <= 4 ? 12 : 14,
  };
}

export function clampTableCenter(
  x: number,
  y: number,
  shape: LayoutShape,
  capacity?: number | null,
): { x: number; y: number } {
  const size = tableLayoutSize(shape, capacity);
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  return {
    x: Math.min(100 - halfW, Math.max(halfW, x)),
    y: Math.min(100 - halfH, Math.max(halfH, y)),
  };
}

export function translateFloorGroup<
  T extends {
    id: number;
    layoutX?: number | null;
    layoutY?: number | null;
    layoutShape?: string | null;
    capacity?: number | null;
  },
>(tables: T[], dx: number, dy: number, snap: boolean): { id: number; x: number; y: number }[] {
  if (tables.length === 0) return [];
  const snappedDx = snapLayoutValue(50 + dx, snap) - 50;
  const snappedDy = snapLayoutValue(50 + dy, snap) - 50;
  let minDx = Number.NEGATIVE_INFINITY;
  let maxDx = Number.POSITIVE_INFINITY;
  let minDy = Number.NEGATIVE_INFINITY;
  let maxDy = Number.POSITIVE_INFINITY;

  for (const table of tables) {
    const size = tableLayoutSize(parseLayoutShape(table.layoutShape), table.capacity);
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const startX = table.layoutX ?? 50;
    const startY = table.layoutY ?? 50;
    minDx = Math.max(minDx, halfW - startX);
    maxDx = Math.min(maxDx, 100 - halfW - startX);
    minDy = Math.max(minDy, halfH - startY);
    maxDy = Math.min(maxDy, 100 - halfH - startY);
  }

  const dxFinal = Math.min(maxDx, Math.max(minDx, snappedDx));
  const dyFinal = Math.min(maxDy, Math.max(minDy, snappedDy));
  return tables.map((table) => ({
    id: table.id,
    x: (table.layoutX ?? 50) + dxFinal,
    y: (table.layoutY ?? 50) + dyFinal,
  }));
}

export function rotateLayout(rotation?: number | null, delta = 90): number {
  const current = Number.isFinite(rotation) ? Number(rotation) : 0;
  const next = (current + delta) % 360;
  return next < 0 ? next + 360 : next;
}

export function isPlacedOnFloor(table: {
  layoutX?: number | null;
  layoutY?: number | null;
}): boolean {
  return table.layoutX != null && table.layoutY != null;
}

export type FloorBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function normalizeFloorBox(x1: number, y1: number, x2: number, y2: number): FloorBox {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  };
}

export function tableFloorBox(table: {
  layoutX?: number | null;
  layoutY?: number | null;
  layoutShape?: string | null;
  capacity?: number | null;
}): FloorBox | null {
  if (!isPlacedOnFloor(table)) return null;
  const size = tableLayoutSize(parseLayoutShape(table.layoutShape), table.capacity);
  const x = table.layoutX ?? 50;
  const y = table.layoutY ?? 50;
  return {
    left: x - size.width / 2,
    top: y - size.height / 2,
    right: x + size.width / 2,
    bottom: y + size.height / 2,
  };
}

export function floorBoxesIntersect(a: FloorBox, b: FloorBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function tablesIntersectingMarquee<
  T extends {
    layoutX?: number | null;
    layoutY?: number | null;
    layoutShape?: string | null;
    capacity?: number | null;
  },
>(tables: T[], x1: number, y1: number, x2: number, y2: number): T[] {
  const marquee = normalizeFloorBox(x1, y1, x2, y2);
  return tables.filter((table) => {
    const box = tableFloorBox(table);
    return box != null && floorBoxesIntersect(marquee, box);
  });
}

export function nextFreeLayoutPosition(
  occupied: {
    layoutX?: number | null;
    layoutY?: number | null;
    layoutShape?: string | null;
    capacity?: number | null;
  }[],
  shape: LayoutShape = DEFAULT_LAYOUT_SHAPE,
  capacity: number = DEFAULT_TABLE_CAPACITY,
): { x: number; y: number } {
  const size = tableLayoutSize(shape, capacity);
  const gapX = Math.max(16, size.width + 4);
  const gapY = Math.max(16, size.height + 4);
  const startX = size.width / 2 + 4;
  const startY = size.height / 2 + 4;

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const candidate = clampTableCenter(startX + col * gapX, startY + row * gapY, shape, capacity);
      const blocked = occupied.some((table) => {
        if (!isPlacedOnFloor(table)) return false;
        const otherShape = parseLayoutShape(table.layoutShape);
        const other = tableLayoutSize(otherShape, table.capacity);
        return (
          Math.abs((table.layoutX ?? 0) - candidate.x) < (size.width + other.width) / 2 - 1 &&
          Math.abs((table.layoutY ?? 0) - candidate.y) < (size.height + other.height) / 2 - 1
        );
      });
      if (!blocked) return candidate;
    }
  }

  return clampTableCenter(50, 50, shape, capacity);
}

export function floorLayoutStorageKey(menuId: number): string {
  return `${FLOOR_LAYOUT_STORAGE_PREFIX}${menuId}`;
}

export function loadStoredFloorLayout(menuId: number): Record<number, FloorPlacement> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(floorLayoutStorageKey(menuId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredFloorLayout;
    const next: Record<number, FloorPlacement> = {};
    for (const [id, value] of Object.entries(parsed ?? {})) {
      const tableId = Number(id);
      if (!Number.isFinite(tableId) || value == null) continue;
      next[tableId] = {
        x: clampLayoutPercent(value.x),
        y: clampLayoutPercent(value.y),
        rotation: rotateLayout(value.rotation, 0),
        shape: parseLayoutShape(value.shape),
      };
    }
    return next;
  } catch {
    return {};
  }
}

export function saveStoredFloorLayout(menuId: number, layout: Record<number, FloorPlacement>): void {
  if (typeof window === "undefined") return;
  const payload: StoredFloorLayout = {};
  for (const [id, value] of Object.entries(layout)) {
    payload[id] = value;
  }
  window.localStorage.setItem(floorLayoutStorageKey(menuId), JSON.stringify(payload));
}

export function upsertStoredFloorPlacement(
  menuId: number,
  tableId: number,
  placement: FloorPlacement,
): Record<number, FloorPlacement> {
  const current = loadStoredFloorLayout(menuId);
  const next = { ...current, [tableId]: placement };
  saveStoredFloorLayout(menuId, next);
  return next;
}

export function mergeTableFloorLayout<
  T extends {
    id: number;
    capacity?: number | null;
    layoutX?: number | null;
    layoutY?: number | null;
    layoutRotation?: number | null;
    layoutShape?: string | null;
  },
>(table: T, stored?: FloorPlacement | null): T {
  if (isPlacedOnFloor(table)) {
    return {
      ...table,
      layoutRotation: table.layoutRotation ?? stored?.rotation ?? 0,
      layoutShape: table.layoutShape ?? stored?.shape ?? DEFAULT_LAYOUT_SHAPE,
    };
  }
  if (!stored) return table;
  return {
    ...table,
    layoutX: stored.x,
    layoutY: stored.y,
    layoutRotation: stored.rotation,
    layoutShape: stored.shape,
  };
}
