import type { TFunction } from "i18next";

import { PUBLIC_ACCESS, type PaymentMethod, type Plan, type PlanAccess, type PurchaseType, type Quote } from "@entities/plan/api";
import { formatGb } from "@shared/lib/format";
import { LINK_CODE } from "@shared/lib/link-code";

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
    return {
      type,
      subId,
      access: {
        ...PUBLIC_ACCESS,
        renew_subscription_id: type === "RENEW" ? subId : null,
        change_subscription_id: type === "CHANGE" ? subId : null,
      },
    };
  }
  const code = search.get("code");
  const plan_code = code && LINK_CODE.test(code) ? code : null;
  return { type: "NEW", subId: null, access: { ...PUBLIC_ACCESS, plan_code } };
}

/** Which "what happens to your subscription" text the summary shows, from what the quote credits: an unlimited
    one's payment off the price, or days on a fixed term. */
export function typeNoticeKey(
  type: Exclude<PurchaseType, "NEW">,
  quote: Pick<Quote, "change_credit" | "change_credit_days">,
): "RENEW" | "CHANGE" | "CHANGE_CREDIT" | "CHANGE_NO_CARRY" {
  if (type === "RENEW") return "RENEW";
  if (Number(quote.change_credit) > 0) return "CHANGE_CREDIT";
  return quote.change_credit_days > 0 ? "CHANGE" : "CHANGE_NO_CARRY";
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
  unit: "forever" | "years" | "months" | "days";
  count: number;
} {
  if (days === 0) return { unit: "forever", count: 0 };
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

/** No method: a free order, or none offered (a Mini App where the shop sells nothing for Stars). The order goes without
 *  one, and the backend records a free one in the anchor currency itself; a paid one stops at the summary. */
export function freeOrderMethod(currency: string): PaymentMethod {
  return { gateway_type: "", currency, requires_email: false, asks_email: false };
}

/** A gateway's name from the locale (the bot's gateway-name list); one it doesn't know yet, "Capitalized".
 *  null: a free order, paid through no gateway. */
export function gatewayLabel(type: string | null, t: TFunction): string {
  if (!type) return t("gateways.free");
  return t(`gateways.${type}`, { defaultValue: type.charAt(0) + type.slice(1).toLowerCase() });
}

/** ?days= of "buy again": 0 is unlimited, so a missing or broken value is null, never 0. */
export function parseDaysParam(search: URLSearchParams): number | null {
  const raw = search.get("days");
  const days = raw ? Number(raw) : NaN;
  return Number.isInteger(days) && days >= 0 ? days : null;
}
