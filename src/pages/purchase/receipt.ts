import type { Quote } from "@entities/plan/api";

/** The receipt's lines as the backend counts them: the credit off the list price, the promotion off what's left,
 *  the user's discount takes the remainder, so the lines always add up to the total. */
export function receiptAmounts(quote: Quote) {
  const base = Number(quote.base_price);
  const credit = Math.min(Number(quote.change_credit), base);
  const payable = base - credit;
  const final = Number(quote.final_price);
  const promo = (payable * quote.plan_discount_percent) / 100;
  const discount = quote.discount_percent > 0 ? payable - promo - final : 0;
  return { base, credit, payable, promo, discount, final };
}
