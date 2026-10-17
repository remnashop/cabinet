import { useTranslation } from "react-i18next";

import type { Plan } from "@entities/plan/api";
import { savingsPercent } from "@features/purchase/savings";
import { durationUnit } from "@features/purchase/wizard";
import { formatMoney } from "@shared/lib/format";

import { OptionRow } from "./OptionRow";

/** Prices are shown in the catalog's anchor currency; the method picked next sets the real one. */
export function DurationStep({
  plan,
  currency,
  selected,
  onSelect,
}: {
  plan: Plan;
  currency: string;
  selected: number | null;
  onSelect: (days: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const durations = [...plan.durations].sort((a, b) => a.order_index - b.order_index);
  return (
    <div className="flex flex-col gap-2">
      {durations.map((d) => {
        // a duration sold only in another currency stays pickable; the method step shows its price
        const price = d.prices.find((p) => p.currency === currency) ?? d.prices[0];
        const saving = price ? savingsPercent(plan, d.days, price.currency) : null;
        const { unit, count } = durationUnit(d.days);
        return (
          <OptionRow
            key={d.days}
            selected={selected === d.days}
            disabled={!price}
            onClick={() => onSelect(d.days)}
            aside={price ? formatMoney(price.price, price.currency, i18n.language) : t("purchase.noPrice")}
          >
            <span className="block text-sm font-semibold">{t(`purchase.${unit}`, { count })}</span>
            {saving !== null && (
              <span className="text-[11px] font-semibold text-success">
                {t("purchase.saving", { percent: saving })}
              </span>
            )}
          </OptionRow>
        );
      })}
    </div>
  );
}
