import type { Plan } from "@entities/plan/api";

function priceIn(prices: { currency: string; price: string }[], currency: string): number | null {
  const found = prices.find((p) => p.currency === currency);
  return found ? Number(found.price) : null;
}

/** The plan's cheapest price in the currency, as the backend's Decimal string. */
export function minPrice(plan: Plan, currency: string): string | null {
  let best: string | null = null;
  for (const d of plan.durations) {
    const found = d.prices.find((p) => p.currency === currency);
    if (found && (best === null || Number(found.price) < Number(best))) best = found.price;
  }
  return best;
}

/** Per-day saving against the shortest duration priced in the same currency; null when there is none. */
export function savingsPercent(plan: Plan, days: number, currency: string): number | null {
  const priced = plan.durations
    .map((d) => ({ days: d.days, price: priceIn(d.prices, currency) }))
    .filter((d): d is { days: number; price: number } => d.price !== null);
  const target = priced.find((d) => d.days === days);
  if (!target) return null;
  const base = priced.reduce((a, b) => (b.days < a.days ? b : a));
  // epsilon: 0.2 * 100 is 20.000000000000004, but 0.3 * 100 can land just under 30
  const percent = Math.floor((1 - (target.price * base.days) / (base.price * target.days)) * 100 + 1e-9);
  return percent > 0 ? percent : null;
}
