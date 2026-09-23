import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import { dashboardPage, dashboardPageMeta } from "@/storybook/dashboard-page-story";

const meta = {
  ...dashboardPageMeta,
  title: "Dashboard/Hesap",
};

export default meta;

export const Hesabim = dashboardPage("Hesabım", DASHBOARD_ROUTES.account);
export const Guvenlik = dashboardPage("Güvenlik", DASHBOARD_ROUTES.accountSecurity);
export const Oturumlar = dashboardPage("Oturumlar", DASHBOARD_ROUTES.accountSessions);
export const OturumDetay = dashboardPage("Oturum detay", DASHBOARD_ROUTES.accountSessionsDetail);
export const Abonelik = dashboardPage("Abonelik", DASHBOARD_ROUTES.accountSubscription);
export const Paketler = dashboardPage("Paketler", DASHBOARD_ROUTES.accountPackages);
export const PaketDegistir = dashboardPage(
  "Paket değiştir",
  "/dashboard/hesabim/abonelik/paket-degistir",
  { to: "2" },
);
export const PaketSatinAl = dashboardPage("Paket satın al", DASHBOARD_ROUTES.accountSubscriptionCheckout(2));
export const Sepet = dashboardPage("Sepet", DASHBOARD_ROUTES.accountCartCheckout);
export const SatinAlmaDetay = dashboardPage("Satın alma detay", DASHBOARD_ROUTES.accountPurchaseDetail(1));
export const MenuSatinAl = dashboardPage("Menü paketi satın al", DASHBOARD_ROUTES.digitalMenuCheckout(2));
export const EkUrunSatinAl = dashboardPage("Ek ürün satın al", DASHBOARD_ROUTES.catalogProductCheckout("QR_MENU"));
export const EkSubeSatinAl = dashboardPage("Ek şube satın al", DASHBOARD_ROUTES.catalogProductCheckout("QR_BRANCH"));
export const OdemeGecmisi = dashboardPage("Ödeme geçmişi", DASHBOARD_ROUTES.accountPaymentHistory);
export const OdemeDetay = dashboardPage("Ödeme detay", DASHBOARD_ROUTES.accountPaymentHistoryDetail(1));
export const KayitliKartlar = dashboardPage("Kayıtlı kartlar", DASHBOARD_ROUTES.accountPaymentMethods);
export const FaturaAdresleri = dashboardPage("Fatura adresleri", DASHBOARD_ROUTES.accountBillingAddresses);
