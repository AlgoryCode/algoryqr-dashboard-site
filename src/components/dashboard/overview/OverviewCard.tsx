import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ToneIcon, type Tone } from "@/components/dashboard/tone";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

/** Shared frame for overview sections: flat white card, title row with an optional "see all" link. */
export function OverviewCard({
  title,
  description,
  icon,
  tone,
  action,
  className,
  children,
  label,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  action?: { label: string; href: string };
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  return (
    <section aria-label={label ?? title} className={cn(DASHBOARD_SURFACE, "flex min-w-0 flex-col p-4 sm:p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && tone ? <ToneIcon tone={tone} icon={icon} /> : null}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="group inline-flex shrink-0 items-center gap-0.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {action.label}
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}
