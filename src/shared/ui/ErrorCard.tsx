import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-muted-foreground">{t("common.loadFailed")}</p>
      <Button variant="outline" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </Card>
  );
}
