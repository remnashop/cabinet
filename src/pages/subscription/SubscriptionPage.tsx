import { useTranslation } from "react-i18next";

import { Card } from "@shared/ui/Card";
import { PageHeader } from "@widgets/page-header/PageHeader";

export function SubscriptionPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("pages.subscription")} />
      <Card className="text-sm text-muted-foreground">{t("pages.comingSoon")}</Card>
    </>
  );
}
