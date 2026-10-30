import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useQuoteQueries, type Plan, type PlanAccess } from "@entities/plan/api";
import { effectivePrice, savingsPercent, unitPrice } from "@features/purchase/savings";
import { durationLabel, type PurchaseType } from "@features/purchase/wizard";
import { formatMoney } from "@shared/lib/format";
import { NotePill } from "@shared/ui/NotePill";
import { useRipple } from "@shared/ui/use-ripple";

import { PromoNote } from "@pages/purchase/DiscountNote";

function DurationTile({
  disabled,
  onClick,
  label,
  saving,
  price,
  usual,
  caption,
  stacked,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  saving: ReactNode;
  price: string;
  /** the price without the running promotion, struck through beside it */
  usual: string | null;
  caption: string | null;
  /** the struck price under the price, on every tile once one of them can't fit both on a line */
  stacked: boolean;
}) {
  const ripple = useRipple();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      // an odd one out takes the whole last row; p-5 keeps the saving pill (r 10) concentric in the 32px corner
      className="relative flex flex-col gap-3 overflow-hidden rounded-home border border-white/[0.08] bg-white/[0.03] p-5 text-left transition-colors last:odd:col-span-2 enabled:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {ripple.ripples}
      <span className="flex min-h-5 items-center justify-between gap-2">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        {saving}
      </span>
      {/* self-stretch: the tile's width, not the prices', is what they have to fit in */}
      <span className="flex flex-col gap-0.5 self-stretch">
        <span data-price-row className={`flex ${stacked ? "flex-col items-start" : "flex-wrap items-baseline gap-x-1.5"}`}>
          <span className="text-[26px] font-bold tabular-nums tracking-tight">{price}</span>
          {usual && <span className="text-[12px] text-muted-foreground line-through">{usual}</span>}
        </span>
        <span className="text-[12px] text-muted-foreground">{caption ?? "\u00a0"}</span>
      </span>
    </button>
  );
}

/** Prices are shown in the catalog's anchor currency; the method picked next sets the real one. */
export function DurationStep({
  plan,
  currency,
  type,
  access,
  onSelect,
}: {
  plan: Plan;
  currency: string;
  type: PurchaseType;
  access: PlanAccess;
  onSelect: (days: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const durations = [...plan.durations].sort((a, b) => a.order_index - b.order_index);
  // a duration sold only in another currency stays pickable; the method step shows its price
  const priced = durations.map((d) => ({ d, price: d.prices.find((p) => p.currency === currency) ?? d.prices[0] }));
  // each tile's total as the backend quotes it, the promotion and the user's discount in; the catalog price until then
  const quotes = useQuoteQueries(
    priced.map(({ d, price }) => ({ plan_id: plan.id, duration_days: d.days, currency: price?.currency ?? "", ...access })),
  );
  const userDiscount = quotes.find((q) => q.data && q.data.discount_percent > 0)?.data?.discount_percent ?? 0;
  const gridRef = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);
  // every render (prices arrive with the quotes) and every resize of a row or its prices (the width, the font loading):
  // the struck price drops under the price on all tiles if any tile can't fit both on a line. The widths compared are
  // the prices' own (items-start keeps them when stacked), so it lines them up again once there's room.
  useLayoutEffect(() => {
    const rows = [...(gridRef.current?.querySelectorAll<HTMLElement>("[data-price-row]") ?? [])];
    const measure = () =>
      setStacked(
        rows.some((row) => {
          const [price, usual] = row.children as HTMLCollectionOf<HTMLElement>;
          // 6px: gap-x-1.5
          return usual !== undefined && price.offsetWidth + 6 + usual.offsetWidth > row.clientWidth;
        }),
      );
    measure();
    const observer = new ResizeObserver(measure);
    rows.forEach((row) => [row, ...row.children].forEach((el) => observer.observe(el)));
    return () => observer.disconnect();
  });
  return (
    <div className="flex flex-col gap-3">
      <h2 className="px-5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
        {t(`purchase.chooseDuration.${type}`)}
      </h2>
      <div ref={gridRef} className="grid grid-cols-2 gap-2.5">
        {priced.map(({ d, price }, i) => {
          const quote = quotes[i].data;
          const saving = price ? savingsPercent(plan, d.days, price.currency) : null;
          const total = quote ? quote.final_price : price && effectivePrice(price);
          const usual = quote
            ? Number(quote.final_price) < Number(quote.base_price) && quote.base_price
            : price?.discounted_price && price.price;
          const perUnit = price && total ? unitPrice(plan, d.days, Number(total)) : null;
          return (
            <DurationTile
              key={d.days}
              stacked={stacked}
              disabled={!price}
              onClick={() => onSelect(d.days)}
              label={durationLabel(d.days, t)}
              saving={
                saving !== null && (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                    {t("purchase.saving", { percent: saving })}
                  </span>
                )
              }
              price={price && total ? formatMoney(total, price.currency, i18n.language) : t("purchase.noPrice")}
              usual={price && usual ? formatMoney(usual, price.currency, i18n.language) : null}
              caption={
                price && perUnit
                  ? t(perUnit.unit === "month" ? "purchase.perMonth" : "purchase.perDay", {
                      price: formatMoney(perUnit.amount, price.currency, i18n.language),
                    })
                  : null
              }
            />
          );
        })}
      </div>
      {userDiscount > 0 && <NotePill tone="primary">{t("purchase.discountIncluded", { percent: userDiscount })}</NotePill>}
      <PromoNote plan={plan} />
    </div>
  );
}
