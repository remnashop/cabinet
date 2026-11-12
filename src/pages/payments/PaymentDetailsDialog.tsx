import { CalendarDays, CreditCard, Package, Percent, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Transaction } from "@entities/transaction/api";
import { durationLabel, gatewayLabel } from "@features/purchase/wizard";
import { formatDateTime, formatMoney } from "@shared/lib/format";
import { Badge } from "@shared/ui/Badge";
import { Modal } from "@shared/ui/Modal";
import { Card } from "@shared/ui/Card";
import { InfoRow } from "@shared/ui/InfoRow";
import { KpiTile } from "@shared/ui/KpiTile";

import { discountParts, hasDiscount } from "./discount";
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
              valueSuffix={discounted && <s>{formatMoney(tx.base_price, tx.currency, i18n.language)}</s>}
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
            <InfoRow icon={Package} label={t("payments.plan")} value={tx.plan_name} />
            {/* a row a discount: two of them don't fit one row's value */}
            {discountParts(tx, t).map(([label, percent]) => (
              <InfoRow key={label} icon={Percent} label={label} value={<span className="text-success">−{percent}%</span>} />
            ))}
            <InfoRow icon={CreditCard} label={t("payments.method")} value={gatewayLabel(tx.gateway_type, t)} />
            {tx.created_at && (
              <InfoRow icon={CalendarDays} label={t("payments.date")} value={formatDateTime(tx.created_at, i18n.language)} />
            )}
          </Card>
        </div>
      )}
    </Modal>
  );
}
