import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { useCatalogQuery, type Plan } from "@entities/plan/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useSubscriptionsQuery } from "@entities/subscription/api";
import { canBuyMore } from "@entities/subscription/lib";
import { minPrice } from "@features/purchase/savings";
import { parseWizardParams } from "@features/purchase/wizard";
import { formatGb, formatMoney } from "@shared/lib/format";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

import "@widgets/subscription-cards/card.css";

const TAG = "rounded-full bg-black/25 px-2 py-0.5 text-[10.5px] font-medium";

/** A plan in the subscription cards' palettes; index picks the palette so neighbours differ. */
function PlanCard({ plan, index, currency }: { plan: Plan; index: number; currency: string }) {
  const { t, i18n } = useTranslation();
  const price = minPrice(plan, currency);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] p-3.5 text-white">
      <div className="sub-card-bg" data-palette={index % 3} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" />
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-bold">{plan.name}</span>
            {plan.tag && <span className={`${TAG} uppercase tracking-wide`}>{plan.tag}</span>}
          </div>
          {price !== null && (
            <span className="shrink-0 font-bold">
              {t("purchase.from", {
                price: formatMoney(price, currency, i18n.language),
              })}
            </span>
          )}
        </div>
        {plan.description && <p className="text-xs opacity-85">{plan.description}</p>}
        <div className="flex flex-wrap gap-1.5">
          <span className={TAG}>
            {plan.traffic_limit === 0 ? t("purchase.trafficUnlimited") : formatGb(plan.traffic_limit, i18n.language)}
          </span>
          <span className={TAG}>
            {plan.device_limit === 0
              ? t("purchase.devicesUnlimited")
              : t("purchase.devices", { count: plan.device_limit })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PurchasePage() {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const { type, subId } = parseWizardParams(search);
  const catalog = useCatalogQuery();
  const settings = useCabinetSettingsQuery();
  const subscriptions = useSubscriptionsQuery();

  const title = type === "CHANGE" ? t("purchase.changeTitle") : t("purchase.catalog");
  // a plan change hides the current plan, so it needs the subscriptions before listing anything
  const change = type === "CHANGE";
  let body: ReactNode;
  if (catalog.isError) body = <ErrorCard onRetry={() => void catalog.refetch()} />;
  else if (change && subscriptions.isError) body = <ErrorCard onRetry={() => void subscriptions.refetch()} />;
  else if (!catalog.data || (change && !subscriptions.data)) {
    body = [0, 1, 2].map((i) => <Skeleton key={i} className="h-[112px]" />);
  } else {
    const max = settings.data?.max_active_subscriptions ?? null;
    // unknown until both load: don't flash the banner or block the cards meanwhile
    const blocked =
      type === "NEW" &&
      settings.data !== undefined &&
      subscriptions.data !== undefined &&
      !canBuyMore(max, subscriptions.data.items.length);
    // a plan change offers every plan but the one the subscription is already on
    const currentPlanId =
      change ? subscriptions.data?.items.find((s) => s.id === subId)?.plan_id : undefined;
    const plans = catalog.data.items.filter((p) => p.id !== currentPlanId);
    const query = type === "NEW" ? "" : `?type=${type}&sub=${subId}`;
    body = (
      <>
        {blocked && (
          <div className="flex gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {t("purchase.limit", { count: max ?? 0 })}
          </div>
        )}
        {plans.length === 0 && <Card className="text-sm text-muted-foreground">{t("purchase.empty")}</Card>}
        {plans.map((plan, i) =>
          blocked ? (
            <div key={plan.id} aria-disabled className="opacity-60">
              <PlanCard plan={plan} index={i} currency={catalog.data.anchor_currency} />
            </div>
          ) : (
            <Link
              key={plan.id}
              to={`/purchase/${plan.id}${query}`}
              className="block transition-transform active:scale-[0.99]"
            >
              <PlanCard plan={plan} index={i} currency={catalog.data.anchor_currency} />
            </Link>
          ),
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} backTo={change ? "/" : undefined} />
      <div className="flex flex-col gap-4">{body}</div>
    </>
  );
}
