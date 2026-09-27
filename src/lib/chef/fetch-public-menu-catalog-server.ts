import { type AgentCatalogProduct, mapMenuProductToAgentCatalog } from "./agent-catalog-product";
import { fetchPublicMenuProducts } from "./fetch-public-menu-products-server";

export async function fetchPublicMenuCatalogForChef(publicId: string): Promise<AgentCatalogProduct[]> {
  const products = await fetchPublicMenuProducts(publicId);
  return products.map(mapMenuProductToAgentCatalog);
}
