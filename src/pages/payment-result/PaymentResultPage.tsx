import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { FullScreen } from "@widgets/full-screen/FullScreen";

export function PaymentResultPage() {
  const { t } = useTranslation();
  return (
    <FullScreen>
      <h1 className="text-xl font-semibold">{t("pages.paymentResult")}</h1>
      <p className="text-sm text-muted-foreground">{t("pages.comingSoon")}</p>
      <Link to="/" className="text-sm text-primary">
        {t("common.home")}
      </Link>
    </FullScreen>
  );
}
