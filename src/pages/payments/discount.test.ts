import { describe, expect, it } from "vitest";

import type { Transaction } from "@entities/transaction/api";
import i18n from "@shared/i18n";

import { discountParts, hasDiscount, priceBeforeDiscounts } from "./discount";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 1,
  status: "PAID",
  final_price: "149",
  base_price: "149",
  change_credit: "0",
  plan_discount_percent: 0,
  discount_percent: 0,
  discount_source: "NONE",
  currency: "RUB",
  purchase_type: "NEW",
  gateway_type: "YOOKASSA",
  plan_name: "Premium",
  duration_days: 30,
  created_at: null,
  plan_id: 1,
  target_subscription_id: null,
  ...over,
});

describe("payment discount", () => {
  const t = i18n.getFixedT("ru");

  it("is none when nothing was taken off", () => {
    expect(hasDiscount(tx({}))).toBe(false);
    expect(discountParts(tx({}), t)).toEqual([]);
  });

  it("names the plan's promotion and the user's discount", () => {
    const order = tx({
      base_price: "449",
      final_price: "341",
      plan_discount_percent: 20,
      discount_percent: 5,
      discount_source: "PERSONAL",
    });
    expect(hasDiscount(order)).toBe(true);
    expect(discountParts(order, t)).toEqual([
      ["Акция", 20],
      ["Скидка пользователя", 5],
    ]);
  });
});

describe("a credited plan change", () => {
  // the old unlimited plan's payment came off first: that's no discount
  const credited = tx({ base_price: "5000", change_credit: "3000", final_price: "2000", purchase_type: "CHANGE" });

  it("shows no discount", () => {
    expect(hasDiscount(credited)).toBe(false);
  });

  it("takes discounts off what was left to pay", () => {
    expect(priceBeforeDiscounts(tx({ base_price: "5000", change_credit: "3000", final_price: "1800" }))).toBe(2000);
  });
});
