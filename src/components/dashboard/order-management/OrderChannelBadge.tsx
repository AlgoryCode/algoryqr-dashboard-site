import { cn } from "@/lib/utils";
import {
  ORDER_CHANNEL_LABEL,
  type OrderChannel,
} from "@/lib/order-management";

const TONE: Record<OrderChannel, string> = {
  QR: "bg-teal-500/15 text-teal-800 dark:text-teal-300",
  WAITER: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
  ONLINE: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  PHONE: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  UBER_EATS: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  YEMEKSEPETI: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
};

export function OrderChannelBadge({
  channel,
  className,
}: {
  channel: OrderChannel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        TONE[channel],
        className,
      )}
    >
      {ORDER_CHANNEL_LABEL[channel]}
    </span>
  );
}
