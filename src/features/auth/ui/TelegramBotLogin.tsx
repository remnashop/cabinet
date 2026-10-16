import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { authApi } from "@features/auth/api";
import { getErrorMessage } from "@shared/api/http";
import { Button } from "@shared/ui/Button";

// The bot answers with a one-time sign-in button; the session starts wherever that button
// opens, so this tab only hands the user over and waits for nothing.
export function TelegramBotLogin({ primary }: { primary: boolean }) {
  const { t } = useTranslation();
  const request = useMutation({ mutationFn: () => authApi.deeplink() });

  if (request.isSuccess) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
        {/* a link, not location.assign: after an await iOS won't hand a scripted jump to the app */}
        <a
          href={request.data.bot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {t("auth.openBot")}
        </a>
        <p className="text-center text-sm text-muted-foreground">{t("auth.botHint")}</p>
        {/* the start link lives 5 minutes; a fresh one shouldn't need a page reload */}
        <Button variant="outline" className="w-full" disabled={request.isPending} onClick={() => request.mutate()}>
          {t("auth.newBotLink")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        variant={primary ? "solid" : "outline"}
        className="w-full"
        disabled={request.isPending}
        onClick={() => request.mutate()}
      >
        {t("auth.botLogin")}
      </Button>
      {request.isError && <p className="text-sm text-error">{getErrorMessage(request.error, t("errors.generic"))}</p>}
    </div>
  );
}
