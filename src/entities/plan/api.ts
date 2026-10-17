import { useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@shared/api/http";

export interface PlanDuration {
  days: number;
  order_index: number;
  prices: { currency: string; price: string }[];
}

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  tag: string | null;
  type: string;
  // whole GB, 0 = unlimited
  traffic_limit: number;
  device_limit: number;
  is_trial: boolean;
  order_index: number;
  durations: PlanDuration[];
}

export interface PaymentMethod {
  gateway_type: string;
  currency: string;
  requires_email: boolean;
}

export interface QuoteInput {
  plan_id: number;
  duration_days: number;
  currency: string;
  plan_code?: string;
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
  customer_email?: string;
}

export interface PromocodeActivation {
  code: string;
  reward_type: "DURATION" | "TRAFFIC" | "DEVICES" | "SUBSCRIPTION" | "PERSONAL_DISCOUNT" | "PURCHASE_DISCOUNT";
  reward: number | null;
  reward_duration_days: number | null;
  reward_plan_id: number | null;
  reward_addon_id: number | null;
}

export function useCatalogQuery() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: ({ signal }) =>
      apiGet<{ items: Plan[]; total: number; anchor_currency: string }>("/plans/catalog", signal),
  });
}

export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: ({ signal }) => apiGet<{ items: PaymentMethod[] }>("/checkout/methods", signal),
  });
}

/** The price shown to the user always comes from here, never from a local calculation. */
export function useQuoteQuery(input: QuoteInput | null) {
  return useQuery({
    queryKey: ["quote", input],
    queryFn: ({ signal }) => apiPost<Quote, QuoteInput>("/checkout/quote", input!, signal),
    enabled: input !== null,
  });
}

export function createCheckout(body: CheckoutInput) {
  return apiPost<{ order_id: number; confirmation_url: string | null }, CheckoutInput>("/checkout", body);
}

export function activatePromocode(body: { code: string; target_subscription_id?: number }) {
  return apiPost<PromocodeActivation, typeof body>("/promocodes/activations", body);
}
