import { expect, it } from "vitest";

import type { Quote } from "@entities/plan/api";

import { receiptAmounts } from "./receipt";

const quote = (over: Partial<Quote>): Quote => ({
  base_price: "5000",
  change_credit: "0",
  plan_discount_percent: 0,
  discount_percent: 0,
  discount_source: "NONE",
  final_price: "5000",
  currency: "RUB",
  ...over,
});

it("receiptAmounts takes the credit off before the promotion and the discount", () => {
  // 5000 − 3000 credit = 2000; −10% promotion = 1800; −10% discount = 1620
  expect(
    receiptAmounts(quote({ change_credit: "3000", plan_discount_percent: 10, discount_percent: 10, final_price: "1620" })),
  ).toEqual({ base: 5000, credit: 3000, payable: 2000, promo: 200, discount: 180, final: 1620 });
});

it("receiptAmounts caps the credit at the price", () => {
  expect(receiptAmounts(quote({ base_price: "3000", change_credit: "5000", final_price: "0" }))).toEqual({
    base: 3000,
    credit: 3000,
    payable: 0,
    promo: 0,
    discount: 0,
    final: 0,
  });
});
