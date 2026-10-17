import type { Plan } from "@entities/plan/api";
import type { OwnSubscription } from "@entities/subscription/api";

const DAY_MS = 86_400_000;
const SOON_DAYS = 3;

// whole days, rounded up, so "0.4 days left" still reads as one day
export function daysLeft(expireAt: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(expireAt).getTime() - now.getTime()) / DAY_MS));
}

export function urgency(sub: Pick<OwnSubscription, "status" | "expire_at">, now: Date): "ok" | "soon" | "expired" {
  if (sub.status === "EXPIRED" || new Date(sub.expire_at).getTime() <= now.getTime()) return "expired";
  if (daysLeft(sub.expire_at, now) <= SOON_DAYS) return "soon";
  return "ok";
}

// used is bytes, the limit whole GB (binary); null when usage is unknown or uncapped (0 = unlimited)
export function trafficRatio(used: number | null, limitGb: number): number | null {
  if (used === null || limitGb === 0) return null;
  return Math.min(1, used / (limitGb * 1024 ** 3));
}

// hue 128 is green, 0 is red
export function trafficColor(ratio: number): string {
  return `hsl(${Math.round(128 * (1 - ratio))} 85% 55%)`;
}

// trials cannot be renewed, and a plan removed from the catalog has nothing to renew into
export function canRenew(sub: OwnSubscription, catalog: Plan[]): boolean {
  return !sub.is_trial && catalog.some((p) => p.id === sub.plan_id);
}

// null = no cap on active subscriptions
export function canBuyMore(maxActive: number | null, count: number): boolean {
  return maxActive === null || count < maxActive;
}
