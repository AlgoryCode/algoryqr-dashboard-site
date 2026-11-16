import type { ComponentType } from "react";
import {
  BarChart3,
  Blocks,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardList,
  IdCard,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  Package,
  QrCode,
  Sparkles,
  TrendingUp,
  User,
  UsersRound,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";

import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import type { Tone } from "@/components/dashboard/tone";
import type { DashboardNavKey } from "@/lib/dashboard-routes";

/** Sidebar, mobil menü ve komut paletinde ortak kullanılan sayfa ikonları. */
export const DASHBOARD_NAV_ICONS: Record<DashboardNavKey, ComponentType<{ className?: string }>> = {
  overview: BarChart3,
  modules: Blocks,
  digitalMenu: DigitalMenuIcon,
  myBranches: Building2,
  myMenus: DigitalMenuIcon,
  products: Package,
  uberEats: UtensilsCrossed,
  liveOrders: ClipboardList,
  reservations: CalendarDays,
  restaurantLayout: LayoutGrid,
  stock: Warehouse,
  staff: IdCard,
  reports: TrendingUp,
  smartReports: Sparkles,
  accounting: Calculator,
  feedback: MessageSquare,
  menuCustomers: UsersRound,
  campaigns: Megaphone,
  qrCodes: QrCode,
  account: User,
};

export const DASHBOARD_NAV_TONES: Record<DashboardNavKey, Tone> = {
  overview: "blue",
  modules: "violet",
  digitalMenu: "red",
  myBranches: "teal",
  myMenus: "red",
  products: "green",
  uberEats: "green",
  liveOrders: "red",
  reservations: "violet",
  restaurantLayout: "teal",
  stock: "blue",
  staff: "teal",
  reports: "blue",
  smartReports: "violet",
  accounting: "green",
  feedback: "red",
  menuCustomers: "teal",
  campaigns: "red",
  qrCodes: "violet",
  account: "blue",
};
