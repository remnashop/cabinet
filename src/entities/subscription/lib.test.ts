import { expect, it } from "vitest";

import type { Plan } from "@entities/plan/api";
import type { OwnSubscription } from "@entities/subscription/api";

import { canBuyMore, canRenew, daysLeft, trafficColor, trafficRatio, urgency } from "@entities/subscription/lib";

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
  used_traffic: 0,
  link_reset_at: null,
  connect_signature: "",
  ...overrides,
});

const plan = (id: number): Plan => ({
  id,
  name: "",
  description: null,
  tag: null,
  type: "",
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

it("urgency is soon within three days and expired after the deadline or status", () => {
  const in2Days = new Date(now.getTime() + 2 * 86_400_000).toISOString();
  expect(urgency(sub({ expire_at: in2Days }), now)).toBe("soon");
  expect(urgency(sub({ expire_at: "2026-10-01T00:00:00Z" }), now)).toBe("expired");
  expect(urgency(sub({ status: "EXPIRED" }), now)).toBe("expired");
  expect(urgency(sub(), now)).toBe("ok");
});

const GiB = 1024 ** 3;

it("trafficRatio takes used bytes against a whole-GB limit, null when unknown or unlimited, capped at 1", () => {
  expect(trafficRatio(null, 100)).toBeNull();
  expect(trafficRatio(5 * GiB, 0)).toBeNull();
  expect(trafficRatio(150 * GiB, 100)).toBe(1);
  expect(trafficRatio(12.4 * GiB, 100)).toBeCloseTo(0.124);
});

it("trafficColor goes from green (128) to red (0)", () => {
  expect(trafficColor(0)).toBe("hsl(128 85% 55%)");
  expect(trafficColor(1)).toBe("hsl(0 85% 55%)");
});

it("canRenew is false for trials and plans missing from the catalog", () => {
  expect(canRenew(sub(), [plan(10)])).toBe(true);
  expect(canRenew(sub({ is_trial: true }), [plan(10)])).toBe(false);
  expect(canRenew(sub(), [plan(11)])).toBe(false);
});

it("canBuyMore is true without a cap or below it", () => {
  expect(canBuyMore(null, 10)).toBe(true);
  expect(canBuyMore(3, 2)).toBe(true);
  expect(canBuyMore(3, 3)).toBe(false);
});
