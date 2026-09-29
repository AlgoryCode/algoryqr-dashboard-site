"use client";

import { useId } from "react";

import type { StoreOrderStatus } from "@/lib/store-api";
import { cn } from "@/lib/utils";

export function CourierHandoverIllustration({
  status,
  className,
}: {
  status: StoreOrderStatus;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const onTheWay = status === "ON_THE_WAY" || status === "COURIER_TAKEN";
  const label = onTheWay
    ? "Sipariş yolda, motosiklet duman çıkarıyor"
    : "Kuryeye henüz teslim edilmedi, motosiklet bagajı açık";

  return (
    <div className={cn("rounded-2xl bg-muted/50 px-1 py-1", className)}>
      <svg
        viewBox="0 0 250 132"
        className="mx-auto h-[108px] w-full max-w-[280px] overflow-visible text-foreground"
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={`${uid}-body`} x1="80" y1="50" x2="200" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.68" />
          </linearGradient>
          <linearGradient id={`${uid}-box`} x1="40" y1="28" x2="104" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.78" />
          </linearGradient>
        </defs>

        <ellipse cx="132" cy="120" rx="86" ry="6" className="fill-muted-foreground/15" />

        {onTheWay ? (
          <g className="courier-speed-lines">
            <path d="M18 72h24" className="stroke-muted-foreground/45" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M12 84h20" className="stroke-muted-foreground/35" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M20 96h18" className="stroke-muted-foreground/30" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        ) : null}

        <g className={onTheWay ? "courier-bike-roll" : undefined}>
          <g fill="none" className="stroke-foreground/85" strokeWidth="3.2" strokeLinecap="round">
            <circle cx="84" cy="102" r="17" className="fill-card" />
            <circle cx="190" cy="102" r="17" className="fill-card" />
            <circle cx="84" cy="102" r="6" className="fill-foreground/75" stroke="none" />
            <circle cx="190" cy="102" r="6" className="fill-foreground/75" stroke="none" />
          </g>

          <path
            d="M100 102h54c8 0 16-6 20-13l10-16"
            fill="none"
            className="stroke-foreground/80"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <path d="M174 74l16 28" fill="none" className="stroke-foreground/80" strokeWidth="3.4" strokeLinecap="round" />
          <path
            d="M166 62c10-8 22-10 32-6 3 1 4 5 2 8-6 10-18 14-30 15-5 0-8-6-4-17Z"
            fill={`url(#${uid}-body)`}
          />
          <path d="M190 56c8-1 16 2 20 8" fill="none" className="stroke-foreground/80" strokeWidth="3" strokeLinecap="round" />
          <circle cx="212" cy="62" r="3.4" className="fill-foreground/85" />
          <path d="M210 54v-6" fill="none" className="stroke-foreground/70" strokeWidth="2" strokeLinecap="round" />

          <path
            d="M108 74c14-4 28-4 40 2 6 3 6 9 1 12h-39c-7 0-10-6-8-11 1-2 3-3 6-3Z"
            fill={`url(#${uid}-body)`}
          />
          <rect x="112" y="66" width="40" height="8" rx="4" className="fill-muted-foreground/35" />
          <path d="M100 92h36c4 0 6 3 6 6v4H98v-4c0-3 1-6 2-6Z" fill={`url(#${uid}-body)`} />

          <rect x="68" y="92" width="14" height="6" rx="2" className="fill-foreground/60" />

          {!onTheWay ? (
            <path
              d="M118 108l10 10"
              fill="none"
              className="stroke-foreground/55"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ) : null}

          <g>
            <rect
              x="42"
              y="50"
              width="56"
              height="38"
              rx="7"
              fill={`url(#${uid}-box)`}
              className="stroke-primary"
              strokeWidth="1.4"
            />
            {onTheWay ? (
              <>
                <rect x="48" y="58" width="44" height="22" rx="4" className="fill-card/20" />
                <rect x="42" y="45" width="56" height="10" rx="4" fill={`url(#${uid}-box)`} />
                <rect x="60" y="48" width="20" height="4" rx="2" className="fill-card/50" />
              </>
            ) : (
              <>
                <rect x="48" y="58" width="44" height="24" rx="4" className="fill-foreground/25" />
                <g transform="rotate(-58 42 50)">
                  <rect x="42" y="40" width="56" height="11" rx="4" fill={`url(#${uid}-box)`} />
                  <rect x="48" y="43" width="20" height="5" rx="2.5" className="fill-card/55" />
                </g>
                <rect x="58" y="66" width="18" height="13" rx="2.5" className="fill-card/90" />
                <path
                  d="M62 66v-5c0-3 2.5-5 5-5s5 2 5 5v5"
                  fill="none"
                  className="stroke-card"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </>
            )}
          </g>
        </g>

        {onTheWay ? (
          <g className="courier-exhaust" aria-hidden>
            <path
              d="M22 78c6-14 22-18 32-8 12-8 28-2 24 12-8 12-28 14-40 6-8 2-18-2-16-10Z"
              className="courier-smoke courier-smoke-a fill-muted-foreground/55"
            />
            <path
              d="M10 62c8-16 26-18 34-6 10-10 26-6 22 10-6 12-24 16-36 8-10 4-22-2-20-12Z"
              className="courier-smoke courier-smoke-b fill-muted-foreground/40"
            />
            <path
              d="M4 48c8-14 22-16 30-6 10-8 22-4 20 8-4 10-20 14-30 6-8 4-22 0-20-8Z"
              className="courier-smoke courier-smoke-c fill-muted-foreground/30"
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
