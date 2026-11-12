import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@shared/api/http";

export type RewardType = "EXTRA_DAYS" | "POINTS";

export interface ReferralProgram {
  enabled: boolean;
  reward_type: RewardType;
  reward_strategy: "AMOUNT" | "PERCENT";
  // keyed by referral level, Decimal strings
  reward_amounts: Record<string, string>;
  invitee_reward_type: RewardType;
  invitee_reward_amount: number;
  // a referrer earns on the friend's first paid subscription only, or on every payment
  accrual_strategy: "FIRST_PAYMENT" | "EVERY_PAYMENT";
  // levels deeper than this earn nothing, whatever reward_amounts holds
  max_level: number;
}

export interface ReferralStats {
  referral_code: string | null;
  referrer_id: number | null;
  // Decimal string
  points: string;
  bonus_days: number;
  counts_by_level: Record<string, number>;
  program: ReferralProgram;
}

/** Everyone who came by the link, all levels. */
export function invitedCount(countsByLevel: Record<string, number>): number {
  return Object.values(countsByLevel).reduce((sum, n) => sum + n, 0);
}

export interface RedeemDaysResult {
  subscription_id: number;
  expire_at: string;
  bonus_days: number;
  // the panel hasn't confirmed yet; the days are applied later
  pending: boolean;
}

export function useReferralQuery() {
  return useQuery({
    queryKey: ["referral"],
    queryFn: ({ signal }) => apiGet<ReferralStats>("/referrals/me", signal),
  });
}

/** The subscriptions bonus days can extend, by the redemption's own rule. Under "subscriptions": whatever changes them
 *  refetches it too. */
export function useRedeemTargetsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["subscriptions", "redeem-targets"],
    queryFn: ({ signal }) => apiGet<{ subscription_ids: number[] }>("/referrals/me/redeem-targets", signal),
    enabled,
  });
}

export function redeemDays(body: { subscription_id: number; days: number }) {
  return apiPost<RedeemDaysResult, typeof body>("/referrals/me/actions/redeem-days", body);
}

/** One of the customer's invitees, any level: the name only, never ids or contacts. */
export interface InvitedUser {
  // null: the account is gone
  name: string | null;
  level: number;
  created_at: string;
  // Decimal strings, the rewards this invitee's payments earned, by type
  reward_amounts: Partial<Record<RewardType, string>>;
}

const INVITED_PAGE_SIZE = 20;

export function useInvitedInfinite() {
  return useInfiniteQuery({
    queryKey: ["referral", "invited"],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      apiGet<{ items: InvitedUser[]; total: number }>(
        `/referrals/me/invited?page=${pageParam}&page_size=${INVITED_PAGE_SIZE}`,
        signal,
      ),
    // the answer has no page fields: what's loaded against the total
    getNextPageParam: (last, pages) =>
      pages.reduce((sum, page) => sum + page.items.length, 0) < last.total ? pages.length + 1 : undefined,
  });
}
