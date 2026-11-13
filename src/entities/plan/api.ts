import { useQueries, useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@shared/api/http";
import { isMiniApp } from "@shared/telegram";

export interface PlanPrice {
  currency: string;
  price: string;
  // the price with the plan's running promotion off it; null while there is none
  discounted_price?: string | null;
}

export interface PlanDuration {
  days: number;
  order_index: number;
  prices: PlanPrice[];
}

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  // shown on the plan card
  badge: "POPULAR" | "BEST_VALUE" | null;
  type: string;
  traffic_limit_strategy: string;
  // whole GB, 0 = unlimited
  traffic_limit: number;
  device_limit: number;
  is_trial: boolean;
  order_index: number;
  durations: PlanDuration[];
  // the promotion running now: 0 and null while there is none
  discount_percent?: number;
  discount_ends_at?: string | null;
}

export interface PaymentMethod {
  gateway_type: string;
  currency: string;
  requires_email: boolean;
  /** false: the shop sends its own email to the gateway, so the customer's isn't asked; absent on older backends */
  asks_email?: boolean;
}

/** What opens a plan the public catalog leaves out: a plan link's code, or the subscription being renewed. */
export interface PlanAccess {
  plan_code: string | null;
  renew_subscription_id: number | null;
}

export const PUBLIC_ACCESS: PlanAccess = { plan_code: null, renew_subscription_id: null };

export interface QuoteInput extends PlanAccess {
  plan_id: number;
  duration_days: number;
  currency: string;
}

export interface Quote {
  base_price: string;
  plan_discount_percent: number;
  discount_percent: number;
  discount_source: "NONE" | "PERSONAL" | "PURCHASE" | "LOYALTY";
  final_price: string;
  currency: string;
}

export interface CheckoutInput {
  plan_id: number;
  duration_days: number;
  currency: string;
  purchase_type: "NEW" | "RENEW" | "CHANGE";
  gateway_type: string;
  target_subscription_id?: number;
  plan_code?: string;
  customer_email?: string;
  legal_locale?: string;
  // the total shown to the customer: the backend refuses the order with PRICE_CHANGED if it moved
  expected_price?: string;
  // the customer's earlier unpaid order this one replaces: canceled, so it holds neither a slot nor the discount
  replaces_order_id?: number;
}

export interface PromocodeActivation {
  code: string;
  reward_type: "DURATION" | "TRAFFIC" | "DEVICES" | "SUBSCRIPTION" | "PERSONAL_DISCOUNT" | "PURCHASE_DISCOUNT";
  reward: number | null;
  reward_duration_days: number | null;
  reward_plan_id: number | null;
  reward_addon_id: number | null;
}

/** With a plan link's code: just the plan it opens; with a subscription to renew: the plan it renews into. */
export function useCatalogQuery(access: PlanAccess = PUBLIC_ACCESS) {
  const params = new URLSearchParams();
  if (access.plan_code) params.set("plan_code", access.plan_code);
  if (access.renew_subscription_id !== null) params.set("renew_subscription_id", String(access.renew_subscription_id));
  const query = params.size ? `?${params}` : "";
  return useQuery({
    queryKey: ["catalog", access],
    queryFn: ({ signal }) =>
      apiGet<{ items: Plan[]; total: number; anchor_currency: string }>(`/plans/catalog${query}`, signal),
  });
}

/** Stars pay through the Mini App's invoice popup: outside Telegram the method can't be paid with, so it isn't one. */
export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: ({ signal }) => apiGet<{ items: PaymentMethod[] }>("/checkout/methods", signal),
    select: (data) =>
      isMiniApp() ? data : { items: data.items.filter((m) => m.gateway_type !== "TELEGRAM_STARS") },
  });
}

/** The price shown to the user always comes from here, never from a local calculation. */
const quoteQuery = (input: QuoteInput) => ({
  queryKey: ["quote", input],
  queryFn: ({ signal }: { signal: AbortSignal }) => apiPost<Quote, QuoteInput>("/checkout/quote", input, signal),
});

export function useQuoteQuery(input: QuoteInput | null) {
  return useQuery({
    ...quoteQuery(input ?? { plan_id: 0, duration_days: 0, currency: "", ...PUBLIC_ACCESS }),
    enabled: input !== null,
  });
}

/** One quote per input, on the same cache as useQuoteQuery: the method step's totals are the summary's. */
export function useQuoteQueries(inputs: QuoteInput[]) {
  return useQueries({ queries: inputs.map(quoteQuery) });
}

/** While payments are off: a Telegram message once they're back. */
export const joinPaymentWaitlist = () => apiPost<null, object>("/checkout/waitlist", {});

export function createCheckout(body: CheckoutInput) {
  return apiPost<{ order_id: number; confirmation_url: string | null }, CheckoutInput>("/checkout", body);
}

/** The subscriptions a code's reward can go to, by the activation's own rule: not a trial, and active once it lands. */
export function usePromocodeTargetsQuery(code: string, enabled: boolean) {
  return useQuery({
    queryKey: ["promocode-targets", code],
    queryFn: ({ signal }) =>
      apiGet<{ subscription_ids: number[] }>(`/promocodes/targets?code=${encodeURIComponent(code)}`, signal),
    enabled,
  });
}

export function activatePromocode(body: { code: string; target_subscription_id?: number }) {
  return apiPost<PromocodeActivation, typeof body>("/promocodes/activations", body);
}
