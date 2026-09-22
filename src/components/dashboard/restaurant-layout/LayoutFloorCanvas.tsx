"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Magnet, Maximize2, Minimize2, RotateCw } from "lucide-react";

import { LayoutTableMarker } from "@/components/dashboard/restaurant-layout/LayoutTableMarker";
import { LayoutTableToolbar } from "@/components/dashboard/restaurant-layout/LayoutTableToolbar";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import type { RestaurantTable } from "@/lib/ordering-api";
import {
  clampTableCenter,
  isPlacedOnFloor,
  parseLayoutShape,
  snapLayoutValue,
  tablesIntersectingMarquee,
  translateFloorGroup,
} from "@/lib/restaurant-layout";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 420;
const MARQUEE_THRESHOLD = 1.2;

type DragState = {
  tableId: number;
  pointerId: number;
  pointerX: number;
  pointerY: number;
  moved: boolean;
  group: { table: RestaurantTable; startX: number; startY: number }[];
};

type MarqueeState = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type FloorGesture = {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
};

type LayoutFloorCanvasProps = {
  tables: RestaurantTable[];
  selectedIds: number[];
  snap: boolean;
  canPlace: boolean;
  isEditing: boolean;
  editName: string;
  editTableNumber: string;
  updatePending: boolean;
  onSnapChange: (snap: boolean) => void;
  onSelect: (table: RestaurantTable) => void;
  onSelectMany: (tables: RestaurantTable[]) => void;
  onClearSelection: () => void;
  onMove: (moves: { table: RestaurantTable; x: number; y: number }[]) => void;
  onRotate: (table: RestaurantTable) => void;
  onPlaceAt: (x: number, y: number) => void;
  onPlaceUnplaced: (table: RestaurantTable) => void;
  onEdit: (table: RestaurantTable) => void;
  onDelete: (tables: RestaurantTable[]) => void;
  onToggleActive: (tables: RestaurantTable[]) => void;
  onCapacityChange: (table: RestaurantTable, capacity: number) => void;
  onEditNameChange: (value: string) => void;
  onEditTableNumberChange: (value: string) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
};

export function LayoutFloorCanvas({
  tables,
  selectedIds,
  snap,
  canPlace,
  isEditing,
  editName,
  editTableNumber,
  updatePending,
  onSnapChange,
  onSelect,
  onSelectMany,
  onClearSelection,
  onMove,
  onRotate,
  onPlaceAt,
  onPlaceUnplaced,
  onEdit,
  onDelete,
  onToggleActive,
  onCapacityChange,
  onEditNameChange,
  onEditTableNumberChange,
  onSaveEditing,
  onCancelEditing,
}: LayoutFloorCanvasProps) {
  const floorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const floorGestureRef = useRef<FloorGesture | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const bulkSelectRef = useRef(false);
  const selectedIdsRef = useRef(selectedIds);
  const ignoreTableUpRef = useRef<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [livePositions, setLivePositions] = useState<Record<number, { x: number; y: number }>>({});
  const [bulkSelect, setBulkSelect] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  selectedIdsRef.current = selectedIds;
  bulkSelectRef.current = bulkSelect || selectedIds.length > 1;

  const placed = useMemo(() => tables.filter(isPlacedOnFloor), [tables]);
  const unplaced = useMemo(() => tables.filter((table) => !isPlacedOnFloor(table)), [tables]);
  const tablesById = useMemo(() => new Map(placed.map((table) => [table.id, table])), [placed]);
  const selectedId = selectedIds.length === 1 ? selectedIds[0]! : null;
  const selectedTables = selectedIds
    .map((id) => tables.find((table) => table.id === id) ?? tablesById.get(id) ?? null)
    .filter((table): table is RestaurantTable => table != null);
  const placedSelected = selectedTables.filter(isPlacedOnFloor);
  const inBulk = bulkSelect || selectedIds.length > 1;

  const visibleTables = useMemo(
    () =>
      placed.map((table) =>
        livePositions[table.id]
          ? { ...table, layoutX: livePositions[table.id]!.x, layoutY: livePositions[table.id]!.y }
          : table,
      ),
    [livePositions, placed],
  );

  const marqueeHits = useMemo(() => {
    if (!marquee) return [] as RestaurantTable[];
    return tablesIntersectingMarquee(
      visibleTables,
      marquee.startX,
      marquee.startY,
      marquee.currentX,
      marquee.currentY,
    );
  }, [marquee, visibleTables]);

  const highlightedIds = useMemo(() => {
    if (marquee) return new Set(marqueeHits.map((table) => table.id));
    return new Set(selectedIds);
  }, [marquee, marqueeHits, selectedIds]);

  useEffect(
    () => () => {
      if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const setBulk = (value: boolean) => {
    bulkSelectRef.current = value;
    setBulkSelect(value);
  };

  useEffect(() => {
    if (selectedIds.length === 0) setBulk(false);
  }, [selectedIds.length]);

  const tableById = (id: number) => tables.find((item) => item.id === id) ?? tablesById.get(id) ?? null;

  const addToBulk = (table: RestaurantTable) => {
    const ids = selectedIdsRef.current;
    if (ids.includes(table.id)) return;
    const next = ids
      .map((id) => tableById(id))
      .filter((item): item is RestaurantTable => item != null);
    next.push(table);
    onSelectMany(next);
  };

  const removeFromBulk = (table: RestaurantTable) => {
    ignoreTableUpRef.current = table.id;
    const next = selectedIdsRef.current
      .filter((id) => id !== table.id)
      .map((id) => tableById(id))
      .filter((item): item is RestaurantTable => item != null);
    onSelectMany(next);
    if (next.length === 0) setBulk(false);
  };

  const enterBulkSelect = (table: RestaurantTable) => {
    setBulk(true);
    if (!selectedIdsRef.current.includes(table.id)) {
      onSelectMany([table]);
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  };

  const pointerPercent = (clientX: number, clientY: number) => {
    const rect = floorRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 50, y: 50 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const applySnap = (x: number, y: number, table: RestaurantTable) => {
    const shape = parseLayoutShape(table.layoutShape);
    return clampTableCenter(
      snapLayoutValue(x, snap),
      snapLayoutValue(y, snap),
      shape,
      table.capacity,
    );
  };

  const groupFromAnchor = (table: RestaurantTable) => {
    const ids = selectedIds.includes(table.id) && inBulk ? selectedIds : [table.id];
    return ids
      .map((id) => tablesById.get(id))
      .filter((item): item is RestaurantTable => item != null && isPlacedOnFloor(item))
      .map((item) => ({
        table: item,
        startX: item.layoutX ?? 50,
        startY: item.layoutY ?? 50,
      }));
  };

  const positionsForDrag = (event: PointerEvent, current: DragState) => {
    const point = pointerPercent(event.clientX, event.clientY);
    return translateFloorGroup(
      current.group.map((item) => ({
        ...item.table,
        layoutX: item.startX,
        layoutY: item.startY,
      })),
      point.x - current.pointerX,
      point.y - current.pointerY,
      snap,
    );
  };

  const liveMapFromMoves = (moves: { id: number; x: number; y: number }[]) =>
    Object.fromEntries(moves.map((move) => [move.id, { x: move.x, y: move.y }]));

  const startTableDrag = (table: RestaurantTable, pointerId: number, point: { x: number; y: number }) => {
    const group = groupFromAnchor(table);
    const nextDrag: DragState = {
      tableId: table.id,
      pointerId,
      pointerX: point.x,
      pointerY: point.y,
      moved: false,
      group:
        group.length > 0
          ? group
          : [{ table, startX: table.layoutX ?? point.x, startY: table.layoutY ?? point.y }],
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  };

  const applyDragMove = (event: PointerEvent) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return false;
    const moves = positionsForDrag(event, current);
    const moved =
      current.moved ||
      moves.some((move) => {
        const start = current.group.find((item) => item.table.id === move.id);
        return (
          Math.abs(move.x - (start?.startX ?? move.x)) > 0.4 ||
          Math.abs(move.y - (start?.startY ?? move.y)) > 0.4
        );
      });
    if (moved) clearLongPress();
    if (moved !== current.moved) {
      const nextDrag = { ...current, moved };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    }
    setLivePositions(liveMapFromMoves(moves));
    return true;
  };

  const finishDrag = (event: PointerEvent) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return false;
    if (current.moved) {
      const moves = positionsForDrag(event, current);
      onMove(
        moves.map((move) => ({
          table: current.group.find((item) => item.table.id === move.id)?.table ?? current.group[0]!.table,
          x: move.x,
          y: move.y,
        })),
      );
    }
    dragRef.current = null;
    setDrag(null);
    setLivePositions({});
    return true;
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const beginMarquee = (pointerId: number, x: number, y: number, target?: HTMLElement) => {
    clearLongPress();
    dragRef.current = null;
    setDrag(null);
    setLivePositions({});
    const next = { pointerId, startX: x, startY: y, currentX: x, currentY: y };
    marqueeRef.current = next;
    setMarquee(next);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
    target?.setPointerCapture(pointerId);
  };

  const updateMarquee = (event: PointerEvent) => {
    const current = marqueeRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const point = pointerPercent(event.clientX, event.clientY);
    const next = { ...current, currentX: point.x, currentY: point.y };
    marqueeRef.current = next;
    setMarquee(next);
  };

  const finishMarquee = (event: PointerEvent) => {
    const current = marqueeRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const hits = tablesIntersectingMarquee(
      placed,
      current.startX,
      current.startY,
      current.currentX,
      current.currentY,
    );
    marqueeRef.current = null;
    floorGestureRef.current = null;
    setMarquee(null);
    setBulk(hits.length >= 2);
    onSelectMany(hits);
  };

  const handleTablePointerDown = (table: RestaurantTable, event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const point = pointerPercent(event.clientX, event.clientY);
    startTableDrag(table, event.pointerId, point);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* untrusted or already-released pointer */
    }
    if (event.pointerType !== "touch") event.preventDefault();
    if (bulkSelectRef.current) return;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      enterBulkSelect(table);
    }, LONG_PRESS_MS);
  };

  const handleTablePointerMove = (_table: RestaurantTable, event: PointerEvent<HTMLButtonElement>) => {
    if (marqueeRef.current?.pointerId === event.pointerId) {
      event.preventDefault();
      updateMarquee(event);
      return;
    }
    if (applyDragMove(event)) event.preventDefault();
  };

  const handleTablePointerUp = (table: RestaurantTable, event: PointerEvent<HTMLButtonElement>) => {
    clearLongPress();
    if (ignoreTableUpRef.current === table.id) {
      ignoreTableUpRef.current = null;
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragRef.current = null;
      setDrag(null);
      event.stopPropagation();
      return;
    }
    if (marqueeRef.current?.pointerId === event.pointerId) {
      finishMarquee(event);
      return;
    }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const current = dragRef.current;
    const wasMoved = current?.pointerId === event.pointerId ? current.moved : false;
    if (finishDrag(event)) {
      if (wasMoved) {
        if (!bulkSelectRef.current) onSelect(table);
      } else if (bulkSelectRef.current) {
        addToBulk(table);
      } else {
        onSelect(table);
      }
      event.stopPropagation();
    }
  };

  const handleFloorPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const point = pointerPercent(event.clientX, event.clientY);
    floorGestureRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: point.x,
      startY: point.y,
    };
    if (event.pointerType === "touch") {
      clearLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        const gesture = floorGestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        beginMarquee(event.pointerId, gesture.startX, gesture.startY, event.currentTarget);
      }, LONG_PRESS_MS);
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFloorPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (marqueeRef.current?.pointerId === event.pointerId) {
      event.preventDefault();
      updateMarquee(event);
      return;
    }
    if (applyDragMove(event)) {
      event.preventDefault();
      return;
    }
    const gesture = floorGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const point = pointerPercent(event.clientX, event.clientY);
    const distance = Math.hypot(point.x - gesture.startX, point.y - gesture.startY);
    if (distance < MARQUEE_THRESHOLD) return;
    if (gesture.pointerType === "touch") {
      clearLongPress();
      floorGestureRef.current = null;
      return;
    }
    beginMarquee(event.pointerId, gesture.startX, gesture.startY, event.currentTarget);
    updateMarquee(event);
  };

  const handleFloorPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    clearLongPress();
    if (marqueeRef.current?.pointerId === event.pointerId) {
      finishMarquee(event);
      return;
    }
    if (finishDrag(event)) return;
    const gesture = floorGestureRef.current;
    floorGestureRef.current = null;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (selectedIds.length > 0) {
      setBulk(false);
      onClearSelection();
      return;
    }
    if (!canPlace) return;
    const snapped = applySnap(gesture.startX, gesture.startY, {
      layoutShape: "RECTANGLE",
      capacity: 4,
    } as RestaurantTable);
    onPlaceAt(snapped.x, snapped.y);
  };

  const toolbarTables = placedSelected;
  const showToolbar = toolbarTables.length > 0 && drag == null && marquee == null;

  const canvas = (
    <div
      className={cn(
        "space-y-2",
        expanded &&
          "fixed inset-0 z-[45] flex flex-col overscroll-none bg-background p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4",
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-xs text-muted-foreground">
          {inBulk
            ? "Masalara dokunarak seçime ekleyin. Çarpı ile çıkarın."
            : "Boş alana sürükleyerek masaları seçin. Seçili masaları birlikte taşıyın. Masaya basılı tutup diğerlerine dokunun."}
        </p>
        <div className="flex items-center gap-1">
          <Toggle
            pressed={snap}
            onPressedChange={onSnapChange}
            size="sm"
            variant="outline"
            aria-label="Izgaraya yasla"
            className="h-8 gap-1 px-2 text-xs"
          >
            <Magnet className="h-3.5 w-3.5" />
            Izgara
          </Toggle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={placedSelected.length === 0}
            onClick={() => {
              placedSelected.forEach((table) => onRotate(table));
            }}
          >
            <RotateCw className="mr-1 h-3.5 w-3.5" />
            Döndür
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={expanded ? "Krokiden çık" : "Krokiyi tam ekran aç"}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {unplaced.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 p-2">
          <span className="text-xs text-muted-foreground">Konumsuz:</span>
          {unplaced.map((table) => (
            <Button
              key={table.id}
              type="button"
              variant={highlightedIds.has(table.id) ? "default" : "outline"}
              size="sm"
              className="h-7"
              onClick={() => {
                onSelect(table);
                onPlaceUnplaced(table);
              }}
            >
              {table.name} yerleştir
            </Button>
          ))}
        </div>
      ) : null}

      <div
        ref={floorRef}
        role="application"
        aria-label="Restoran krokisi"
        aria-multiselectable="true"
        className={cn(
          "relative overflow-visible rounded-lg border border-border",
          "bg-[hsl(38_32%_90%)] dark:bg-[hsl(32_12%_16%)]",
          expanded ? "min-h-0 flex-1" : "aspect-[16/10] min-h-[280px]",
          marquee ? "touch-none cursor-crosshair" : "touch-pan-y",
          canPlace && selectedIds.length === 0 && !marquee ? "cursor-crosshair" : "cursor-default",
        )}
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(32 20% 78% / 0.55) 1px, transparent 1px), linear-gradient(to bottom, hsl(32 20% 78% / 0.55) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onPointerDown={handleFloorPointerDown}
        onPointerMove={handleFloorPointerMove}
        onPointerUp={handleFloorPointerUp}
        onPointerCancel={handleFloorPointerUp}
        onContextMenu={(event) => event.preventDefault()}
      >
        {visibleTables.length === 0 ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Bu alanda henüz krokiye yerleştirilmiş masa yok. Masa ekleyin veya konumsuz masaları
            yerleştirin.
          </p>
        ) : null}

        {visibleTables.map((table) => (
          <LayoutTableMarker
            key={table.id}
            table={table}
            selected={highlightedIds.has(table.id)}
            dragging={Boolean(livePositions[table.id]) || drag?.tableId === table.id}
            showRemove={
              inBulk &&
              selectedIds.includes(table.id) &&
              !marquee &&
              livePositions[table.id] == null
            }
            onRemove={() => removeFromBulk(table)}
            onPointerDown={(event) => handleTablePointerDown(table, event)}
            onPointerMove={(event) => handleTablePointerMove(table, event)}
            onPointerUp={(event) => handleTablePointerUp(table, event)}
            onPointerCancel={(event) => handleTablePointerUp(table, event)}
          />
        ))}
        {marquee ? (
          <div
            aria-hidden
            className="pointer-events-none absolute z-40 rounded-sm border border-primary bg-primary/20"
            style={{
              left: `${Math.min(marquee.startX, marquee.currentX)}%`,
              top: `${Math.min(marquee.startY, marquee.currentY)}%`,
              width: `${Math.abs(marquee.currentX - marquee.startX)}%`,
              height: `${Math.abs(marquee.currentY - marquee.startY)}%`,
            }}
          />
        ) : null}
        {showToolbar ? (
          <LayoutTableToolbar
            tables={toolbarTables}
            isEditing={isEditing && selectedId === toolbarTables[0]?.id}
            editName={editName}
            editTableNumber={editTableNumber}
            updatePending={updatePending}
            onEdit={() => {
              const table = toolbarTables[0];
              if (table) onEdit(table);
            }}
            onDelete={() => onDelete(toolbarTables)}
            onToggleActive={() => onToggleActive(toolbarTables)}
            onCapacityChange={onCapacityChange}
            onEditNameChange={onEditNameChange}
            onEditTableNumberChange={onEditTableNumberChange}
            onSaveEditing={onSaveEditing}
            onCancelEditing={onCancelEditing}
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {expanded ? (
        <div
          className="aspect-[16/10] min-h-[280px] rounded-lg border border-dashed border-border bg-muted/20"
          aria-hidden
        />
      ) : null}
      {expanded && portalReady ? createPortal(canvas, document.body) : canvas}
    </>
  );
}
