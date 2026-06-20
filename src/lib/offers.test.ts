import { describe, expect, it } from "vitest";
import { findPrice } from "@/lib/offers";
import type { PlanOffer } from "@/api/subscription";

const plan = {
  durations: [
    {
      days: 30,
      prices: [
        { gateway_type: "stars", final_amount: "100" },
        { gateway_type: "yookassa", final_amount: "199" },
      ],
    },
  ],
} as unknown as PlanOffer;

describe("findPrice", () => {
  it("finds the price for a matching duration and gateway", () => {
    expect(findPrice(plan, 30, "yookassa")?.final_amount).toBe("199");
  });
  it("returns undefined for a missing duration", () => {
    expect(findPrice(plan, 90, "stars")).toBeUndefined();
  });
  it("returns undefined for a missing gateway", () => {
    expect(findPrice(plan, 30, "cryptomus")).toBeUndefined();
  });
});
