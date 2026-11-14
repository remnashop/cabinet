import type { TFunction } from "i18next";

import type { Transaction } from "@entities/transaction/api";

/** What the discounts were taken off: the list price less a plan change's credit, which is no discount. */
export function priceBeforeDiscounts(tx: Transaction): number {
  return Number(tx.base_price) - Number(tx.change_credit);
}

/** Was anything taken off: the plan's own promotion or the user's discount. */
export function hasDiscount(tx: Transaction): boolean {
  return priceBeforeDiscounts(tx) > Number(tx.final_price);
}

/** Each discount on the order, [label, percent]: the plan's promotion, then the user's, whatever its source. */
export function discountParts(tx: Transaction, t: TFunction): [string, number][] {
  const parts: [string, number][] = [];
  if (tx.plan_discount_percent > 0) parts.push([t("payments.discountPlan"), tx.plan_discount_percent]);
  if (tx.discount_percent > 0 && tx.discount_source !== "NONE") {
    parts.push([t("payments.discountUser"), tx.discount_percent]);
  }
  return parts;
}
