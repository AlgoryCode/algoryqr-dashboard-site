"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" />
      <path
        d="M19 14l0.8 2.2L22 17l-2.2 0.8L19 20l-0.8-2.2L16 17l2.2-0.8L19 14z"
        opacity="0.7"
      />
    </svg>
  );
}

export type AskAssistantButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function AskAssistantButton({ className, children, ...props }: AskAssistantButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-5",
        "bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-[length:300%_300%]",
        "animate-gradient motion-reduce:animate-none",
        "text-sm font-semibold text-white shadow-lg shadow-violet-300/40",
        "max-[420px]:px-3.5",
        className,
      )}
      {...props}
    >
      <SparkleIcon className="size-4 shrink-0" />
      <span className="max-[420px]:hidden">{children ?? "Asistana Sor"}</span>
    </button>
  );
}
