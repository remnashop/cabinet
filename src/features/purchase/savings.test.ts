import { expect, it } from "vitest";

import type { Plan } from "@entities/plan/api";

import { minPrice, savingsPercent } from "./savings";

const plan = (durations: [number, Record<string, string>][]): Plan => ({
  id: 1,
  name: "",
  description: null,
  tag: null,
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
  expect(minPrice(premium, "XTR")).toBe("100");
  expect(minPrice(premium, "RUB")).toBe("199.00");
  expect(minPrice(premium, "USD")).toBeNull();
});
