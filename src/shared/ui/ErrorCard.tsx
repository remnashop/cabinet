import { useTranslation } from "react-i18next";

import { getErrorMessage } from "@shared/api/http";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";

/** text: what went wrong, when it says more than "failed to load"; error: the failure, said by its code when it has one;
 *  round: the home page's corners, beside its blocks */
export function ErrorCard({
  text,
  error,
  round,
  onRetry,
}: {
  text?: string;
  error?: unknown;
  round?: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card round={round} className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-muted-foreground">
        {text ?? getErrorMessage(error, t("common.loadFailed"))}
      </p>
      <Button variant="outline" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </Card>
  );
}
