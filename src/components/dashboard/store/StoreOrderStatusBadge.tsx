import type { StoreOrderStatus } from "@/lib/store-api";
import { STORE_ORDER_STATUS_CLASS, STORE_ORDER_STATUS_LABEL } from "@/lib/store-ui";
import { cn } from "@/lib/utils";

export function StoreOrderStatusBadge({
  status,
  className,
}: {
  status: StoreOrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        STORE_ORDER_STATUS_CLASS[status],
        className,
      )}
    >
      {STORE_ORDER_STATUS_LABEL[status]}
    </span>
  );
}
