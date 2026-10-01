import { buildPublicMenuUpstreamUrl } from "@/lib/public-menu-server-cache";
import {
  parseStoreHandle,
  publicStoreDeliveryTypes,
  type StoreOrderTracking,
  type StorefrontData,
} from "@/lib/store-public";

export type PublicStoreFetchResult =
  | { status: "ok"; data: StorefrontData }
  | { status: "not_found" };

export async function fetchPublicStore(handle: string): Promise<PublicStoreFetchResult> {
  const parsed = parseStoreHandle(handle);
  if (!parsed) return { status: "not_found" };

  try {
    const response = await fetch(
      buildPublicMenuUpstreamUrl(
        `/store/public/${parsed.storeNo}/${encodeURIComponent(parsed.token)}`,
      ),
      { cache: "no-store" },
    );
    if (!response.ok) return { status: "not_found" };
    const data = (await response.json()) as StorefrontData;
    return {
      status: "ok",
      data: {
        ...data,
        store: {
          ...data.store,
          deliveryTypes: publicStoreDeliveryTypes(data.store.deliveryTypes, data.store.courierEnabled),
        },
      },
    };
  } catch {
    return { status: "not_found" };
  }
}

export async function fetchPublicStoreOrder(
  orderToken: string,
): Promise<StoreOrderTracking | null> {
  const trimmed = orderToken.trim();
  if (!trimmed) return null;

  try {
    const response = await fetch(
      buildPublicMenuUpstreamUrl(`/store/public/orders/${encodeURIComponent(trimmed)}`),
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as StoreOrderTracking;
  } catch {
    return null;
  }
}
