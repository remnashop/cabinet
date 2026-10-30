import { Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Plan } from "@entities/plan/api";
import { formatDate } from "@shared/lib/format";
import { NotePill } from "@shared/ui/NotePill";

export function PromoNote({ plan }: { plan: Plan }) {
  const { t, i18n } = useTranslation();
  if (!plan.discount_percent) return null;
  return (
    <NotePill icon={Tag} tone="primary">
      {plan.discount_ends_at
        ? t("purchase.promoNoteUntil", {
            percent: plan.discount_percent,
            date: formatDate(plan.discount_ends_at, i18n.language),
          })
        : t("purchase.promoNote", { percent: plan.discount_percent })}
    </NotePill>
  );
}
