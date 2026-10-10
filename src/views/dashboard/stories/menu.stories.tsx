import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

import { dashboardPage, dashboardPageMeta } from "@/storybook/dashboard-page-story";

const qr = { qr: "34" };

const meta = {
  ...dashboardPageMeta,
  title: "Dashboard/Menü",
};

export default meta;

export const DijitalMenu = dashboardPage("Menü ve şubeler", DASHBOARD_ROUTES.digitalMenu);
export const Subelerim = dashboardPage("Şubelerim", DASHBOARD_ROUTES.myBranches);
export const Menuler = dashboardPage("Menüler", DASHBOARD_ROUTES.digitalMenuMenus);
export const MenuOlustur = dashboardPage("Menü oluştur", DASHBOARD_ROUTES.digitalMenuCreate, { branch: "1" });
export const MenuDuzenle = dashboardPage("Menü düzenle", DASHBOARD_ROUTES.digitalMenuEdit(34));
export const MenuAyarlari = dashboardPage("Menü ayarları", DASHBOARD_ROUTES.digitalMenuSettings(34));
export const Kategoriler = dashboardPage("Kategoriler", DASHBOARD_ROUTES.digitalMenuCategories, qr);
export const Urunler = dashboardPage("Ürünler", DASHBOARD_ROUTES.digitalMenuProducts, qr);
export const UrunOlustur = dashboardPage("Ürün oluştur", DASHBOARD_ROUTES.digitalMenuProductCreate, qr);
export const UrunDetay = dashboardPage("Ürün detay", "/dashboard/dijital-menu/urunler/101", { qr: "34" });
export const AiImport = dashboardPage("AI menü aktar", DASHBOARD_ROUTES.digitalMenuAiImport, qr);
export const SubeOlustur = dashboardPage("Şube oluştur", DASHBOARD_ROUTES.branchCreate);
export const SubeDetay = dashboardPage("Şube detay", DASHBOARD_ROUTES.branchDetail(1));
export const SubeAyarlari = dashboardPage("Şube ayarları", DASHBOARD_ROUTES.branchSettings(1));
export const RestoranDuzeni = dashboardPage(
  "Restoran düzeni",
  "/dashboard/subedetay/1/ayarlar/restoran-duzeni",
  { qr: "34" },
);
export const QrKodlar = dashboardPage("QR kodları", DASHBOARD_ROUTES.qrCodes);
export const QrOlustur = dashboardPage("QR oluştur", DASHBOARD_ROUTES.qrCodesNew);
export const QrDetay = dashboardPage("QR detay", DASHBOARD_ROUTES.qrCodeDetail(34));
