import { expect, it } from "vitest";

import type { Plan } from "@entities/plan/api";
import type { OwnSubscription } from "@entities/subscription/api";

import {
  canBuyMore,
  canRenew,
  cardAlert,
  cardNotice,
  daysAlert,
  daysLeft,
  isUnlimited,
  timeLeft,
  trafficAlert,
  planTermsChanged,
  trafficOut,
  trafficRatio,
  urgency,
} from "@entities/subscription/lib";

const now = new Date("2026-10-17T12:00:00Z");

const sub = (overrides: Partial<OwnSubscription> = {}): OwnSubscription => ({
  id: 1,
  status: "ACTIVE",
  is_trial: false,
  expire_at: "2026-11-30T12:00:00Z",
  url: "",
  effective_traffic_limit: 100,
  effective_device_limit: 3,
  traffic_limit_strategy: "NO_RESET",
  plan_name: "Plan",
  plan_id: 10,
  plan_traffic_limit: 100,
  plan_device_limit: 3,
  plan_traffic_limit_strategy: "NO_RESET",
  used_traffic: 0,
  device_all_reset_at: null,
  link_reset_at: null,
  paused_by_channel_leave: false,
  connect_signature: "",
  ...overrides,
});

const plan = (id: number): Plan => ({
  id,
  name: "",
  description: null,
  badge: null,
  type: "",
  traffic_limit_strategy: "NO_RESET",
  traffic_limit: 0,
  device_limit: 0,
  is_trial: false,
  order_index: 0,
  durations: [],
});

it("daysLeft rounds partial days up and never goes below zero", () => {
  const expireAt = new Date(now.getTime() + 26.2 * 86_400_000).toISOString();
  expect(daysLeft(expireAt, now)).toBe(27);
  expect(daysLeft("2026-10-01T00:00:00Z", now)).toBe(0);
});

it("timeLeft goes to hours under a day and to minutes under an hour", () => {
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString();
  expect(timeLeft(at(26.2 * 86_400_000), now)).toEqual({ unit: "days", count: 27 });
  expect(timeLeft(at(86_400_000), now)).toEqual({ unit: "days", count: 1 });
  expect(timeLeft(at(5.5 * 3_600_000), now)).toEqual({ unit: "hours", count: 5 });
  expect(timeLeft(at(3_600_000), now)).toEqual({ unit: "hours", count: 1 });
  expect(timeLeft(at(59.2 * 60_000), now)).toEqual({ unit: "minutes", count: 60 });
  expect(timeLeft(at(30_000), now)).toEqual({ unit: "minutes", count: 1 });
  expect(timeLeft(at(-1), now)).toEqual({ unit: "days", count: 0 });
});

it("urgency is soon within three days and expired after the deadline or status", () => {
  const in2Days = new Date(now.getTime() + 2 * 86_400_000).toISOString();
  expect(urgency(sub({ expire_at: in2Days }), now)).toBe("soon");
  expect(urgency(sub({ expire_at: "2026-10-01T00:00:00Z" }), now)).toBe("expired");
  expect(urgency(sub({ status: "EXPIRED" }), now)).toBe("expired");
  expect(urgency(sub(), now)).toBe("ok");
});

const GiB = 1024 ** 3;

it("cardAlert: red at a day or none left or over 90% used, orange within three days or from 60%", () => {
  const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
  expect(cardAlert(sub(), now)).toBe(null);
  expect(cardAlert(sub({ expire_at: inDays(3) }), now)).toBe("warning");
  expect(cardAlert(sub({ expire_at: inDays(1) }), now)).toBe("error");
  expect(cardAlert(sub({ status: "EXPIRED" }), now)).toBe("error");
  expect(cardAlert(sub({ used_traffic: 60 * GiB }), now)).toBe("warning");
  expect(cardAlert(sub({ used_traffic: 91 * GiB }), now)).toBe("error");
  // unlimited traffic warns by the days only
  expect(cardAlert(sub({ effective_traffic_limit: 0, used_traffic: 500 * GiB }), now)).toBe(null);
});

it("trafficRatio takes used bytes against a whole-GB limit, null when unknown or unlimited, capped at 1", () => {
  expect(trafficRatio(null, 100)).toBeNull();
  expect(trafficRatio(5 * GiB, 0)).toBeNull();
  expect(trafficRatio(150 * GiB, 100)).toBe(1);
  expect(trafficRatio(12.4 * GiB, 100)).toBeCloseTo(0.124);
});

it("daysAlert and trafficAlert rate each on its own; a LIMITED subscription is red whatever it reports", () => {
  const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
  expect(daysAlert(sub({ expire_at: inDays(3) }), now)).toBe("warning");
  expect(daysAlert(sub({ expire_at: inDays(3), used_traffic: 95 * GiB }), now)).toBe("warning");
  expect(trafficAlert(sub({ expire_at: inDays(1), used_traffic: 60 * GiB }))).toBe("warning");
  expect(trafficAlert(sub({ status: "LIMITED", used_traffic: null }))).toBe("error");
});

it("trafficOut: LIMITED or all of it used; never on an unlimited plan", () => {
  expect(trafficOut(sub({ status: "LIMITED", used_traffic: null }))).toBe(true);
  expect(trafficOut(sub({ used_traffic: 100 * GiB }))).toBe(true);
  expect(trafficOut(sub({ used_traffic: 99 * GiB }))).toBe(false);
  expect(trafficOut(sub({ effective_traffic_limit: 0, used_traffic: 500 * GiB }))).toBe(false);
});

it("cardNotice names the worst trouble, null when there is none", () => {
  const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
  expect(cardNotice(sub(), now)).toBe(null);
  expect(cardNotice(sub({ expire_at: inDays(2) }), now)).toBe("daysSoon");
  expect(cardNotice(sub({ used_traffic: 70 * GiB }), now)).toBe("trafficSoon");
  expect(cardNotice(sub({ expire_at: inDays(2), used_traffic: 70 * GiB }), now)).toBe("bothSoon");
  expect(cardNotice(sub({ status: "LIMITED" }), now)).toBe("trafficOut");
  expect(cardNotice(sub({ used_traffic: 100 * GiB }), now)).toBe("trafficOut");
  expect(cardNotice(sub({ status: "EXPIRED" }), now)).toBe("expired");
  expect(cardNotice(sub({ status: "EXPIRED", used_traffic: 100 * GiB }), now)).toBe("expiredTraffic");
  expect(cardNotice(sub({ status: "DISABLED", used_traffic: 100 * GiB }), now)).toBe("disabled");
  expect(cardNotice(sub({ status: "DELETED" }), now)).toBe("deleted");
});

it("canRenew is false for trials and plans missing from the catalog", () => {
  expect(canRenew(sub(), [plan(10)])).toBe(true);
  expect(canRenew(sub({ is_trial: true }), [plan(10)])).toBe(false);
  expect(canRenew(sub(), [plan(11)])).toBe(false);
});

it("canBuyMore counts an expired subscription, not a trial", () => {
  const paid = [sub(), sub({ status: "EXPIRED" })];
  expect(canBuyMore(null, paid)).toBe(true);
  expect(canBuyMore(3, paid)).toBe(true);
  expect(canBuyMore(2, paid)).toBe(false);
  expect(canBuyMore(2, [sub(), sub({ is_trial: true })])).toBe(true);
});

it("planTermsChanged: the plan's limits or strategy moved since the purchase", () => {
  const edited = { ...plan(10), traffic_limit: 100, device_limit: 3 };
  expect(planTermsChanged(sub(), edited)).toBe(false);
  expect(planTermsChanged(sub(), { ...edited, device_limit: 5 })).toBe(true);
  expect(planTermsChanged(sub(), { ...edited, traffic_limit_strategy: "MONTH" })).toBe(true);
});

it("an unlimited subscription never reads as expiring and can't be renewed", () => {
  const forever = sub({ expire_at: "2099-10-17T12:00:00Z" });

  expect(isUnlimited(forever)).toBe(true);
  expect(urgency(forever, now)).toBe("ok");
  expect(daysAlert(forever, now)).toBeNull();
  expect(canRenew(forever, [{ id: forever.plan_id } as Plan])).toBe(false);
});
