import i18n from "@shared/i18n";
import type { PromocodeActivation } from "@entities/plan/api";

/** Success text per reward type; reward is nullable (plan/addon rewards), so fall back to a generic text rather than "+null". */
export function rewardText(a: PromocodeActivation): string {
  const n = a.reward_type === "SUBSCRIPTION" ? a.reward_duration_days : (a.reward ?? a.reward_duration_days);
  return n === null ? i18n.t("promo.success") : i18n.t(`promo.${a.reward_type}`, { count: n });
}
