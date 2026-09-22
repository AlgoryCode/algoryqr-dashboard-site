import { cn } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/order-management";
import type { OrderStatus } from "@/lib/ordering-api";

const TONE: Record<string, string> = {
  CANCELLED: "bg-destructive/10 text-destructive",
  REJECTED: "bg-destructive/10 text-destructive",
  PREPARING: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  READY: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  SERVED: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  ON_THE_WAY: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  CONFIRMED: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  SUBMITTED: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  PENDING: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        TONE[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
