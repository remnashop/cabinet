import { useMutation } from "@tanstack/react-query";
import { Gift, TriangleAlert, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useSearchParams } from "react-router";

import { joinPaymentWaitlist, useCatalogQuery, type Plan } from "@entities/plan/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useSubscriptionsQuery } from "@entities/subscription/api";
import { canBuyMore } from "@entities/subscription/lib";
import { effectivePrice, minPrice } from "@features/purchase/savings";
import { durationLabel, parseWizardParams } from "@features/purchase/wizard";
import { formatMoney } from "@shared/lib/format";
import { buttonClass } from "@shared/ui/button-class";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { PageEmpty } from "@shared/ui/PageEmpty";
import { Skeleton } from "@shared/ui/Skeleton";
import { useRipple } from "@shared/ui/use-ripple";
import { PageHeader } from "@widgets/page-header/PageHeader";
import { SupportButton } from "@widgets/support/SupportButton";

import { PlanLimits } from "./PlanLimits";

const MotionLink = motion.create(Link);

// the card's grid with its button, and without it (an inert card): no empty track, so no gap where the button would be
const WITH_BUTTON =
  "grid-rows-[auto_auto_1fr_auto] [grid-template-areas:'head_head'_'desc_desc'_'feat_price'_'btn_btn'] lg:grid-cols-[1fr_auto_9rem] lg:[grid-template-areas:'head_price_btn'_'desc_price_btn'_'feat_price_btn']";
const NO_BUTTON =
  "grid-rows-[auto_auto_1fr] [grid-template-areas:'head_head'_'desc_desc'_'feat_price'] lg:[grid-template-areas:'head_price'_'desc_price'_'feat_price']";

function PlanCard(props: { plan: Plan; currency: string; to?: string; current?: boolean }) {
  const { plan, currency, to, current } = props;
  const { t, i18n } = useTranslation();
  const ripple = useRipple();
  const price = minPrice(plan, currency);
  // no room for one more: the card and its badge muted
  const dimmed = !to && !current;
  const money = (amount: string) => formatMoney(amount, currency, i18n.language);
  // one period in this currency: its exact price and the period, not "from"
  const priced = plan.durations.filter((d) => d.prices.some((p) => p.currency === currency));
  const single = priced.length === 1 ? priced[0] : null;
  const body = (
    <>
      {plan.badge && !dimmed && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 hidden w-1/2 bg-linear-to-r from-transparent via-white/[0.06] to-transparent motion-safe:block motion-safe:animate-shine"
        />
      )}
      {/* phone: the name, the description, what's inside with the price beside it, the button under them; desktop: one
          row, the text on the left, the price and a compact button on the right. What's inside sits at the bottom
          on both, so a card without a description keeps its taller neighbours' edges */}
      <div className={`relative grid h-full grid-cols-[1fr_auto] gap-3 lg:grid-rows-[auto_auto_1fr] lg:gap-x-6 lg:gap-y-2 ${to ? WITH_BUTTON : NO_BUTTON}`}>
        <div className="flex items-center justify-between gap-2 [grid-area:head] lg:justify-start">
          <span className="flex min-w-0 items-center gap-1.5">
            {plan.is_trial ? <Gift className="size-4 shrink-0" /> : <Zap className="size-4 shrink-0" />}
            <span className="truncate text-base font-bold">{plan.name}</span>
          </span>
          {current ? (
            <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              {t("purchase.currentPlan")}
            </span>
          ) : (
            plan.badge && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  dimmed ? "bg-white/10" : "bg-primary text-primary-foreground"
                }`}
              >
                {t(`purchase.badge.${plan.badge}`)}
              </span>
            )
          )}
        </div>
        {plan.description && <p className="text-xs text-muted-foreground [grid-area:desc]">{plan.description}</p>}
        <PlanLimits plan={plan} className="self-end [grid-area:feat] lg:flex-row lg:gap-4" />
        {price !== null && (
          <span className="flex flex-col items-end gap-1 self-end [grid-area:price] lg:self-center">
            {price.discounted_price && (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground line-through">{money(price.price)}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${dimmed ? "bg-white/10" : "bg-white/20"}`}>
                  −{plan.discount_percent}%
                </span>
              </span>
            )}
            <span className="text-2xl leading-none font-bold tabular-nums tracking-tight">
              {single ? money(effectivePrice(price)) : t("purchase.from", { price: money(effectivePrice(price)) })}
            </span>
            {single && (
              <span className="text-xs text-muted-foreground">{t("purchase.per", { period: durationLabel(single.days, t) })}</span>
            )}
          </span>
        )}
        {to && <span className={`${buttonClass("glass", "md")} [grid-area:btn] lg:self-center`}>{t("purchase.choose")}</span>}
      </div>
    </>
  );
  const frame = "relative block overflow-hidden rounded-home glass-panel p-5 lg:p-4";
  if (!to) {
    return (
      <div aria-disabled className={`${frame} ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
        {body}
      </div>
    );
  }
  return (
    <MotionLink to={to} onPointerDown={ripple.onPointerDown} className={`${frame} text-foreground`}>
      {body}
      {ripple.ripples}
    </MotionLink>
  );
}

function WarningBanner({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-home border border-warning/30 bg-linear-to-r from-warning/[0.12] to-warning/[0.03] p-5 lg:p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
        <TriangleAlert className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-bold text-warning">{title}</h2>
        <span className="text-xs text-foreground">{hint}</span>
      </div>
    </div>
  );
}

// seeing the catalog while payments are off is wanting to buy: the user goes on the waitlist and hears once they're back
function PaymentsOffBanner() {
  const { t } = useTranslation();
  const { mutate } = useMutation({ mutationFn: joinPaymentWaitlist });
  useEffect(() => mutate(), [mutate]);
  return <WarningBanner title={t("purchase.paymentsOffTitle")} hint={t("purchase.paymentsOffHint")} />;
}

export function PurchasePage() {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const { type, subId, access } = parseWizardParams(search);
  const code = access.plan_code;
  const catalog = useCatalogQuery(access);
  const settings = useCabinetSettingsQuery();
  const subscriptions = useSubscriptionsQuery();

  const title = type === "CHANGE" ? t("purchase.changeTitle") : t("purchase.catalog");
  // a plan change hides the current plan, so it needs the subscriptions before listing anything
  const change = type === "CHANGE";
  let body: ReactNode;
  if (catalog.isError && !catalog.data) body = <ErrorCard round error={catalog.error} onRetry={() => void catalog.refetch()} />;
  else if (change && subscriptions.isError && !subscriptions.data) body = <ErrorCard round error={subscriptions.error} onRetry={() => void subscriptions.refetch()} />;
  else if (!catalog.data || (change && !subscriptions.data)) {
    body = [0, 1, 2].map((i) => <Skeleton round key={i} className="h-[212px]" />);
  } else {
    const max = settings.data?.max_active_subscriptions ?? null;
    // unknown until both load: don't flash the banner or block the cards meanwhile
    const blocked =
      type === "NEW" &&
      settings.data !== undefined &&
      subscriptions.data !== undefined &&
      !canBuyMore(max, subscriptions.data.items);
    // unknown while loading: the cards stay open, the checkout itself refuses
    const paymentsOff = settings.data?.payments_enabled === false;
    // a plan change lists the one the subscription is already on too, first, marked and not to pick
    const currentPlanId =
      change ? subscriptions.data?.items.find((s) => s.id === subId)?.plan_id : undefined;
    const plans = [...catalog.data.items].sort((a, b) => Number(b.id === currentPlanId) - Number(a.id === currentPlanId));
    const query = type !== "NEW" ? `?type=${type}&sub=${subId}` : code ? `?code=${code}` : "";
    // a plan link opens its plan's wizard straight away, once it's known there's room for one more
    const linked = code && catalog.data.items.length === 1 ? catalog.data.items[0] : null;
    if (linked && settings.data && subscriptions.data && !blocked && !paymentsOff) {
      return <Navigate to={`/purchase/${linked.id}${query}`} replace />;
    }
    if (plans.every((p) => p.id === currentPlanId)) {
      body = (
        <PageEmpty warning text={t(change ? "purchase.emptyChange" : "purchase.empty")}>
          <SupportButton className="mt-1" />
        </PageEmpty>
      );
    } else body = (
      <>
        {paymentsOff ? <PaymentsOffBanner /> : blocked && <WarningBanner title={t("purchase.limitTitle")} hint={t("purchase.limitHint")} />}
        <div className="grid auto-rows-fr gap-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={catalog.data.anchor_currency}
              current={plan.id === currentPlanId}
              to={blocked || paymentsOff || plan.id === currentPlanId ? undefined : `/purchase/${plan.id}${query}`}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* the catalog is the sidebar's "Buy"; a renewal or a plan change came from the home page and keeps its arrow */}
      <PageHeader title={title} backTo="/" navItem={type === "NEW"} />
      <div className="flex flex-col gap-5">{body}</div>
    </>
  );
}
