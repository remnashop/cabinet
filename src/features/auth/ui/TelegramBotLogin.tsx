import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useShownLegalLocale } from "@entities/legal/api";
import { authApi } from "@features/auth/api";
import { rememberBotLegal } from "@features/auth/bot-signin-token";
import { BotLinkActions } from "@features/auth/ui/BotLinkActions";
import { PROVIDER_ICONS } from "@features/auth/ui/provider-icons";
import { getErrorMessage } from "@shared/api/http";
import { Button } from "@shared/ui/Button";
import { FormError } from "@shared/ui/FormError";

// The bot answers with a one-time sign-in button; the session starts wherever that button
// opens, so this tab only hands the user over and waits for nothing.
export function TelegramBotLogin() {
  const { t } = useTranslation();
  const legal = useShownLegalLocale();
  const request = useMutation({
    mutationFn: () => {
      // the sign-in itself happens in the tab the bot's button opens: the notice's locale waits for it
      rememberBotLegal(legal);
      return authApi.deeplink();
    },
  });

  if (request.isSuccess) {
    return (
      <BotLinkActions
        url={request.data.bot_url}
        renewing={request.isPending}
        onRenew={() => request.mutate()}
        hint={<p className="text-center text-sm text-muted-foreground">{t("auth.botHint")}</p>}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button variant="outline" className="w-full" disabled={request.isPending} onClick={() => request.mutate()}>
        {PROVIDER_ICONS.telegram}
        {t("auth.botLogin")}
      </Button>
      {request.isError && <FormError>{getErrorMessage(request.error, t("errors.generic"))}</FormError>}
    </div>
  );
}
