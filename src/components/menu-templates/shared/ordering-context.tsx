"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import { getPublicProductRequest, type MenuProductApiItem } from "@/lib/api";
import {
  cartLineKey,
  areOptionSelectionsValid,
  productHasOptions,
  selectedOptionIdsFromSnapshot,
  type SelectedOrderOption,
} from "@/lib/product-options";
import {
  getCart,
  openTableSession,
  OrderingApiError,
  putCart,
  submitOrder as submitOrderApi,
  type OrderResponse,
} from "@/lib/ordering-api";
import { usePublicMenuProducts } from "./use-public-menu-products";

import { ProductOptionsSheet } from "./ProductOptionsSheet";

const SESSION_STORAGE_PREFIX = "algory_table_session:";

type LocalCartItem = {
  lineKey: string;
  productId: number;
  productName: string;
  unitPrice?: number | string;
  quantity: number;
  note?: string;
  currency?: string;
  selectedOptionIds: number[];
  selectedOptions?: SelectedOrderOption[];
  optionGroups?: MenuProductApiItem["optionGroups"];
  optionsRequired?: boolean;
  /** Units added from a menu assistant suggestion, never above quantity. */
  assistantQuantity?: number;
};

/** Where an add-to-cart came from; "assistant" counts the units as menu assistant sales. */
export type CartAddOrigin = "menu" | "assistant";

export const TABLE_INACTIVE_MESSAGE = "Bu masa şu anda hizmet vermemektedir";

type OrderingContextValue = {
  identifier: string;
  publicId: string;
  hasTableSession: boolean;
  tableName: string | null;
  tableInactive: boolean;
  sessionToken: string | null;
  cart: OrderResponse | null;
  localItems: LocalCartItem[];
  cartCount: number;
  cartTotal: number;
  note: string;
  setNote: (note: string) => void;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  beginAddProduct: (
    product: MenuProductApiItem,
    quantity?: number,
    options?: { openCart?: boolean; deferOptions?: boolean; origin?: CartAddOrigin },
  ) => Promise<string | null>;
  addProduct: (
    product: MenuProductApiItem,
    quantity?: number,
    selectedOptionIds?: number[],
    lineNote?: string,
    origin?: CartAddOrigin,
  ) => Promise<string | null>;
  updateQty: (lineKey: string, quantity: number) => Promise<void>;
  submitOrder: () => Promise<OrderResponse | null>;
  openOptionsForCartLine: (lineKey: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
};

const OrderingContext = createContext<OrderingContextValue | null>(null);

/** Assistant units of a cart line: a whole number between 0 and the line quantity. */
export function clampAssistantQuantity(value: number | null | undefined, quantity: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), Math.max(0, Math.floor(quantity)));
}

function sessionStorageKey(identifier: string) {
  return `${SESSION_STORAGE_PREFIX}${identifier}`;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function selectedOptionsForProduct(
  product: MenuProductApiItem,
  selectedOptionIds: number[],
): SelectedOrderOption[] {
  const selected = new Set(selectedOptionIds);
  return (product.optionGroups ?? []).flatMap((group) =>
    (group.options ?? [])
      .filter((option) => selected.has(option.optionId))
      .map((option) => ({
        groupId: group.groupId,
        groupName: group.name,
        optionId: option.optionId,
        optionName: option.name,
        priceDelta: option.priceDelta,
      })),
  );
}

type OrderingProviderProps = {
  identifier: string;
  publicId: string;
  children: ReactNode;
};

export function OrderingProvider({ identifier, publicId, children }: OrderingProviderProps) {
  const searchParams = useSearchParams();
  const tableToken = searchParams.get("t")?.trim() || null;

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [tableInactive, setTableInactive] = useState(false);
  const [cart, setCart] = useState<OrderResponse | null>(null);
  const [localItems, setLocalItems] = useState<LocalCartItem[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [optionsProduct, setOptionsProduct] = useState<MenuProductApiItem | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [pendingOptionLineKey, setPendingOptionLineKey] = useState<string | null>(null);
  const { products: catalogProducts } = usePublicMenuProducts();

  const showRequiredOptions = useCallback(
    (lineKey: string, product: MenuProductApiItem) => {
      if (!product.optionGroups?.length) {
        setError("Bu ürünün seçenekleri yüklenemedi. Lütfen menüyü yenileyip tekrar deneyin.");
        return false;
      }
      setPendingOptionLineKey(lineKey);
      setOptionsProduct(product);
      setOptionsOpen(true);
      return true;
    },
    [],
  );

  const markSessionError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : "Sipariş oturumu açılamadı";
    setError(message);
    setTableInactive(message === TABLE_INACTIVE_MESSAGE);
  }, []);

  const syncLocalFromCart = useCallback((order: OrderResponse | null, fallbackItems: LocalCartItem[] = []) => {
    const items = (order?.items ?? []).map((item) => {
      const selectedOptions = item.selectedOptions ?? [];
      const selectedOptionIds = selectedOptionIdsFromSnapshot(selectedOptions);
      const fallback = fallbackItems.find(
        (entry) => entry.lineKey === cartLineKey(item.productId, selectedOptionIds),
      );
      return {
        lineKey: cartLineKey(item.productId, selectedOptionIds),
        productId: item.productId,
        productName: item.productName || `#${item.productId}`,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        note: item.note ?? undefined,
        currency: order?.currency ?? undefined,
        selectedOptionIds,
        selectedOptions,
        optionGroups: fallback?.optionGroups,
        optionsRequired: fallback?.optionsRequired,
        assistantQuantity: clampAssistantQuantity(
          item.assistantQuantity ?? fallback?.assistantQuantity,
          item.quantity,
        ),
      };
    });
    setLocalItems(items);
    setNote(order?.note ?? "");
  }, []);

  const persistSession = useCallback(
    (session: { sessionToken: string; tableName?: string | null; tableId?: number; expiresAt?: string | null }) => {
      if (typeof window === "undefined") return;
      sessionStorage.setItem(
        sessionStorageKey(identifier),
        JSON.stringify({
          sessionToken: session.sessionToken,
          tableName: session.tableName,
          tableId: session.tableId,
          expiresAt: session.expiresAt,
          tableToken: tableToken,
        }),
      );
    },
    [identifier, tableToken],
  );

  const ensureSession = useCallback(async () => {
    try {
      const session = await openTableSession(identifier, tableToken);
      setSessionToken(session.sessionToken);
      setTableName(session.tableName);
      setTableInactive(false);
      persistSession(session);
      return session.sessionToken;
    } catch (err) {
      markSessionError(err);
      throw err;
    }
  }, [identifier, markSessionError, persistSession, tableToken]);

  const refreshCart = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const next = await getCart(identifier, sessionToken);
      setCart(next);
      syncLocalFromCart(next);
    } catch {
      /* ignore */
    }
  }, [identifier, sessionToken, syncLocalFromCart]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      setTableInactive(false);
      try {
        if (tableToken) {
          try {
            const session = await openTableSession(identifier, tableToken);
            if (cancelled) return;
            setSessionToken(session.sessionToken);
            setTableName(session.tableName);
            persistSession(session);
            const next = await getCart(identifier, session.sessionToken);
            if (!cancelled) {
              setCart(next);
              syncLocalFromCart(next);
            }
          } catch (err) {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem(sessionStorageKey(identifier));
            }
            if (!cancelled) markSessionError(err);
          }
          return;
        }

        if (typeof window !== "undefined") {
          const raw = sessionStorage.getItem(sessionStorageKey(identifier));
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { tableToken?: string | null };
              if (!parsed.tableToken) sessionStorage.removeItem(sessionStorageKey(identifier));
            } catch {
              sessionStorage.removeItem(sessionStorageKey(identifier));
            }
          }
        }
      } catch (err) {
        if (!cancelled) markSessionError(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBootstrapped(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [identifier, markSessionError, persistSession, syncLocalFromCart, tableToken]);

  const persistCart = useCallback(
    async (items: LocalCartItem[], nextNote: string, token: string) => {
      const payload = {
        items: items
          .filter((item) => item.quantity > 0)
          .map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.note ? { note: item.note } : {}),
            ...(item.selectedOptionIds.length
              ? { selectedOptionIds: item.selectedOptionIds }
              : {}),
            ...(clampAssistantQuantity(item.assistantQuantity, item.quantity) > 0
              ? { assistantQuantity: clampAssistantQuantity(item.assistantQuantity, item.quantity) }
              : {}),
          })),
        ...(nextNote.trim() ? { note: nextNote.trim() } : {}),
      };
      const next = await putCart(identifier, token, payload);
      setCart(next);
      syncLocalFromCart(next, items);
      return next;
    },
    [identifier, syncLocalFromCart],
  );

  const addProduct = useCallback(
    async (
      product: MenuProductApiItem,
      quantity = 1,
      selectedOptionIds: number[] = [],
      lineNote?: string,
      origin: CartAddOrigin = "menu",
    ): Promise<string | null> => {
      setError(null);
      const addedByAssistant = origin === "assistant" ? quantity : 0;
      if (!Number.isFinite(product.productId) || product.productId <= 0) {
        const message = "Ürün bilgisi eksik";
        setError(message);
        return message;
      }

      const key = cartLineKey(product.productId, selectedOptionIds);
      const existing = localItems.find((item) => item.lineKey === key);
      const selectedOptions = selectedOptionsForProduct(product, selectedOptionIds);
      const nextItems = existing
        ? localItems.map((item) =>
            item.lineKey === key
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  assistantQuantity: (item.assistantQuantity ?? 0) + addedByAssistant,
                  selectedOptions,
                  ...(lineNote ? { note: lineNote } : {}),
                }
              : item,
          )
        : [
            ...localItems,
            {
              lineKey: key,
              productId: product.productId,
              productName: product.name,
              unitPrice: product.price,
              quantity,
              currency: product.currency,
              selectedOptionIds,
              selectedOptions,
              optionGroups: product.optionGroups,
              optionsRequired: productHasOptions(product),
              note: lineNote,
              assistantQuantity: addedByAssistant,
            },
          ];

      if (!tableToken) {
        setLocalItems(nextItems);
        return null;
      }

      let token = sessionToken;
      if (!token) {
        try {
          token = await ensureSession();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Sipariş oturumu açılamadı";
          setError(message);
          return message;
        }
      }

      const persistWithToken = async (activeToken: string) => {
        await persistCart(nextItems, note, activeToken);
      };

      try {
        await persistWithToken(token);
        return null;
      } catch (err) {
        const expired =
          err instanceof OrderingApiError && (err.status === 401 || err.status === 403);
        if (expired) {
          try {
            token = await ensureSession();
            await persistWithToken(token);
            return null;
          } catch (retryErr) {
            const message =
              retryErr instanceof Error ? retryErr.message : "Sepete eklenemedi";
            setError(message);
            await refreshCart();
            return message;
          }
        }
        const message = err instanceof Error ? err.message : "Sepete eklenemedi";
        setError(message);
        await refreshCart();
        return message;
      }
    },
    [ensureSession, localItems, note, persistCart, refreshCart, sessionToken, tableToken],
  );

  const replaceCartLineWithOptions = useCallback(
    async (
      lineKey: string,
      product: MenuProductApiItem,
      selectedOptionIds: number[],
      quantity: number,
      lineNote?: string,
    ): Promise<string | null> => {
      const existing = localItems.find((item) => item.lineKey === lineKey);
      if (!existing) return addProduct(product, quantity, selectedOptionIds, lineNote);

      const selectedOptions = selectedOptionsForProduct(product, selectedOptionIds);
      const nextLine = {
        ...existing,
        lineKey: cartLineKey(product.productId, selectedOptionIds),
        productName: product.name,
        unitPrice: product.price,
        quantity,
        currency: product.currency,
        selectedOptionIds,
        selectedOptions,
        optionGroups: product.optionGroups,
        optionsRequired: existing.optionsRequired || productHasOptions(product),
        note: lineNote,
        assistantQuantity: clampAssistantQuantity(existing.assistantQuantity, quantity),
      };
      const nextItems = localItems
        .filter((item) => item.lineKey !== lineKey && item.lineKey !== nextLine.lineKey)
        .concat(nextLine);

      if (!tableToken) {
        setLocalItems(nextItems);
        return null;
      }

      let token = sessionToken;
      if (!token) {
        try {
          token = await ensureSession();
        } catch (err) {
          return err instanceof Error ? err.message : "Sipariş oturumu açılamadı";
        }
      }

      try {
        await persistCart(nextItems, note, token);
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sepet güncellenemedi";
        setError(message);
        await refreshCart();
        return message;
      }
    },
    [addProduct, ensureSession, localItems, note, persistCart, refreshCart, sessionToken, tableToken],
  );

  const beginAddProduct = useCallback(
    async (
      product: MenuProductApiItem,
      quantity = 1,
      options?: { openCart?: boolean; deferOptions?: boolean; origin?: CartAddOrigin },
    ): Promise<string | null> => {
      const openCart = options?.openCart ?? true;
      if (productHasOptions(product) && !options?.deferOptions) {
        setPendingOptionLineKey(null);
        setOptionsProduct(product);
        setOptionsOpen(true);
        return null;
      }
      const failure = await addProduct(product, quantity, [], undefined, options?.origin);
      if (!failure && openCart) setCartOpen(true);
      return failure;
    },
    [addProduct],
  );

  const openOptionsForCartLine = useCallback(
    async (lineKey: string) => {
      const item = localItems.find((entry) => entry.lineKey === lineKey);
      if (!item) return;
      let product = catalogProducts.find((entry) => entry.productId === item.productId);
      if (!product || !productHasOptions(product)) {
        try {
          const detailedProduct = await getPublicProductRequest(publicId, item.productId);
          product = detailedProduct;
        } catch {
          // Keep the catalog product as a fallback when the detail request fails.
        }
      }
      const optionGroups = product?.optionGroups?.length ? product.optionGroups : item.optionGroups;
      if (!item.optionsRequired && !optionGroups?.length) return;
      if (product) {
        product = { ...product, optionGroups };
      } else if (optionGroups?.length) {
        product = {
          productId: item.productId,
          menuId: 0,
          name: item.productName,
          price: item.unitPrice,
          currency: item.currency || "TRY",
          subCategoryId: 0,
          sortOrder: 0,
          available: true,
          optionGroups,
        };
      }
      if (!product) {
        setError("Bu ürünün seçenekleri yüklenemedi. Lütfen tekrar deneyin.");
        return;
      }
      showRequiredOptions(lineKey, product);
    },
    [catalogProducts, localItems, publicId, showRequiredOptions],
  );

  const updateQty = useCallback(
    async (lineKey: string, quantity: number) => {
      const nextItems =
        quantity <= 0
          ? localItems.filter((item) => item.lineKey !== lineKey)
          : localItems.map((item) =>
              item.lineKey === lineKey
                ? {
                    ...item,
                    quantity,
                    assistantQuantity: clampAssistantQuantity(item.assistantQuantity, quantity),
                  }
                : item,
            );
      if (!tableToken) {
        setLocalItems(nextItems);
        return;
      }
      let token = sessionToken;
      if (!token) {
        try {
          token = await ensureSession();
        } catch {
          return;
        }
      }
      setLocalItems(nextItems);
      try {
        await persistCart(nextItems, note, token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sepet güncellenemedi");
        await refreshCart();
      }
    },
    [ensureSession, localItems, note, persistCart, refreshCart, sessionToken, tableToken],
  );

  const submitOrder = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      for (const item of localItems) {
        let product = catalogProducts.find((entry) => entry.productId === item.productId);
        if (!product || !productHasOptions(product)) {
          try {
            const detailedProduct = await getPublicProductRequest(publicId, item.productId);
            product = detailedProduct;
          } catch {
            // Keep the catalog product as a fallback when the detail request fails.
          }
        }
        const optionGroups = product?.optionGroups?.length ? product.optionGroups : item.optionGroups;
        const hasOptions = Boolean(item.optionsRequired || optionGroups?.length);
        const optionsAreValid = Boolean(
          optionGroups?.length &&
            item.selectedOptionIds.length > 0 &&
            areOptionSelectionsValid(optionGroups, item.selectedOptionIds),
        );
        if (hasOptions && !optionsAreValid) {
          if (!product && optionGroups?.length) {
            product = {
              productId: item.productId,
              menuId: 0,
              name: item.productName,
              price: item.unitPrice,
              currency: item.currency || "TRY",
              subCategoryId: 0,
              sortOrder: 0,
              available: true,
              optionGroups,
            };
          } else if (product) {
            product = { ...product, optionGroups };
          }
          if (!product) {
            setError("Bu ürün için seçimler yüklenemedi. Lütfen tekrar deneyin.");
            return null;
          }
          if (!showRequiredOptions(item.lineKey, product)) return null;
          setCartOpen(true);
          return null;
        }
      }

      let token = sessionToken;
      if (!token) {
        token = await ensureSession();
      }
      if (localItems.length > 0) {
        await persistCart(localItems, note, token);
      }
      const order = await submitOrderApi(identifier, token);
      setCart(null);
      setLocalItems([]);
      setNote("");
      return order;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş gönderilemedi");
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [catalogProducts, ensureSession, identifier, localItems, note, persistCart, publicId, sessionToken, showRequiredOptions]);

  const cartCount = useMemo(
    () => localItems.reduce((sum, item) => sum + item.quantity, 0),
    [localItems],
  );

  const cartTotal = useMemo(() => {
    if (cart?.totalAmount != null) return toNumber(cart.totalAmount);
    return localItems.reduce(
      (sum, item) => sum + toNumber(item.unitPrice) * item.quantity,
      0,
    );
  }, [cart?.totalAmount, localItems]);

  const value = useMemo<OrderingContextValue>(
    () => ({
      identifier,
      publicId,
      hasTableSession: Boolean(sessionToken) && bootstrapped,
      tableName,
      tableInactive,
      sessionToken,
      cart,
      localItems,
      cartCount,
      cartTotal,
      note,
      setNote,
      loading,
      submitting,
      error,
      beginAddProduct,
      addProduct,
      updateQty,
      submitOrder,
      openOptionsForCartLine,
      refreshCart,
      cartOpen,
      setCartOpen,
    }),
    [
      addProduct,
      beginAddProduct,
      bootstrapped,
      cart,
      cartCount,
      cartOpen,
      cartTotal,
      error,
      identifier,
      loading,
      localItems,
      publicId,
      note,
      refreshCart,
      sessionToken,
      submitOrder,
      openOptionsForCartLine,
      submitting,
      tableInactive,
      tableName,
      updateQty,
    ],
  );

  return (
    <OrderingContext.Provider value={value}>
      {children}
      <ProductOptionsSheet
        product={optionsProduct}
        open={optionsOpen}
        requireSelection={Boolean(pendingOptionLineKey)}
        onOpenChange={(open) => {
          setOptionsOpen(open);
          if (!open) {
            setOptionsProduct(null);
            setPendingOptionLineKey(null);
          }
        }}
        onConfirm={async ({ selectedOptionIds, quantity, note: lineNote }) => {
          if (!optionsProduct) return "Ürün bulunamadı";
          if (pendingOptionLineKey) {
            const failure = await replaceCartLineWithOptions(
              pendingOptionLineKey,
              optionsProduct,
              selectedOptionIds,
              quantity,
              lineNote,
            );
            if (!failure) setPendingOptionLineKey(null);
            return failure;
          }
          const failure = await addProduct(
            optionsProduct,
            quantity,
            selectedOptionIds,
            lineNote,
          );
          if (!failure) setCartOpen(true);
          return failure;
        }}
      />
    </OrderingContext.Provider>
  );
}

export function useOrdering(): OrderingContextValue {
  const ctx = useContext(OrderingContext);
  if (!ctx) {
    throw new Error("useOrdering must be used within OrderingProvider");
  }
  return ctx;
}

export function useOrderingOptional(): OrderingContextValue | null {
  return useContext(OrderingContext);
}
