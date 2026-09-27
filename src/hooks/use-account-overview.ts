"use client";

import { useEffect } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import {
  activePurchaseFromOverview,
  mapPurchaseSummaryToApiItem,
  type AccountOverview,
} from "@/lib/account-overview";
import { aggregatePackageUsage } from "@/lib/api";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";
import { BILLING_ADDRESSES_QUERY_KEY, PAYMENT_METHODS_QUERY_KEY } from "@/hooks/use-commerce";
import { invalidateMyProfile, MY_PROFILE_QUERY_KEY, type MyProfile } from "@/hooks/use-my-profile";
import {
  invalidateSubscriptionOverview,
  SUBSCRIPTION_OVERVIEW_QUERY_KEY,
  type SubscriptionOverviewData,
} from "@/hooks/use-subscription-overview";
import { invalidateSubscription, SUBSCRIPTION_QUERY_KEY, type SubscriptionData } from "@/hooks/use-subscription";
import { pickActivePurchase } from "@/lib/product-access";

export const ACCOUNT_OVERVIEW_QUERY_KEY = ["accountOverview"] as const;

export async function fetchAccountOverviewClient(): Promise<AccountOverview> {
  const { data } = await getSiteSameOriginAxios().get<AccountOverview>("/account/overview");
  return data;
}

export function hydrateAccountOverviewCaches(queryClient: QueryClient, overview: AccountOverview) {
  if (overview.profile.ok) {
    queryClient.setQueryData<MyProfile>(MY_PROFILE_QUERY_KEY, overview.profile.data);
  }

  if (overview.subscription.ok) {
    const subscriptionPayload = overview.subscription.data;
    const activePurchase = subscriptionPayload.activePackage
      ? mapPurchaseSummaryToApiItem(subscriptionPayload.activePackage)
      : null;
    const purchasesForUsage = activePurchase ? [activePurchase] : [];
    const overviewData: SubscriptionOverviewData = {
      activePackage: subscriptionPayload.activePackage,
      entitlements: subscriptionPayload.entitlements,
      addonPurchases: subscriptionPayload.addonPurchases ?? [],
      branchQuota: subscriptionPayload.branchQuota ?? null,
      menuQuota: subscriptionPayload.menuQuota ?? null,
      usage: aggregatePackageUsage(subscriptionPayload.entitlements, purchasesForUsage),
      activePurchase,
      fulfillmentDetails: subscriptionPayload.fulfillmentDetails ?? [],
      fulfillmentActive: subscriptionPayload.fulfillmentActive ?? false,
    };
    queryClient.setQueryData(SUBSCRIPTION_OVERVIEW_QUERY_KEY, overviewData);
  }

  if (overview.purchases.ok) {
    const purchases = overview.purchases.data;
    const usage = overview.subscription.ok
      ? aggregatePackageUsage(overview.subscription.data.entitlements, purchases)
      : aggregatePackageUsage([], purchases);
    const subscriptionData: SubscriptionData = {
      usage,
      entitlements: overview.subscription.ok ? overview.subscription.data.entitlements : [],
      purchases,
      activePurchase: pickActivePurchase(purchases),
    };
    queryClient.setQueryData(SUBSCRIPTION_QUERY_KEY, subscriptionData);
  }

  if (overview.billingAddresses.ok) {
    queryClient.setQueryData(BILLING_ADDRESSES_QUERY_KEY, overview.billingAddresses.data);
  }

  if (overview.paymentMethods.ok) {
    queryClient.setQueryData(PAYMENT_METHODS_QUERY_KEY, overview.paymentMethods.data);
  }
}

export function useAccountOverview(enabled = true) {
  const query = useQuery({
    queryKey: ACCOUNT_OVERVIEW_QUERY_KEY,
    queryFn: fetchAccountOverviewClient,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });

  return query;
}

export function useHydrateAccountOverviewCaches(
  queryClient: QueryClient,
  overview: AccountOverview | undefined,
) {
  useEffect(() => {
    if (!overview) return;
    hydrateAccountOverviewCaches(queryClient, overview);
  }, [overview, queryClient]);
}

export function invalidateAccountOverview(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ACCOUNT_OVERVIEW_QUERY_KEY }),
    invalidateMyProfile(queryClient),
    invalidateSubscriptionOverview(queryClient),
    invalidateSubscription(queryClient),
    queryClient.invalidateQueries({ queryKey: BILLING_ADDRESSES_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY }),
  ]);
}

export { activePurchaseFromOverview };
