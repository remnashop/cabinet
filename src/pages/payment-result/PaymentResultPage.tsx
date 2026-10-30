import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { PaymentStatusView } from "@features/payment/PaymentStatusView";
import { usePaymentStatus } from "@features/payment/usePaymentStatus";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { FullScreen, FullScreenMessage } from "@widgets/full-screen/FullScreen";

export function PaymentResultPage() {
  const { t } = useTranslation();
  const raw = Number(useSearchParams()[0].get("order_id"));
  const orderId = Number.isInteger(raw) && raw > 0 ? raw : null;
  const payment = usePaymentStatus(orderId);
  if (orderId === null) {
    return (
      <FullScreenMessage icon={TriangleAlert} title={t("payment.noOrderTitle")} text={t("payment.noOrderText")}>
        <div className="flex w-full flex-col gap-2">
          <ButtonLink to="/profile/payments" replace variant="solid" className="w-full">
            {t("pages.payments")}
          </ButtonLink>
          <ButtonLink to="/" replace variant="outline" className="w-full">
            {t("common.home")}
          </ButtonLink>
        </div>
      </FullScreenMessage>
    );
  }
  return (
    <FullScreen>
      <PaymentStatusView {...payment} />
    </FullScreen>
  );
}
