import type { GatewayPrice, PlanOffer } from "@/api/subscription";

/** Find the price for a plan at a given duration paid via a given gateway. */
export function findPrice(
  plan: PlanOffer,
  days: number,
  gateway: string,
): GatewayPrice | undefined {
  const duration = plan.durations.find((d) => d.days === days);
  return duration?.prices.find((p) => p.gateway_type === gateway);
}
