"use client";

import type { ButtonHTMLAttributes } from "react";
import { MessageCircleQuestion } from "lucide-react";

import { cn } from "@/lib/utils";

function MiniSparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <path d="M5 0.5 5.8 3.2 8.5 4l-2.7 0.8L5 7.5 4.2 4.8 1.5 4l2.7-0.8L5 0.5z" />
    </svg>
  );
}

function QuestionWithSparkles({ compact }: { compact: boolean }) {
  const iconClass = compact ? "size-5" : "size-[1.25rem] max-[420px]:size-5";
  const frameClass = compact
    ? "h-6 w-[1.65rem]"
    : "h-6 w-6 max-[420px]:h-6 max-[420px]:w-[1.65rem]";

  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", frameClass)}>
      <MessageCircleQuestion className={cn("relative z-[1]", iconClass)} strokeWidth={2.25} aria-hidden />
      <MiniSparkle
        className={cn(
          "pointer-events-none absolute -right-1 -top-0.5 z-0 text-white motion-reduce:animate-none animate-pulse",
          compact ? "size-2" : "size-2 max-[420px]:size-2",
        )}
      />
      <MiniSparkle
        className={cn(
          "pointer-events-none absolute -left-1 top-0 z-0 text-white/90 motion-reduce:animate-none animate-pulse [animation-delay:350ms]",
          compact ? "size-1.5" : "size-1.5 max-[420px]:size-1.5",
        )}
      />
      <MiniSparkle
        className={cn(
          "pointer-events-none absolute -bottom-0.5 -right-0.5 z-0 text-white/85 motion-reduce:animate-none animate-pulse [animation-delay:700ms]",
          compact ? "size-1.5" : "size-1.5 max-[420px]:size-1.5",
        )}
      />
      <MiniSparkle
        className={cn(
          "pointer-events-none absolute -bottom-0.5 -left-0.5 z-0 text-white/80 motion-reduce:animate-none animate-pulse [animation-delay:150ms]",
          compact ? "size-1" : "size-1 max-[420px]:size-1",
        )}
      />
    </span>
  );
}

export type AskAssistantButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Mobilde veya dar alanda yalnızca soru ikonu */
  iconOnly?: boolean;
};

export function AskAssistantButton({
  className,
  children,
  iconOnly = false,
  ...props
}: AskAssistantButtonProps) {
  const label = children ?? "Asistana Sor";

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 shrink-0 items-center justify-center gap-2 overflow-visible whitespace-nowrap rounded-2xl px-5",
        "bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-[length:300%_300%]",
        "animate-gradient motion-reduce:animate-none",
        "text-sm font-semibold text-white shadow-lg shadow-violet-300/40 ring-1 ring-white/15",
        iconOnly
          ? "h-9 min-w-[3rem] gap-0 px-2.5"
          : "max-[420px]:h-9 max-[420px]:min-w-[3rem] max-[420px]:gap-0 max-[420px]:px-2.5 max-[420px]:w-auto",
        className,
      )}
      {...props}
    >
      <QuestionWithSparkles compact={iconOnly} />
      {!iconOnly ? <span className="hidden min-[421px]:inline">{label}</span> : null}
    </button>
  );
}
