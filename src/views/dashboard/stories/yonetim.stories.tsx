import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import { dashboardPage, dashboardPageMeta } from "@/storybook/dashboard-page-story";

const meta = {
  ...dashboardPageMeta,
  title: "Dashboard/Yönetim",
};

export default meta;

export const Kullanicilar = dashboardPage("Kullanıcılar", DASHBOARD_ROUTES.menuUsers, { branch: "1" });
export const KullaniciDetay = dashboardPage("Kullanıcı detay", "/dashboard/kullanicilar/7", { branch: "1" });
export const Musteriler = dashboardPage("Müşteriler", DASHBOARD_ROUTES.menuCustomers, { qr: "34" });
export const Kampanyalar = dashboardPage("Kampanyalar", DASHBOARD_ROUTES.campaigns, { qr: "34" });
export const KampanyaOlustur = dashboardPage("Kampanya oluştur", DASHBOARD_ROUTES.campaignsCreate, { qr: "34" });
export const KampanyaDetay = dashboardPage("Kampanya detay", "/dashboard/kampanyalar/3", { qr: "34" });
