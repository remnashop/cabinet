import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { getErrorMessage } from "@shared/api/http";
import { Button } from "@shared/ui/Button";

import { usePaymentStatus } from "./usePaymentStatus";

/** The pay button while the Mini App's order is paid beside it: it polls the order. Paid: on to the result screen;
 *  failed, timed out or unknown: back to paying, saying why; a tap stops waiting, to pay again. Mounted per order, so
 *  each wait starts fresh. */
export function AwaitPaymentButton({ orderId, onStop }: { orderId: number; onStop: (reason: string | null) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, transaction, error } = usePaymentStatus(orderId);

  useEffect(() => {
    if (status === "paid") void navigate(`/payment/result?order_id=${orderId}`, { replace: true });
    else if (status === "failed") onStop(t(transaction?.status === "CANCELED" ? "payment.canceledTitle" : "payment.failed"));
    else if (status === "timeout") onStop(t("payment.timeoutTitle"));
    else if (status === "error") onStop(getErrorMessage(error, t("errors.generic")));
  }, [status, transaction, error, orderId, navigate, onStop, t]);

  return (
    <Button variant="glass" size="lg" onClick={() => onStop(null)}>
      <Loader2 className="size-5 motion-safe:animate-spin" />
      {t("payment.waitingButton")}
    </Button>
  );
}
