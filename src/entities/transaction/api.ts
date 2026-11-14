import { useInfiniteQuery } from "@tanstack/react-query";

import { apiGet } from "@shared/api/http";

export interface Transaction {
  id: number;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELED" | "REFUNDED";
  final_price: string;
  // what the discounts were taken off (Decimal string), the plan's own promotion, then the user's discount
  base_price: string;
  // a change between unlimited plans: the old one's payment, taken off before the discounts
  change_credit: string;
  plan_discount_percent: number;
  discount_percent: number;
  discount_source: "NONE" | "PERSONAL" | "PURCHASE" | "LOYALTY";
  currency: string;
  purchase_type: "NEW" | "RENEW" | "CHANGE";
  gateway_type: string;
  plan_name: string;
  duration_days: number;
  created_at: string | null;
  // what a failed payment's "try again" reopens: the plan, and the subscription a renewal or change was for
  plan_id: number;
  target_subscription_id: number | null;
}

export function getTransaction(id: number | string, signal?: AbortSignal) {
  return apiGet<Transaction>(`/transactions/me/${id}`, signal);
}

const PAGE_SIZE = 20;

interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export function useTransactionsInfinite() {
  return useInfiniteQuery({
    queryKey: ["transactions"],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      apiGet<TransactionPage>(`/transactions/me?page=${pageParam}&page_size=${PAGE_SIZE}`, signal),
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
  });
}
