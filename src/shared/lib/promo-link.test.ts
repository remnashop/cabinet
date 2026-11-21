import { expect, it } from "vitest";

import { parsePromoLink } from "@shared/lib/promo-link";

it("reads a promocode or an ad link from the address, the promocode first", () => {
  expect(parsePromoLink("?promo=SPRING10", null)).toEqual({ kind: "promo", code: "SPRING10" });
  expect(parsePromoLink("?ad=summer-ads", null)).toEqual({ kind: "ad", code: "summer-ads" });
  expect(parsePromoLink("?ad=x&promo=GIFT", null)).toEqual({ kind: "promo", code: "GIFT" });
});

it("reads the Mini App's start_param like the bot's deep link", () => {
  expect(parsePromoLink("", "promo_GIFT")).toEqual({ kind: "promo", code: "GIFT" });
  expect(parsePromoLink("", "ad_spring")).toEqual({ kind: "ad", code: "spring" });
  expect(parsePromoLink("", "ref_abc")).toBeNull();
});

it("ignores a code the backend would refuse to read", () => {
  expect(parsePromoLink("?promo=bad%20code", null)).toBeNull();
  expect(parsePromoLink("", null)).toBeNull();
});
