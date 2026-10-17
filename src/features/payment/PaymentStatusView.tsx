import { CircleCheck, CircleX, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Spinner } from "@shared/ui/Spinner";

import type { usePaymentStatus } from "./usePaymentStatus";

export function PaymentStatusView({ status, transaction, error, retry }: ReturnType<typeof usePaymentStatus>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const home = (
    <Button variant="outline" className="w-full" onClick={() => void navigate("/", { replace: true })}>
      {t("common.home")}
    </Button>
  );

  if (status === "loading" || status === "pending") {
    return (
      <>
        <Spinner />
        <p className="text-sm text-muted-foreground">{t("payment.waiting")}</p>
      </>
    );
  }
  if (status === "paid") {
    return (
      <>
        <CircleCheck className="size-12 text-success" />
        <h1 className="text-xl font-semibold">{t("payment.paid", { plan: transaction?.plan_name ?? "" })}</h1>
        <Button
          variant="solid"
          className="w-full"
          onClick={() => {
            haptic();
            void navigate("/", { replace: true });
          }}
        >
          {t("payment.connect")}
        </Button>
      </>
    );
  }
  if (status === "failed") {
    return (
      <>
        <CircleX className="size-12 text-error" />
        <h1 className="text-xl font-semibold">{t("payment.failed")}</h1>
        <Button variant="solid" className="w-full" onClick={() => void navigate("/purchase", { replace: true })}>
          {t("payment.retry")}
        </Button>
        {home}
      </>
    );
  }
  if (status === "error") {
    return (
      <>
        <CircleX className="size-12 text-error" />
        <p className="text-sm text-muted-foreground">{getErrorMessage(error, t("errors.generic"))}</p>
        {home}
      </>
    );
  }
  return (
    <>
      <Clock className="size-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t("payment.timeout")}</p>
      <Button variant="solid" className="w-full" onClick={retry}>
        {t("payment.checkAgain")}
      </Button>
      {home}
    </>
  );
}
