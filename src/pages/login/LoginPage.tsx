import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BrandMark } from "@entities/appearance/BrandMark";
import { useShownLegalLocale } from "@entities/legal/api";
import { LegalNotice } from "@entities/legal/LegalNotice";
import { authApi, completeLogin, useAuthMethodsQuery } from "@features/auth/api";
import { EmailLogin } from "@features/auth/ui/EmailLogin";
import { OAuthButtons } from "@features/auth/ui/OAuthButtons";
import { TelegramBotLogin } from "@features/auth/ui/TelegramBotLogin";
import { getErrorMessage } from "@shared/api/http";
import { wasSessionExpired } from "@shared/api/tokens";
import { getInitDataRaw, isMiniApp, openExternal } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { FormError } from "@shared/ui/FormError";
import { Spinner } from "@shared/ui/Spinner";
import { FullScreen } from "@widgets/full-screen/FullScreen";

// In a Mini App the session normally starts on the splash; this screen shows
// only after a sign-out or an expired session, with a one-tap way back in.
function MiniAppLogin({ heading }: { heading: ReactNode }) {
  const { t } = useTranslation();
  const legal = useShownLegalLocale();
  const login = useMutation({
    mutationFn: () => authApi.telegram(getInitDataRaw() ?? "", legal),
    onSuccess: completeLogin,
  });
  return (
    <>
      {heading}
      <Button variant="solid" className="w-full" disabled={login.isPending} onClick={() => login.mutate()}>
        {t("auth.telegram")}
      </Button>
      {login.isError && <FormError>{getErrorMessage(login.error, t("errors.generic"))}</FormError>}
      <LegalNotice kinds={["USER_AGREEMENT", "PRIVACY_POLICY"]} message="loginNotice" />
    </>
  );
}

function BrowserLogin({ heading }: { heading: ReactNode }) {
  const { t } = useTranslation();
  const methods = useAuthMethodsQuery();

  if (methods.isPending) return <Spinner size="card" />;
  if (methods.isError && !methods.data) {
    return (
      <>
        {heading}
        <ErrorCard error={methods.error} onRetry={() => void methods.refetch()} />
      </>
    );
  }
  const { oauth, email, telegram_deeplink, telegram_webapp, bot_username, captcha } = methods.data;
  // no way in: no title inviting to sign in, only the lines saying so
  if (!oauth.length && !email && !telegram_deeplink) {
    // Mini App only: the bot is the way in
    if (telegram_webapp && bot_username) {
      return (
        <>
          <div className="mb-2">
            <h1 className="text-xl font-bold tracking-tight">{t("auth.miniAppOnly")}</h1>
            <p className="mt-2.5 text-sm text-muted-foreground">{t("auth.miniAppOnlyHint")}</p>
          </div>
          <Button variant="solid" className="w-full" onClick={() => openExternal(`https://t.me/${bot_username}`)}>
            {/* the plane alone, in the button's text color */}
            <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor" aria-hidden>
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
            {t("auth.openBot")}
          </Button>
        </>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-foreground">{t("auth.unavailable")}</p>
        <p className="text-sm text-muted-foreground">{t("auth.unavailableHint")}</p>
      </div>
    );
  }
  return (
    <>
      {heading}
      {/* one group, the OAuth buttons' 8px between them, not the screen's 16px; the bot leads when there's no
          Telegram OIDC to sit above it */}
      {(oauth.length > 0 || telegram_deeplink) && (
        <div className="flex w-full flex-col gap-2">
          {oauth.length > 0 && <OAuthButtons providers={oauth} />}
          {telegram_deeplink && <TelegramBotLogin />}
        </div>
      )}
      {(oauth.length > 0 || telegram_deeplink) && email && (
        <div className="flex w-full items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("auth.or")}
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      {email && <EmailLogin captcha={captcha ?? null} />}
      {/* what signing in accepts: under the ways in, gone with them */}
      <LegalNotice kinds={["USER_AGREEMENT", "PRIVACY_POLICY"]} message="loginNotice" />
    </>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const heading = (
    <div className="mb-2">
      <h1 className="text-xl font-bold tracking-tight">{t("auth.title")}</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
      {wasSessionExpired() && <p className="mt-2 text-xs text-muted-foreground">{t("auth.sessionExpired")}</p>}
    </div>
  );
  return (
    <FullScreen>
      <BrandMark className="size-14 text-primary" />
      {isMiniApp() ? <MiniAppLogin heading={heading} /> : <BrowserLogin heading={heading} />}
    </FullScreen>
  );
}
