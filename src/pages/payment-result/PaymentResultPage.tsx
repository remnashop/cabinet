import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { PaymentStatusView } from "@features/payment/PaymentStatusView";
import { usePaymentStatus } from "@features/payment/usePaymentStatus";
import { FullScreen } from "@widgets/full-screen/FullScreen";

export function PaymentResultPage() {
  const { t } = useTranslation();
  const raw = Number(useSearchParams()[0].get("order_id"));
  const orderId = Number.isInteger(raw) && raw > 0 ? raw : null;
  const payment = usePaymentStatus(orderId);
  return (
    <FullScreen>
      {orderId === null ? (
        <Link to="/" className="text-sm text-primary">
          {t("common.home")}
        </Link>
      ) : (
        <PaymentStatusView {...payment} />
      )}
    </FullScreen>
  );
}
