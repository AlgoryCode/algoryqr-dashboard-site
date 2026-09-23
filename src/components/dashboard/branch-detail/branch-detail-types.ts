import type { ActivityRow, ProductRow, RecentOrder } from "@/components/dashboard/branch-detail/branch-detail-cards";

export type BranchOverview = {
  photoUrl: string | null;
  active: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
  kitchenOn: boolean;
  sales: string;
  orders: string;
  basket: string;
  visits: string;
  salesDelta: number | null;
  daily: { label: string; revenue: number }[];
  categories: { name: string; value: number }[];
  products: ProductRow[];
  recentOrders: RecentOrder[];
  activities: ActivityRow[];
  weekRevenue: string;
  weekOrders: string;
  score: string;
};
