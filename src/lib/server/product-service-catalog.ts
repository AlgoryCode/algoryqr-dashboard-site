import axios from "axios";

import type {
  CatalogProductApiItem,
  PlanPackageApiItem,
  PlanPackageItemApi,
  PlanPackageModuleApi,
} from "@/lib/api";
import {
  PRODUCT_SERVICE_AUTH_HEADER,
  PRODUCT_SERVICE_AUTH_TOKEN,
  PRODUCT_SERVICE_BASE_URL,
} from "@/lib/config";

type SpringPage<T> = {
  content?: T[];
};

type ProductServiceProduct = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  scopeCode?: string | null;
  typeId?: "PACKAGE_PRODUCT" | "ADDON_PRODUCT" | null;
  featureCode?: string | null;
  unitPrice: number | string;
  vatRate: number | string;
  consumable?: boolean;
  addonPurchasable?: boolean;
  active: boolean;
};

type ProductServicePackageItem = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unitPrice?: number | string;
  vatRate?: number | string;
  quantity: number;
  unlimited: boolean;
};

type ProductServicePackage = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  features?: string[];
  price: number | string;
  monthlyDiscount?: number | string | null;
  yearlyPrice?: number | string | null;
  yearlyDiscount?: number | string | null;
  effectiveMonthlyPrice?: number | string | null;
  effectiveYearlyPrice?: number | string | null;
  currency: string;
  active: boolean;
  validityDays: number;
  priority?: number | null;
  purchasable?: boolean;
  items?: ProductServicePackageItem[];
};

function authHeaders(): Record<string, string> {
  if (!PRODUCT_SERVICE_AUTH_TOKEN) return {};
  return { [PRODUCT_SERVICE_AUTH_HEADER]: PRODUCT_SERVICE_AUTH_TOKEN };
}

function pageContent<T>(data: SpringPage<T> | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
}

function toCatalogProduct(product: ProductServiceProduct): CatalogProductApiItem {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description ?? null,
    scopeCode: product.scopeCode ?? null,
    typeId: product.typeId ?? null,
    featureCode: product.featureCode ?? null,
    unitPrice: product.unitPrice,
    vatRate: product.vatRate,
    consumable: product.consumable,
    countable: product.consumable,
    addonPurchasable: product.addonPurchasable,
    active: product.active,
  };
}

function toPackageItem(item: ProductServicePackageItem): PlanPackageItemApi {
  return {
    id: item.id,
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    quantity: item.quantity,
    unlimited: item.unlimited,
  };
}

function toAvailableModule(product: ProductServiceProduct): PlanPackageModuleApi {
  return {
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    description: product.description ?? null,
    featureCode: product.featureCode ?? null,
    unitPrice: product.unitPrice,
    vatRate: product.vatRate,
    consumable: product.consumable,
    billingType: "RECURRING",
  };
}

function availableModulesForPackage(
  pkg: ProductServicePackage,
  products: ProductServiceProduct[],
): PlanPackageModuleApi[] {
  const unlimitedIds = new Set(
    (pkg.items ?? []).filter((item) => item.unlimited).map((item) => item.productId),
  );
  return products
    .filter((product) => product.active && product.addonPurchasable && !unlimitedIds.has(product.id))
    .map(toAvailableModule);
}

function toPlanPackage(
  pkg: ProductServicePackage,
  products: ProductServiceProduct[],
): PlanPackageApiItem {
  return {
    id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    description: pkg.description ?? "",
    features: Array.isArray(pkg.features) ? pkg.features : [],
    price: pkg.price,
    monthlyDiscount: pkg.monthlyDiscount ?? null,
    yearlyPrice: pkg.yearlyPrice ?? null,
    yearlyDiscount: pkg.yearlyDiscount ?? null,
    effectiveMonthlyPrice: pkg.effectiveMonthlyPrice ?? null,
    effectiveYearlyPrice: pkg.effectiveYearlyPrice ?? null,
    currency: pkg.currency,
    active: pkg.active,
    validityDays: pkg.validityDays,
    priority: pkg.priority ?? null,
    items: (pkg.items ?? []).map(toPackageItem),
    availableModules: availableModulesForPackage(pkg, products),
  };
}

export function isProductServiceConfigured(): boolean {
  return PRODUCT_SERVICE_BASE_URL.length > 0;
}

export async function fetchProductServicePackages(): Promise<PlanPackageApiItem[]> {
  const headers = authHeaders();
  const [packagesRes, productsRes] = await Promise.all([
    axios.get<SpringPage<ProductServicePackage> | ProductServicePackage[]>(
      `${PRODUCT_SERVICE_BASE_URL}/api/v1/catalog/packages`,
      { headers, params: { size: 100 }, validateStatus: () => true, timeout: 20_000 },
    ),
    axios.get<SpringPage<ProductServiceProduct> | ProductServiceProduct[]>(
      `${PRODUCT_SERVICE_BASE_URL}/api/v1/catalog/products`,
      { headers, params: { size: 100 }, validateStatus: () => true, timeout: 20_000 },
    ),
  ]);

  if (packagesRes.status >= 400) {
    throw Object.assign(new Error("Product service packages failed"), {
      status: packagesRes.status,
      data: packagesRes.data,
    });
  }
  if (productsRes.status >= 400) {
    throw Object.assign(new Error("Product service products failed"), {
      status: productsRes.status,
      data: productsRes.data,
    });
  }

  const products = pageContent(productsRes.data);
  return pageContent(packagesRes.data).map((pkg) => toPlanPackage(pkg, products));
}

export async function fetchProductServiceProducts(): Promise<CatalogProductApiItem[]> {
  const response = await axios.get<SpringPage<ProductServiceProduct> | ProductServiceProduct[]>(
    `${PRODUCT_SERVICE_BASE_URL}/api/v1/catalog/products`,
    {
      headers: authHeaders(),
      params: { size: 100 },
      validateStatus: () => true,
      timeout: 20_000,
    },
  );
  if (response.status >= 400) {
    throw Object.assign(new Error("Product service products failed"), {
      status: response.status,
      data: response.data,
    });
  }
  return pageContent(response.data).map(toCatalogProduct);
}

export async function fetchProductServiceProductByCode(code: string): Promise<CatalogProductApiItem> {
  const response = await axios.get<ProductServiceProduct>(
    `${PRODUCT_SERVICE_BASE_URL}/api/v1/catalog/products/${encodeURIComponent(code)}`,
    {
      headers: authHeaders(),
      validateStatus: () => true,
      timeout: 20_000,
    },
  );
  if (response.status >= 400) {
    throw Object.assign(new Error("Product service product failed"), {
      status: response.status,
      data: response.data,
    });
  }
  return toCatalogProduct(response.data);
}
