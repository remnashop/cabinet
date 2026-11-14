import { expect, it } from "vitest";

import { PUBLIC_ACCESS } from "@entities/plan/api";
import i18n from "@shared/i18n";

import {
  durationUnit,
  gatewayLabel,
  isValidEmail,
  parseDaysParam,
  parseWizardParams,
  retryPath,
  typeNoticeKey,
} from "./wizard";

const NEW = { type: "NEW", subId: null, access: PUBLIC_ACCESS };

it("parseWizardParams reads RENEW/CHANGE with a subscription id; RENEW opens the plan it renews", () => {
  expect(parseWizardParams(new URLSearchParams("?type=RENEW&sub=5"))).toEqual({
    type: "RENEW",
    subId: 5,
    access: { plan_code: null, renew_subscription_id: 5, change_subscription_id: null },
  });
  // a change quotes with the subscription it replaces, for an unlimited one's credit
  expect(parseWizardParams(new URLSearchParams("?type=CHANGE&sub=7"))).toEqual({
    type: "CHANGE",
    subId: 7,
    access: { ...PUBLIC_ACCESS, change_subscription_id: 7 },
  });
});

it("parseWizardParams falls back to NEW without a subscription or with an unknown type", () => {
  expect(parseWizardParams(new URLSearchParams("?type=RENEW"))).toEqual(NEW);
  expect(parseWizardParams(new URLSearchParams("?type=CHANGE&sub=abc"))).toEqual(NEW);
  expect(parseWizardParams(new URLSearchParams("?type=GIFT&sub=5"))).toEqual(NEW);
  expect(parseWizardParams(new URLSearchParams(""))).toEqual(NEW);
});

it("parseWizardParams takes a plan link's code for a new purchase only", () => {
  expect(parseWizardParams(new URLSearchParams("?code=Vip_2-x"))).toEqual({
    ...NEW,
    access: { ...PUBLIC_ACCESS, plan_code: "Vip_2-x" },
  });
  expect(parseWizardParams(new URLSearchParams("?type=RENEW&sub=5&code=vip")).access.plan_code).toBeNull();
  expect(parseWizardParams(new URLSearchParams("?code=a%20b"))).toEqual(NEW);
  expect(parseWizardParams(new URLSearchParams(`?code=${"a".repeat(65)}`))).toEqual(NEW);
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

it("names gateways from the locale, an unknown one Capitalized", () => {
  const t = i18n.getFixedT("ru");
  expect(gatewayLabel("YOOKASSA", t)).toBe("YooKassa");
  expect(gatewayLabel("TELEGRAM_STARS", t)).toBe("Telegram Stars");
  expect(gatewayLabel("NEWPAY", t)).toBe("Newpay");
});

it("retryPath reopens the same plan and duration, a renewal or change for its subscription", () => {
  const tx = { plan_id: 2, duration_days: 30, purchase_type: "NEW" as const, target_subscription_id: null };
  expect(retryPath(tx)).toBe("/purchase/2?days=30");
  expect(retryPath({ ...tx, purchase_type: "RENEW", target_subscription_id: 5 })).toBe("/purchase/2?days=30&type=RENEW&sub=5");
  expect(parseWizardParams(new URLSearchParams("days=30&type=CHANGE&sub=5")).type).toBe("CHANGE");
});

it("durationUnit reads 0 days as forever", () => {
  expect(durationUnit(0)).toEqual({ unit: "forever", count: 0 });
});

it("typeNoticeKey says what a change involving an unlimited subscription carries over", () => {
  const forever = { expire_at: "2099-01-01T00:00:00Z" };
  const month = { expire_at: "2027-01-01T00:00:00Z" };

  expect(typeNoticeKey("RENEW", 30, month)).toBe("RENEW");
  expect(typeNoticeKey("CHANGE", 30, month)).toBe("CHANGE");
  expect(typeNoticeKey("CHANGE", 0, forever)).toBe("CHANGE_CREDIT");
  expect(typeNoticeKey("CHANGE", 0, month)).toBe("CHANGE_NO_CARRY");
  expect(typeNoticeKey("CHANGE", 30, forever)).toBe("CHANGE_NO_CARRY");
});

it("parseDaysParam keeps 0 (unlimited) and drops a missing or broken value", () => {
  expect(parseDaysParam(new URLSearchParams("?days=0"))).toBe(0);
  expect(parseDaysParam(new URLSearchParams("?days=30"))).toBe(30);
  expect(parseDaysParam(new URLSearchParams(""))).toBeNull();
  expect(parseDaysParam(new URLSearchParams("?days="))).toBeNull();
  expect(parseDaysParam(new URLSearchParams("?days=abc"))).toBeNull();
});
