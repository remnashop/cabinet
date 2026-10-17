import { expect, it } from "vitest";

import { durationUnit, gatewayLabel, isValidEmail, parseWizardParams } from "./wizard";

it("parseWizardParams reads RENEW/CHANGE with a subscription id", () => {
  expect(parseWizardParams(new URLSearchParams("?type=RENEW&sub=5"))).toEqual({
    type: "RENEW",
    subId: 5,
  });
  expect(parseWizardParams(new URLSearchParams("?type=CHANGE&sub=7"))).toEqual({
    type: "CHANGE",
    subId: 7,
  });
});

it("parseWizardParams falls back to NEW without a subscription or with an unknown type", () => {
  expect(parseWizardParams(new URLSearchParams("?type=RENEW"))).toEqual({
    type: "NEW",
    subId: null,
  });
  expect(parseWizardParams(new URLSearchParams("?type=CHANGE&sub=abc"))).toEqual({ type: "NEW", subId: null });
  expect(parseWizardParams(new URLSearchParams("?type=GIFT&sub=5"))).toEqual({
    type: "NEW",
    subId: null,
  });
  expect(parseWizardParams(new URLSearchParams(""))).toEqual({
    type: "NEW",
    subId: null,
  });
});

it("isValidEmail wants x@y.z without spaces", () => {
  expect(isValidEmail("a@b.c")).toBe(true);
  expect(isValidEmail("a@b")).toBe(false);
  expect(isValidEmail(" a@b.c")).toBe(false);
  expect(isValidEmail("a b@c.d")).toBe(false);
});

it("durationUnit prefers years, then months, then days", () => {
  expect(durationUnit(365)).toEqual({ unit: "years", count: 1 });
  expect(durationUnit(90)).toEqual({ unit: "months", count: 3 });
  expect(durationUnit(7)).toEqual({ unit: "days", count: 7 });
});

it("spells gateway brands like the dashboard", () => {
  expect(gatewayLabel("YOOKASSA")).toBe("YooKassa");
  expect(gatewayLabel("TELEGRAM_STARS")).toBe("Telegram Stars");
  expect(gatewayLabel("CRYPTOMUS")).toBe("Cryptomus");
});
