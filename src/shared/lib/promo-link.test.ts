import { beforeEach, expect, it } from "vitest";

import { capturePromoLink, parsePromoLink, takePromoLink } from "@shared/lib/promo-link";

beforeEach(() => sessionStorage.clear());

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

it("takes the link out of the address, so a reload doesn't open it again", () => {
  const cleaned = capturePromoLink("https://cab.example/?promo=GIFT&utm_source=tg", null);

  expect(cleaned).toBe("https://cab.example/?utm_source=tg");
  expect(takePromoLink()).toEqual({ kind: "promo", code: "GIFT" });
  expect(takePromoLink()).toBeNull();
});

it("opens a Mini App's start_param once per session", () => {
  expect(capturePromoLink("https://cab.example/", "promo_GIFT")).toBeNull();
  expect(takePromoLink()).toEqual({ kind: "promo", code: "GIFT" });

  // the reload hands the same start_param again
  capturePromoLink("https://cab.example/", "promo_GIFT");
  expect(takePromoLink()).toBeNull();
});
