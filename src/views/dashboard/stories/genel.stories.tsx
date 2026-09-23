import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import { dashboardPage, dashboardPageMeta } from "@/storybook/dashboard-page-story";

const meta = {
  ...dashboardPageMeta,
  title: "Dashboard/Genel",
};

export default meta;

export const GenelBakis = dashboardPage("Genel Bakış", DASHBOARD_ROUTES.overview);
export const Kurulum = dashboardPage("Kurulum", DASHBOARD_ROUTES.overview, {}, "setup");
export const Moduller = dashboardPage("Modüller", DASHBOARD_ROUTES.modules);
export const Karsilama = dashboardPage("Karşılama", DASHBOARD_ROUTES.welcomeOnboarding);
export const DenemeBaslat = dashboardPage("Deneme başlat", DASHBOARD_ROUTES.trialStart);
export const DenemeBitti = dashboardPage("Deneme bitti", DASHBOARD_ROUTES.trialExpired);
