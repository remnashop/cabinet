import { CreditCard, House } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  usePaymentMethodsQuery,
  useQuoteQueries,
  type PaymentMethod,
  type Plan,
  type PlanAccess,
  type Quote,
} from "@entities/plan/api";
import { GATEWAY_LOGOS } from "@entities/plan/gateway-logos";
import { gatewayLabel } from "@features/purchase/wizard";
import { formatMoney } from "@shared/lib/format";
import { AlertMark } from "@shared/ui/AlertMark";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { OptionRow } from "@shared/ui/OptionRow";
import { Skeleton } from "@shared/ui/Skeleton";
import { SupportButton } from "@widgets/support/SupportButton";
import { useSupport } from "@widgets/support/use-support";

export function NoMethods() {
  const { t } = useTranslation();
  const supportAvailable = useSupport().available;
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <AlertMark tone="warning" />
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-xl font-bold tracking-tight">{t("purchase.noMethods")}</h2>
        <p className="text-sm text-muted-foreground">{t("purchase.noMethodsHint")}</p>
      </div>
      <div className="mt-1 flex w-full max-w-sm flex-col gap-2">
        <SupportButton main />
        {/* the only button when the shop gave no support contact */}
        <ButtonLink to="/" variant={supportAvailable ? "glass" : "glassSolid"} size="lg" className="w-full">
          <House className="size-5" />
          {t("common.home")}
        </ButtonLink>
      </div>
    </div>
  );
}

/** The method fixes the currency; one the chosen duration has no price in can't be picked. Each shows the quote's
 *  total, the user's discount in, the catalog price struck through by it; the catalog price until the quote is in. */
export function MethodStep({
  plan,
  days,
  access,
  onSelect,
}: {
  plan: Plan;
  days: number;
  access: PlanAccess;
  onSelect: (method: PaymentMethod) => void;
}) {
  const { t } = useTranslation();
  const methods = usePaymentMethodsQuery();
  const prices = plan.durations.find((d) => d.days === days)?.prices ?? [];
  const quotes = useQuoteQueries(prices.map((p) => ({ plan_id: plan.id, duration_days: days, currency: p.currency, ...access })));
  const quoteIn = (currency: string) => quotes.find((q) => q.data?.currency === currency)?.data;

  if (methods.isError && !methods.data) {
    // PAYMENTS_DISABLED and friends deserve their own text, not "failed to load"
    return (
      <ErrorCard round block error={methods.error} onRetry={() => void methods.refetch()} />
    );
  }
  if (!methods.data) return <Skeleton round className="h-[104px]" />;
  if (methods.data.items.length === 0) {
    return <NoMethods />;
  }
  return (
    <div className="flex flex-col gap-2">
      <h2 className="mb-1 px-5 lg:px-4 text-xs font-semibold uppercase tracking-wide text-foreground">
        {t("purchase.chooseMethod")}
      </h2>
      {methods.data.items.map((m) => {
        const price = prices.find((p) => p.currency === m.currency);
        return (
          <OptionRow
            round
            key={`${m.gateway_type}-${m.currency}`}
            disabled={!price}
            onClick={() => onSelect(m)}
            aside={price ? <MethodPrice price={price} quote={quoteIn(price.currency)} /> : t("purchase.noPrice")}
          >
            <span className="flex min-w-0 items-center gap-3">
              {GATEWAY_LOGOS[m.gateway_type] ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                  <img src={GATEWAY_LOGOS[m.gateway_type]} alt="" draggable={false} className="size-[22px] object-contain" />
                </span>
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <CreditCard className="size-4" />
                </span>
              )}
              <span className="text-sm font-semibold">{gatewayLabel(m.gateway_type, t)}</span>
            </span>
          </OptionRow>
        );
      })}
    </div>
  );
}

function MethodPrice({ price, quote }: { price: { currency: string; price: string }; quote: Quote | undefined }) {
  const { i18n } = useTranslation();
  const money = (amount: string) => formatMoney(amount, price.currency, i18n.language);
  if (!quote || Number(quote.final_price) >= Number(price.price)) return money(quote?.final_price ?? price.price);
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs font-normal text-muted-foreground line-through">{money(price.price)}</span>
      {money(quote.final_price)}
    </span>
  );
}
