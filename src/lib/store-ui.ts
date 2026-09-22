import { KITCHEN_FLOW_STEP_LABEL } from "@/lib/kitchen-queue";
import type {
  StoreCourierVehicleType,
  StoreDeliveryType,
  StoreOrderAction,
  StoreOrderStatus,
  StorePaymentMethod,
  StoreWeekday,
  StoreWorkingHour,
} from "@/lib/store-api";

export type { StorePaymentMethod };

export const STORE_ORDER_STATUS_LABEL: Record<StoreOrderStatus, string> = {
  PENDING: "Onay bekliyor",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  ON_THE_WAY: "Yolda",
  DELIVERED: "Teslim edildi",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
};

export const STORE_ORDER_STATUS_CLASS: Record<StoreOrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  CONFIRMED: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  PREPARING: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  READY: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  ON_THE_WAY: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

export const STORE_DELIVERY_TYPE_LABEL: Record<StoreDeliveryType, string> = {
  DELIVERY: "Adrese teslim",
  PICKUP: "Gel-al",
};

export const STORE_PAYMENT_METHOD_LABEL: Record<StorePaymentMethod, string> = {
  CASH_ON_DELIVERY: "Kapıda nakit",
  CARD_ON_DELIVERY: "Kapıda kart",
};

export const STORE_VEHICLE_TYPE_LABEL: Record<StoreCourierVehicleType, string> = {
  MOTORCYCLE: "Motosiklet",
  BICYCLE: "Bisiklet",
  CAR: "Araba",
  ON_FOOT: "Yaya",
};

export const STORE_WEEKDAYS: StoreWeekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const STORE_WEEKDAY_LABEL: Record<StoreWeekday, string> = {
  MONDAY: "Pazartesi",
  TUESDAY: "Salı",
  WEDNESDAY: "Çarşamba",
  THURSDAY: "Perşembe",
  FRIDAY: "Cuma",
  SATURDAY: "Cumartesi",
  SUNDAY: "Pazar",
};

type StoreOrderTransition = {
  action: StoreOrderAction;
  label: string;
  tone: "primary" | "secondary" | "danger";
};

const TRANSITIONS_BY_STATUS: Record<StoreOrderStatus, StoreOrderTransition[]> = {
  PENDING: [
    { action: "confirm", label: "Onayla", tone: "primary" },
    { action: "reject", label: "Reddet", tone: "danger" },
  ],
  CONFIRMED: [
    { action: "preparing", label: "Siparişi mutfağa gönder", tone: "primary" },
    { action: "cancel", label: "İptal et", tone: "danger" },
  ],
  PREPARING: [
    { action: "ready", label: "Hazır", tone: "primary" },
    { action: "cancel", label: "İptal et", tone: "danger" },
  ],
  READY: [
    { action: "dispatch", label: "Kurye teslimi", tone: "primary" },
    { action: "deliver", label: "Teslim edildi", tone: "primary" },
    { action: "cancel", label: "İptal et", tone: "danger" },
  ],
  ON_THE_WAY: [{ action: "deliver", label: "Teslim edildi", tone: "primary" }],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Pickup never dispatches a courier.
 * Delivery must go through courier handover before "teslim edildi".
 */
export function availableStoreOrderTransitions(
  status: StoreOrderStatus,
  deliveryType: StoreDeliveryType,
): StoreOrderTransition[] {
  const transitions = TRANSITIONS_BY_STATUS[status] ?? [];
  return transitions.filter((transition) => {
    if (deliveryType === "PICKUP" && transition.action === "dispatch") return false;
    if (deliveryType === "DELIVERY" && status === "READY" && transition.action === "deliver") {
      return false;
    }
    return true;
  });
}

export type StoreKitchenFlowStep = {
  status: StoreOrderStatus;
  label: string;
};

/** Kitchen-aligned merchant flow shown on the online order detail screen. */
export function storeKitchenFlowSteps(deliveryType: StoreDeliveryType): StoreKitchenFlowStep[] {
  const steps: StoreKitchenFlowStep[] = [
    { status: "CONFIRMED", label: KITCHEN_FLOW_STEP_LABEL.CONFIRMED },
    { status: "PREPARING", label: KITCHEN_FLOW_STEP_LABEL.PREPARING },
    { status: "READY", label: KITCHEN_FLOW_STEP_LABEL.READY },
  ];
  if (deliveryType === "DELIVERY") {
    steps.push({ status: "ON_THE_WAY", label: KITCHEN_FLOW_STEP_LABEL.COURIER });
  }
  steps.push({ status: "DELIVERED", label: KITCHEN_FLOW_STEP_LABEL.DELIVERED });
  return steps;
}

export function storeKitchenFlowIndex(
  status: StoreOrderStatus,
  deliveryType: StoreDeliveryType,
): number {
  if (status === "PENDING" || status === "REJECTED" || status === "CANCELLED") return -1;
  const steps = storeKitchenFlowSteps(deliveryType);
  if (deliveryType === "PICKUP" && status === "ON_THE_WAY") {
    return steps.findIndex((step) => step.status === "READY");
  }
  return steps.findIndex((step) => step.status === status);
}

export function formatStoreElapsed(from?: string | null, now = Date.now()): string | null {
  if (!from) return null;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return null;
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export function formatStoreAmount(amount: number | null | undefined, currency = "TRY"): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
}

export function formatStoreDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function formatStoreClock(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function defaultWorkingHours(): StoreWorkingHour[] {
  return STORE_WEEKDAYS.map((day) => ({
    day,
    opensAt: "10:00",
    closesAt: "23:59",
    closed: false,
  }));
}

export function formatStoreAddress(address: {
  addressText?: string | null;
  buildingNo?: string | null;
  floorNo?: string | null;
  doorNo?: string | null;
  district?: string | null;
  city?: string | null;
}): string {
  const parts = [
    address.addressText,
    address.buildingNo ? `No: ${address.buildingNo}` : null,
    address.floorNo ? `Kat: ${address.floorNo}` : null,
    address.doorNo ? `Daire: ${address.doorNo}` : null,
    address.district,
    address.city,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length ? parts.join(", ") : "-";
}

/** `<input type="time">` rejects `HH:mm:ss` from Jackson LocalTime unless step includes seconds. */
export function toStoreTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{2}:\d{2})/.exec(value.trim());
  return match?.[1] ?? value;
}
