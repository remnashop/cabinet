import type { TFunction } from "i18next";

import type { Plan, PlanAccess } from "@entities/plan/api";
import { formatGb } from "@shared/lib/format";

export type PurchaseType = "NEW" | "RENEW" | "CHANGE";

/** RENEW/CHANGE only make sense for a subscription; anything else is a plain purchase.
    access: the renewed subscription for RENEW; a plan link's code (the bot's plan_<code>) for a new purchase. */
export function parseWizardParams(search: URLSearchParams): {
  type: PurchaseType;
  subId: number | null;
  access: PlanAccess;
} {
  const type = search.get("type");
  const subId = Number(search.get("sub"));
  if ((type === "RENEW" || type === "CHANGE") && Number.isInteger(subId) && subId > 0) {
    return { type, subId, access: { plan_code: null, renew_subscription_id: type === "RENEW" ? subId : null } };
  }
  const code = search.get("code");
  const plan_code = code && /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : null;
  return { type: "NEW", subId: null, access: { plan_code, renew_subscription_id: null } };
}

/** The wizard's address for buying a plan again, e.g. after a failed payment: same plan, duration and subscription. */
export function retryPath(tx: { plan_id: number; duration_days: number; purchase_type: PurchaseType; target_subscription_id: number | null }): string {
  const params = new URLSearchParams({ days: String(tx.duration_days) });
  if (tx.purchase_type !== "NEW" && tx.target_subscription_id !== null) {
    params.set("type", tx.purchase_type);
    params.set("sub", String(tx.target_subscription_id));
  }
  return `/purchase/${tx.plan_id}?${params.toString()}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** 365 → 1 year, 90 → 3 months, 7 → 7 days. */
export function durationUnit(days: number): {
  unit: "years" | "months" | "days";
  count: number;
} {
  if (days % 365 === 0) return { unit: "years", count: days / 365 };
  if (days % 30 === 0) return { unit: "months", count: days / 30 };
  return { unit: "days", count: days };
}

/** The period in words: "1 год", "3 месяца", "7 дней". */
export function durationLabel(days: number, t: TFunction): string {
  const { unit, count } = durationUnit(days);
  return t(`purchase.${unit}`, { count });
}

/** A plan's traffic and devices in words; 0 is unlimited. */
export function planLimits(plan: Plan, t: TFunction, locale: string): [traffic: string, devices: string] {
  return [
    plan.traffic_limit === 0 ? t("purchase.trafficUnlimited") : t("purchase.trafficAmount", { amount: formatGb(plan.traffic_limit, locale) }),
    plan.device_limit === 0 ? t("purchase.devicesUnlimited") : t("purchase.devices", { count: plan.device_limit }),
  ];
}

/** A gateway's name from the locale (the bot's gateway-name list); one it doesn't know yet, "Capitalized". */
export function gatewayLabel(type: string, t: TFunction): string {
  return t(`gateways.${type}`, { defaultValue: type.charAt(0) + type.slice(1).toLowerCase() });
}
