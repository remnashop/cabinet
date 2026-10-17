import { useTranslation } from "react-i18next";

import { usePaymentMethodsQuery, type PaymentMethod, type Plan } from "@entities/plan/api";
import { getErrorMessage } from "@shared/api/http";
import { gatewayLabel } from "@features/purchase/wizard";
import { formatMoney } from "@shared/lib/format";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Skeleton } from "@shared/ui/Skeleton";

import { OptionRow } from "./OptionRow";

/** The method fixes the currency; one the chosen duration has no price in can't be picked. */
export function MethodStep({
  plan,
  days,
  selected,
  onSelect,
}: {
  plan: Plan;
  days: number;
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}) {
  const { t, i18n } = useTranslation();
  const methods = usePaymentMethodsQuery();
  const prices = plan.durations.find((d) => d.days === days)?.prices ?? [];

  if (methods.isError) {
    // PAYMENTS_DISABLED and friends deserve their own text, not "failed to load"
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">{getErrorMessage(methods.error, t("common.loadFailed"))}</p>
        <Button variant="outline" onClick={() => void methods.refetch()}>
          {t("common.retry")}
        </Button>
      </Card>
    );
  }
  if (!methods.data) return <Skeleton className="h-[104px]" />;
  if (methods.data.items.length === 0) {
    return <Card className="text-sm text-muted-foreground">{t("purchase.noMethods")}</Card>;
  }
  return (
    <div className="flex flex-col gap-2">
      {methods.data.items.map((m) => {
        const price = prices.find((p) => p.currency === m.currency);
        return (
          <OptionRow
            key={`${m.gateway_type}-${m.currency}`}
            selected={selected?.gateway_type === m.gateway_type && selected.currency === m.currency}
            disabled={!price}
            onClick={() => onSelect(m)}
            aside={price ? formatMoney(price.price, price.currency, i18n.language) : t("purchase.noPrice")}
          >
            <span className="text-sm font-semibold">{gatewayLabel(m.gateway_type)}</span>
          </OptionRow>
        );
      })}
    </div>
  );
}
