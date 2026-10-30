import { expect, it } from "vitest";

import type { Plan } from "@entities/plan/api";

import { minPrice, savingsPercent, unitPrice } from "./savings";

const plan = (durations: [number, Record<string, string>][]): Plan => ({
  id: 1,
  name: "",
  description: null,
  badge: null,
  type: "",
  traffic_limit: 0,
  device_limit: 0,
  is_trial: false,
  order_index: 0,
  durations: durations.map(([days, prices], i) => ({
    days,
    order_index: i,
    prices: Object.entries(prices).map(([currency, price]) => ({
      currency,
      price,
    })),
  })),
});

const premium = plan([
  [90, { RUB: "499.00", XTR: "250" }],
  [30, { RUB: "199.00", XTR: "100" }],
  [365, { XTR: "900" }],
]);

it("savingsPercent compares the price per day with the shortest duration, rounded down", () => {
  expect(savingsPercent(premium, 90, "RUB")).toBe(16);
  expect(savingsPercent(premium, 30, "RUB")).toBeNull();
});

it("savingsPercent is null without a price in the currency", () => {
  expect(savingsPercent(premium, 365, "RUB")).toBeNull();
  expect(savingsPercent(premium, 90, "USD")).toBeNull();
});

it("savingsPercent is null when the longer duration is no cheaper per day", () => {
  expect(
    savingsPercent(
      plan([
        [30, { RUB: "100" }],
        [60, { RUB: "250" }],
      ]),
      60,
      "RUB",
    ),
  ).toBeNull();
});

it("minPrice picks the lowest price in the currency", () => {
  expect(minPrice(premium, "XTR")?.price).toBe("100");
  expect(minPrice(premium, "RUB")?.price).toBe("199.00");
  expect(minPrice(premium, "USD")).toBeNull();
});

it("unitPrice compares by month when the shortest period is a month or more", () => {
  expect(unitPrice(premium, 90, 499)).toEqual({ unit: "month", amount: 166 });
  expect(unitPrice(premium, 30, 199)).toBeNull();
});

it("unitPrice compares by day when the shortest period is under a month", () => {
  const weekly = plan([
    [7, { RUB: "49" }],
    [14, { RUB: "89" }],
  ]);
  expect(unitPrice(weekly, 14, 89)).toEqual({ unit: "day", amount: 6.36 });
  expect(unitPrice(weekly, 7, 49)).toBeNull();
});

it("a running promotion's price is the one compared", () => {
  const promo = plan([
    [30, { RUB: "100" }],
    [90, { RUB: "300" }],
  ]);
  promo.durations[1].prices[0].discounted_price = "240";
  expect(savingsPercent(promo, 90, "RUB")).toBe(20);
  expect(minPrice(promo, "RUB")?.price).toBe("100");
  promo.durations[0].prices[0].discounted_price = "70";
  expect(minPrice(promo, "RUB")?.discounted_price).toBe("70");
});

it("unitPrice keeps the cents of a price that has them", () => {
  const usd = plan([
    [30, { USD: "2.99" }],
    [90, { USD: "8.49" }],
  ]);
  expect(unitPrice(usd, 90, 8.49)).toEqual({ unit: "month", amount: 2.83 });
});
