import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import { dashboardPage, dashboardPageMeta } from "@/storybook/dashboard-page-story";

const JOB_ID = "11111111-1111-1111-1111-111111111111";

const meta = {
  ...dashboardPageMeta,
  title: "Dashboard/Raporlar",
};

export default meta;

export const Raporlar = dashboardPage("Raporlar", DASHBOARD_ROUTES.reportsHub);
export const Analitik = dashboardPage("Analitik", DASHBOARD_ROUTES.analytics, { qr: "34" });
export const AkilliRaporlar = dashboardPage("Akıllı raporlar", DASHBOARD_ROUTES.smartReports);
export const AkilliRaporDetay = dashboardPage("Akıllı rapor detay", DASHBOARD_ROUTES.smartReportDetail(JOB_ID));
export const GeriBildirimler = dashboardPage("Geri bildirimler", DASHBOARD_ROUTES.feedback, { qr: "34" });
export const Muhasebe = dashboardPage("Muhasebe", DASHBOARD_ROUTES.muhasebe);
export const Stok = dashboardPage("Stok", DASHBOARD_ROUTES.stock, { branch: "1" });
