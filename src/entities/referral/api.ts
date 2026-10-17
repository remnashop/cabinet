import { useQuery } from "@tanstack/react-query";

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
}

export interface ReferralReward {
  type: RewardType;
  amount: string;
  created_at: string | null;
}

export interface ReferralStats {
  referral_code: string | null;
  referrer_id: number | null;
  // Decimal string
  points: string;
  bonus_days: number;
  counts_by_level: Record<string, number>;
  rewards: ReferralReward[];
  program: ReferralProgram;
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

export function redeemDays(body: { subscription_id: number; days: number }) {
  return apiPost<RedeemDaysResult, typeof body>("/referrals/me/actions/redeem-days", body);
}

export function withdrawPoints(amount: number) {
  return apiPost<void, { amount: number }>("/referrals/me/actions/withdraw", { amount });
}
