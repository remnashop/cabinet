import type { Plan } from "@entities/plan/api";
import type { OwnSubscription } from "@entities/subscription/api";

const DAY_MS = 86_400_000;
const SOON_DAYS = 3;

// whole days, rounded up, so "0.4 days left" still reads as one day
export function daysLeft(expireAt: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(expireAt).getTime() - now.getTime()) / DAY_MS));
}

const HOUR_MS = 3_600_000;

/** What's left, for a label: whole days rounded up, under a day whole hours, under an hour minutes rounded up. */
export function timeLeft(expireAt: string, now: Date): { unit: "days" | "hours" | "minutes"; count: number } {
  const ms = new Date(expireAt).getTime() - now.getTime();
  if (ms <= 0 || ms >= DAY_MS) return { unit: "days", count: daysLeft(expireAt, now) };
  if (ms >= HOUR_MS) return { unit: "hours", count: Math.floor(ms / HOUR_MS) };
  return { unit: "minutes", count: Math.ceil(ms / 60_000) };
}

export function urgency(sub: Pick<OwnSubscription, "status" | "expire_at">, now: Date): "ok" | "soon" | "expired" {
  if (sub.status === "EXPIRED" || new Date(sub.expire_at).getTime() <= now.getTime()) return "expired";
  if (daysLeft(sub.expire_at, now) <= SOON_DAYS) return "soon";
  return "ok";
}

type Alert = "error" | "warning" | null;

/** The days' alarm: red with a day or none left, orange within three days. */
export function daysAlert(sub: Pick<OwnSubscription, "status" | "expire_at">, now: Date): Alert {
  const state = urgency(sub, now);
  if (state === "expired" || daysLeft(sub.expire_at, now) <= 1) return "error";
  return state === "soon" ? "warning" : null;
}

/** The traffic's alarm: red over 90% used or once the panel has limited it, orange from 60%. */
export function trafficAlert(sub: Pick<OwnSubscription, "status" | "used_traffic" | "effective_traffic_limit">): Alert {
  const ratio = trafficRatio(sub.used_traffic, sub.effective_traffic_limit) ?? 0;
  if (sub.status === "LIMITED" || ratio > 0.9) return "error";
  return ratio >= 0.6 ? "warning" : null;
}

type AlertSub = Pick<OwnSubscription, "status" | "expire_at" | "used_traffic" | "effective_traffic_limit">;

/** How loud a card should glow: the louder of the days and the traffic. null: nothing to warn about. */
export function cardAlert(sub: AlertSub, now: Date): Alert {
  const days = daysAlert(sub, now);
  const traffic = trafficAlert(sub);
  return days === "error" || traffic === "error" ? "error" : (days ?? traffic);
}

export type CardNotice =
  | "deleted"
  | "disabled"
  | "expiredTraffic"
  | "expired"
  | "trafficOut"
  | "bothSoon"
  | "daysSoon"
  | "trafficSoon";

/** The traffic is used up: the panel limited it, or all of it is gone. */
export function trafficOut(sub: Pick<OwnSubscription, "status" | "used_traffic" | "effective_traffic_limit">): boolean {
  return sub.status === "LIMITED" || trafficRatio(sub.used_traffic, sub.effective_traffic_limit) === 1;
}

/** What the strip under a card says, the worst first. null: nothing wrong, no strip. */
export function cardNotice(sub: AlertSub, now: Date): CardNotice | null {
  if (sub.status === "DELETED") return "deleted";
  if (sub.status === "DISABLED") return "disabled";
  const expired = urgency(sub, now) === "expired";
  const out = trafficOut(sub);
  if (expired && out) return "expiredTraffic";
  if (expired) return "expired";
  if (out) return "trafficOut";
  const days = daysAlert(sub, now) !== null;
  const traffic = trafficAlert(sub) !== null;
  if (days && traffic) return "bothSoon";
  if (days) return "daysSoon";
  return traffic ? "trafficSoon" : null;
}

// used is bytes, the limit whole GB (binary); null when usage is unknown or uncapped (0 = unlimited)
export function trafficRatio(used: number | null, limitGb: number): number | null {
  if (used === null || limitGb === 0) return null;
  return Math.min(1, used / (limitGb * 1024 ** 3));
}

// trials cannot be renewed, and a plan the backend's renewal catalog lacks has nothing to renew into
export function canRenew(sub: OwnSubscription, catalog: Plan[]): boolean {
  return !sub.is_trial && catalog.some((p) => p.id === sub.plan_id);
}

// null = no cap. Counted as the backend's checkout does: an expired subscription holds its slot (it's renewed in
// place), a trial doesn't (a purchase upgrades it)
export function canBuyMore(maxActive: number | null, items: OwnSubscription[]): boolean {
  return maxActive === null || items.filter((s) => !s.is_trial).length < maxActive;
}

/** The number a card shows: #0042. */
export function subscriptionNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}
