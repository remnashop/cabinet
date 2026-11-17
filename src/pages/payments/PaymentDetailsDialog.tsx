import { CalendarDays, CreditCard, Package, Percent, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GATEWAY_LOGOS } from "@entities/plan/gateway-logos";
import { PlanIcon } from "@entities/plan/PlanIcon";
import type { Transaction } from "@entities/transaction/api";
import { durationLabel, gatewayLabel } from "@features/purchase/wizard";
import { formatDateTime, formatMoney } from "@shared/lib/format";
import { Badge } from "@shared/ui/Badge";
import { Modal } from "@shared/ui/Modal";
import { Card } from "@shared/ui/Card";
import { InfoRow } from "@shared/ui/InfoRow";
import { KpiTile } from "@shared/ui/KpiTile";

import { discountParts, hasDiscount, priceBeforeDiscounts } from "./discount";
import { STATUS_TONE } from "./status-tone";

export function PaymentDetailsDialog({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const tx = transaction;
  const discounted = tx !== null && hasDiscount(tx);
  return (
    <Modal
      narrow
      cards
      icon={Receipt}
      open={!!tx}
      onClose={onClose}
      title={t("payments.detailsTitle", { id: tx?.id })}
    >
      {tx && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label={t("payments.amount")}
              value={formatMoney(tx.final_price, tx.currency, i18n.language)}
              valueSuffix={discounted && <s>{formatMoney(priceBeforeDiscounts(tx), tx.currency, i18n.language)}</s>}
              hint={<Badge tone={STATUS_TONE[tx.status]}>{t(`payments.statuses.${tx.status}`)}</Badge>}
            />
            <KpiTile
              label={t("payments.duration")}
              value={durationLabel(tx.duration_days, t)}
              // neutral: the colour beside it is the status's
              hint={<Badge tone="neutral">{t(`payments.types.${tx.purchase_type}`)}</Badge>}
            />
          </div>
          <Card variant="list">
            <InfoRow
              icon={Package}
              label={t("payments.plan")}
              value={
                <>
                  <PlanIcon id={tx.plan_icon_emoji_id} glyph={tx.plan_icon_emoji_fallback} className="size-4 shrink-0" fallback={null} />
                  <span className="truncate">{tx.plan_name}</span>
                </>
              }
            />
            {/* a row a discount: two of them don't fit one row's value */}
            {discountParts(tx, t).map(([label, percent]) => (
              <InfoRow key={label} icon={Percent} label={label} value={<span className="text-success">−{percent}%</span>} />
            ))}
            <InfoRow
              icon={CreditCard}
              label={t("payments.method")}
              value={
                <>
                  {tx.gateway_type && GATEWAY_LOGOS[tx.gateway_type] && (
                    <img src={GATEWAY_LOGOS[tx.gateway_type]} alt="" draggable={false} className="size-4 shrink-0 object-contain" />
                  )}
                  <span className="truncate">{gatewayLabel(tx.gateway_type, t)}</span>
                </>
              }
            />
            {tx.created_at && (
              <InfoRow icon={CalendarDays} label={t("payments.date")} value={formatDateTime(tx.created_at, i18n.language)} />
            )}
          </Card>
        </div>
      )}
    </Modal>
  );
}
