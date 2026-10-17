import { useTranslation } from "react-i18next";

import type { Transaction } from "@entities/transaction/api";
import { durationUnit, gatewayLabel } from "@features/purchase/wizard";
import { formatDate, formatMoney } from "@shared/lib/format";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { InfoRow } from "@shared/ui/InfoRow";

import { STATUS_COLOR } from "./status-color";

export function PaymentDetailsSheet({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const tx = transaction;
  const duration = tx ? durationUnit(tx.duration_days) : null;
  return (
    <BottomSheet open={!!tx} onClose={onClose} title={t("payments.detailsTitle", { id: tx?.id })}>
      {tx && duration && (
        <div className="-mx-1.5 flex flex-col">
          <InfoRow label={t("payments.plan")} value={tx.plan_name} />
          <InfoRow label={t("payments.duration")} value={t(`purchase.${duration.unit}`, { count: duration.count })} />
          <InfoRow label={t("payments.type")} value={t(`payments.types.${tx.purchase_type}`)} />
          <InfoRow label={t("payments.method")} value={gatewayLabel(tx.gateway_type)} />
          <InfoRow label={t("payments.amount")} value={formatMoney(tx.final_price, tx.currency, i18n.language)} />
          {tx.created_at && <InfoRow label={t("payments.date")} value={formatDate(tx.created_at, i18n.language)} />}
          <InfoRow
            label={t("payments.status")}
            value={<span className={STATUS_COLOR[tx.status]}>{t(`payments.statuses.${tx.status}`)}</span>}
          />
        </div>
      )}
    </BottomSheet>
  );
}
