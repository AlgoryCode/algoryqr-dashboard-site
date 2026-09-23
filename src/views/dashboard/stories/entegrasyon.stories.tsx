import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import { dashboardPage, dashboardPageMeta } from "@/storybook/dashboard-page-story";

const meta = {
  ...dashboardPageMeta,
  title: "Dashboard/Entegrasyonlar",
};

export default meta;

export const Entegrasyonlar = dashboardPage("Entegrasyonlar", DASHBOARD_ROUTES.integrations);
export const YemekSepeti = dashboardPage("Yemeksepeti", DASHBOARD_ROUTES.yemekSepeti);
export const YemekSepetiSiparisler = dashboardPage("Yemeksepeti siparişler", DASHBOARD_ROUTES.yemekSepetiOrders);
export const Yazici = dashboardPage("Yazıcı", DASHBOARD_ROUTES.printer);
export const UberEats = dashboardPage("Uber Eats", DASHBOARD_ROUTES.uberEats);
export const UberEatsUrunler = dashboardPage("Uber Eats ürünler", DASHBOARD_ROUTES.uberEatsProducts);
export const UberEatsSiparisler = dashboardPage("Uber Eats siparişler", DASHBOARD_ROUTES.uberEatsOrders);
export const UberEatsOnay = dashboardPage("Uber Eats onay bekleyen", DASHBOARD_ROUTES.uberEatsPending);
export const UberEatsSenkron = dashboardPage("Uber Eats menü senkron", DASHBOARD_ROUTES.uberEatsMenuSync);
