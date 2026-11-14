import type { Plan, PlanPrice } from "@entities/plan/api";

/** What the price is now: the promotion's while one runs. */
export function effectivePrice(price: PlanPrice): string {
  return price.discounted_price ?? price.price;
}

function priceIn(prices: PlanPrice[], currency: string): number | null {
  const found = prices.find((p) => p.currency === currency);
  return found ? Number(effectivePrice(found)) : null;
}

/** The plan's cheapest price in the currency, the promotion's price on it while one runs. */
export function minPrice(plan: Plan, currency: string): PlanPrice | null {
  let best: PlanPrice | null = null;
  for (const d of plan.durations) {
    const found = d.prices.find((p) => p.currency === currency);
    if (found && (best === null || Number(effectivePrice(found)) < Number(effectivePrice(best)))) best = found;
  }
  return best;
}

/** Per-day saving against the shortest duration priced in the same currency; null when there is none. */
export function savingsPercent(plan: Plan, days: number, currency: string): number | null {
  // an unlimited duration (0 days) has no per-day price to compare
  const priced = plan.durations
    .filter((d) => d.days > 0)
    .map((d) => ({ days: d.days, price: priceIn(d.prices, currency) }))
    .filter((d): d is { days: number; price: number } => d.price !== null);
  const target = priced.find((d) => d.days === days);
  if (!target) return null;
  const base = priced.reduce((a, b) => (b.days < a.days ? b : a));
  // epsilon: 0.2 * 100 is 20.000000000000004, but 0.3 * 100 can land just under 30
  const percent = Math.floor((1 - (target.price * base.days) / (base.price * target.days)) * 100 + 1e-9);
  return percent > 0 ? percent : null;
}

/**
 * A longer period's price per unit of the plan's shortest one, to compare them by: per month when the shortest is a
 * month or more, per day under that. Null for the shortest itself, there is nothing to compare it with.
 */
export function unitPrice(plan: Plan, days: number, price: number): { unit: "month" | "day"; amount: number } | null {
  const shortest = Math.min(...plan.durations.filter((d) => d.days > 0).map((d) => d.days));
  if (days === 0 || days <= shortest) return null;
  // whole like the price is (149 ₽ → 133 ₽ a month), to the cent when it has cents ($8.49 → $2.83, not $3)
  const cents = Number.isInteger(price) ? 1 : 100;
  if (shortest >= 30) return { unit: "month", amount: Math.round(((price * 30) / days) * cents) / cents };
  return { unit: "day", amount: Math.round((price / days) * 100) / 100 };
}
