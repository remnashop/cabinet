import { useTranslation } from "react-i18next";

import { CloudOff, RotateCw, ServerCrash } from "lucide-react";

import { getErrorMessage, NetworkError } from "@shared/api/http";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";

/** text: what went wrong, when it says more than "failed to load"; error: the failure, said by its code when it has one;
 *  round: a page's content, said as a message screen without a card; block: one block of a page, the same message
 *  without the screen's height; popover: the same, sized for a popover's narrow glass */
export function ErrorCard({
  text,
  error,
  round,
  block,
  popover,
  onRetry,
}: {
  text?: string;
  error?: unknown;
  round?: boolean;
  block?: boolean;
  popover?: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (round && !text) {
    const reason = getErrorMessage(error, t("common.loadFailed"));
    const Icon = error instanceof NetworkError ? CloudOff : ServerCrash;
    const hint = reason === t("common.loadFailed") ? t("errors.retryLater") : reason;
    if (popover) {
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-full border border-error/40 bg-error/15 text-error">
            <Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-foreground">{t("common.loadFailed")}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <Button variant="glass" onClick={onRetry}>
            <RotateCw className="size-4" />
            {t("common.retry")}
          </Button>
        </div>
      );
    }
    const height = block
      ? "px-5 py-8"
      : "min-h-[calc(var(--tg-viewport-stable-height,100dvh)-168px-var(--safe-top)-var(--safe-bottom))] lg:min-h-[calc(100dvh-148px)]";
    return (
      <div className={`flex flex-col items-center justify-center gap-3 text-center ${height}`}>
        <span className="flex size-16 items-center justify-center rounded-full border border-error/40 bg-error/15 text-error">
          <Icon className="size-8" />
        </span>
        <div className="flex max-w-sm flex-col gap-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{t("common.loadFailed")}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <Button variant="glassSolid" size="lg" className="mt-1 w-full max-w-sm" onClick={onRetry}>
          <RotateCw className="size-5" />
          {t("common.retry")}
        </Button>
      </div>
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
