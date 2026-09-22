"use client";

import type { PointerEvent } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  parseLayoutShape,
  tableLayoutSize,
  type LayoutShape,
} from "@/lib/restaurant-layout";
import type { RestaurantTable } from "@/lib/ordering-api";

type LayoutTableMarkerProps = {
  table: RestaurantTable;
  selected?: boolean;
  dragging?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLButtonElement>) => void;
};

export function LayoutTableMarker({
  table,
  selected = false,
  dragging = false,
  showRemove = false,
  onRemove,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: LayoutTableMarkerProps) {
  const shape = parseLayoutShape(table.layoutShape);
  const capacity = table.capacity && table.capacity > 0 ? table.capacity : 4;
  const size = tableLayoutSize(shape, capacity);
  const rotation = table.layoutRotation ?? 0;
  const x = table.layoutX ?? 50;
  const y = table.layoutY ?? 50;

  return (
    <div
      className={cn("absolute z-10", dragging || selected ? "z-20" : "")}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size.width}%`,
        height: `${size.height}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <button
        type="button"
        aria-label={`${table.name} masasını taşı`}
        aria-pressed={selected}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(event) => event.preventDefault()}
        className={cn(
          "h-full w-full touch-none select-none outline-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <span
          className={cn(
            "relative flex h-full w-full items-center justify-center",
            dragging ? "scale-105" : "",
          )}
        >
          {Array.from({ length: capacity }, (_, index) => (
            <ChairMark key={index} index={index} total={capacity} shape={shape} />
          ))}
          <span
            className={cn(
              "relative z-[1] flex h-[62%] w-[62%] items-center justify-center border-2 px-1 text-center shadow-sm",
              shape === "ROUND" ? "rounded-full" : "rounded-md",
              selected
                ? "border-primary bg-amber-100 text-foreground ring-2 ring-primary/40"
                : "border-amber-800/70 bg-amber-200/95 text-amber-950",
              dragging ? "shadow-lg" : "",
            )}
          >
            <span className="max-w-full truncate text-[10px] font-semibold leading-tight sm:text-xs">
              {table.name}
            </span>
          </span>
        </span>
      </button>
      {showRemove ? (
        <button
          type="button"
          aria-label={`${table.name} seçimden çıkar`}
          className="absolute left-1/2 top-[26%] z-30 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-background bg-destructive text-destructive-foreground shadow-sm"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove?.();
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove?.();
          }}
        >
          <X className="pointer-events-none h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function ChairMark({
  index,
  total,
  shape,
}: {
  index: number;
  total: number;
  shape: LayoutShape;
}) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radiusX = shape === "RECTANGLE" ? 48 : 46;
  const radiusY = shape === "RECTANGLE" ? 42 : 46;
  return (
    <span
      aria-hidden
      className="absolute z-0 h-[18%] w-[22%] rounded-[3px] border border-amber-900/40 bg-amber-100"
      style={{
        left: `${50 + Math.cos(angle) * radiusX}%`,
        top: `${50 + Math.sin(angle) * radiusY}%`,
        transform: `translate(-50%, -50%) rotate(${(angle * 180) / Math.PI + 90}deg)`,
      }}
    />
  );
}
