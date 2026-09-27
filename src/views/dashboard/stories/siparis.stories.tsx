import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import { dashboardPage, dashboardPageMeta } from "@/storybook/dashboard-page-story";

const qr = { qr: "34" };

const meta = {
  ...dashboardPageMeta,
  title: "Dashboard/Sipariş",
};

export default meta;

export const OnlineHub = dashboardPage("Online sipariş", DASHBOARD_ROUTES.onlineOrder);
export const OnlineKurulum = dashboardPage("Online kurulum", DASHBOARD_ROUTES.onlineOrderSetup);
export const OnlineSiparisler = dashboardPage("Online siparişler", DASHBOARD_ROUTES.onlineOrderOrders);
export const OnlineSiparisDetay = dashboardPage("Online sipariş detay", DASHBOARD_ROUTES.onlineOrderDetail(88));
export const OnlineUrunler = dashboardPage("Online ürünler", DASHBOARD_ROUTES.onlineOrderProducts);
export const OnlineKuryeler = dashboardPage("Kuryeler", DASHBOARD_ROUTES.onlineOrderCouriers);
export const OnlineAyarlar = dashboardPage("Online ayarlar", DASHBOARD_ROUTES.onlineOrderSettings);
export const Rezervasyonlar = dashboardPage("Rezervasyonlar", DASHBOARD_ROUTES.reservations, qr);
