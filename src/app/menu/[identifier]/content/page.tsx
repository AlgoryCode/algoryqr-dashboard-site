import { notFound } from "next/navigation";

import { MenuTemplateRenderer } from "@/components/menu-templates/MenuTemplateRenderer";
import MenuUnavailableView from "@/components/menu-templates/MenuUnavailableView";
import { fetchPublicMenu } from "@/lib/public-menu-fetch";
import { isTarikWafflePreview, PETEK_WAFFLE_THEME_ID, tarikWaffleMenu } from "@/lib/petek-waffle-preview";

export const dynamic = "force-dynamic";

export default async function PublicMenuContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ identifier: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { identifier } = await params;
  const query = await searchParams;
  const raw = query.t;
  const tableToken =
    typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? raw[0]?.trim() : undefined;
  const result = await fetchPublicMenu(identifier, { tableToken: tableToken || undefined });

  if (result.status === "package_inactive") {
    return <MenuUnavailableView />;
  }
  if (result.status !== "ok") {
    notFound();
  }

  const wafflePreview = isTarikWafflePreview(result.data.menu);
  const menu = wafflePreview ? tarikWaffleMenu(result.data.menu) : result.data.menu;
  const themeId = wafflePreview ? PETEK_WAFFLE_THEME_ID : result.data.themeId;

  return (
    <MenuTemplateRenderer
      menu={menu}
      products={result.data.products}
      categories={result.data.categories ?? []}
      themeId={themeId}
      identifier={result.publicId}
      productPage={result.data.productPage ?? 0}
      productSize={result.data.productSize ?? 20}
      productTotalElements={result.data.productTotalElements ?? result.data.products.length}
      productHasNext={result.data.productHasNext ?? false}
      categoryPage={result.data.categoryPage ?? 0}
      categorySize={result.data.categorySize ?? 50}
      categoryTotalElements={result.data.categoryTotalElements}
      categoryHasNext={result.data.categoryHasNext ?? false}
    />
  );
}
