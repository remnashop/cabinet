import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { authApi, completeLogin } from "@features/auth/api";
import { EmailLogin } from "@features/auth/ui/EmailLogin";
import { OAuthButtons } from "@features/auth/ui/OAuthButtons";
import { TelegramBotLogin } from "@features/auth/ui/TelegramBotLogin";
import { getErrorMessage } from "@shared/api/http";
import { getInitDataRaw, isMiniApp } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Spinner } from "@shared/ui/Spinner";
import { FullScreen } from "@widgets/full-screen/FullScreen";

// In a Mini App the session normally starts on the splash; this screen shows
// only after a sign-out or an expired session, with a one-tap way back in.
function MiniAppLogin() {
  const { t } = useTranslation();
  const login = useMutation({
    mutationFn: () => authApi.telegram(getInitDataRaw() ?? ""),
    onSuccess: completeLogin,
  });
  return (
    <>
      <Button variant="solid" className="w-full" disabled={login.isPending} onClick={() => login.mutate()}>
        {t("auth.telegram")}
      </Button>
      {login.isError && <p className="text-sm text-error">{getErrorMessage(login.error, t("errors.generic"))}</p>}
    </>
  );
}

function BrowserLogin() {
  const { t } = useTranslation();
  const methods = useQuery({ queryKey: ["auth-methods"], queryFn: authApi.methods });

  if (methods.isPending) return <Spinner size="card" />;
  if (methods.isError) {
    return (
      <>
        <p className="text-sm text-error">{getErrorMessage(methods.error, t("errors.generic"))}</p>
        <Button variant="outline" onClick={() => void methods.refetch()}>
          {t("common.retry")}
        </Button>
      </>
    );
  }
  const { oauth, email, telegram_deeplink } = methods.data;
  if (!oauth.length && !email && !telegram_deeplink) {
    return <p className="text-sm text-muted-foreground">{t("auth.unavailable")}</p>;
  }
  return (
    <>
      {oauth.length > 0 && <OAuthButtons providers={oauth} />}
      {/* the bot leads when there's no Telegram OIDC to sit above it */}
      {telegram_deeplink && <TelegramBotLogin primary={!oauth.includes("telegram")} />}
      {(oauth.length > 0 || telegram_deeplink) && email && (
        <div className="flex w-full items-center gap-3 text-xs uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("auth.or")}
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      {email && <EmailLogin />}
    </>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  return (
    <FullScreen>
      <div>
        <h1 className="text-2xl font-semibold">{t("auth.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
      </div>
      {isMiniApp() ? <MiniAppLogin /> : <BrowserLogin />}
    </FullScreen>
  );
}
