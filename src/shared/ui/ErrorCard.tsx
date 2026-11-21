import { useTranslation } from "react-i18next";

import { CloudOff, ServerCrash } from "lucide-react";

import { getErrorMessage, NetworkError } from "@shared/api/http";
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
  if (round && !text) {
    const reason = getErrorMessage(error, t("common.loadFailed"));
    const Icon = error instanceof NetworkError ? CloudOff : ServerCrash;
    return (
      <Card round className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-error/40 bg-error/15 text-error">
          <Icon className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-bold text-foreground">{t("common.loadFailed")}</p>
          <p className="text-sm text-muted-foreground">{reason === t("common.loadFailed") ? t("errors.retryLater") : reason}</p>
        </div>
        <Button variant="glassSolid" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </Card>
    );
  }
  return (
    <Card round={round} className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-muted-foreground">
        {text ?? getErrorMessage(error, t("common.loadFailed"))}
      </p>
      <Button variant="glass" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </Card>
  );
}
