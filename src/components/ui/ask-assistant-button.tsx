"use client";

import type { ButtonHTMLAttributes } from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type AskAssistantButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconOnly?: boolean;
  appearance?: "default" | "bar";
};

export function AskAssistantButton({
  className,
  children,
  iconOnly = false,
  appearance = "default",
  ...props
}: AskAssistantButtonProps) {
  const label = children ?? "Asistana Sor";

  if (appearance === "bar") {
    return (
      <button
        type="button"
        className={cn(
          "flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 self-stretch px-1 py-1.5 text-primary",
          "transition-colors hover:bg-primary/10 active:bg-primary/15",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_hsl(var(--primary)/0.55)]">
          <Sparkles className="size-4" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="text-[11px] font-semibold leading-none">Asistan</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "group relative inline-flex h-12 shrink-0 items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap rounded-xl px-4",
        "border border-border bg-card text-sm font-medium text-foreground",
        "transition-[border-color,background-color,box-shadow] duration-200",
        "hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_6px_18px_-12px_hsl(var(--primary)/0.6)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        iconOnly
          ? "h-9 min-w-[3rem] gap-0 px-2.5"
          : "max-[420px]:h-9 max-[420px]:min-w-[3rem] max-[420px]:gap-0 max-[420px]:px-2.5 max-[420px]:w-auto",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-[left,opacity] duration-700 group-hover:left-full group-hover:opacity-100 motion-reduce:hidden"
      />
      <span className="relative flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Sparkles
          className="size-3.5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 motion-reduce:transition-none"
          strokeWidth={2.25}
          aria-hidden
        />
      </span>
      {!iconOnly ? (
        <span className={cn("relative", children != null ? undefined : "hidden min-[421px]:inline")}>{label}</span>
      ) : null}
    </button>
  );
}
