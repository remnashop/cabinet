import i18n from "@shared/i18n";
import type { PromocodeActivation } from "@entities/plan/api";

/** What a promo code gave, under "activated"; reward is nullable (plan/addon rewards): no line then rather than "+null". */
export function rewardText(a: PromocodeActivation): string | null {
  const n = a.reward_type === "SUBSCRIPTION" ? a.reward_duration_days : (a.reward ?? a.reward_duration_days);
  return n === null ? null : i18n.t(`promo.${a.reward_type}`, { count: n });
}
