import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { authApi, completeLogin } from "@features/auth/api";
import { readBotSignInToken, takeBotLegal } from "@features/auth/bot-signin-token";
import { getErrorMessage } from "@shared/api/http";
import { getAccessToken } from "@shared/api/tokens";
import { INTRO_STATE } from "@shared/lib/intro";
import { Spinner } from "@shared/ui/Spinner";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { FullScreen, FullScreenMessage } from "@widgets/full-screen/FullScreen";

export function BotSignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useMemo(() => readBotSignInToken(window.location.hash), []);
  const started = useRef(false);

  const exchange = useMutation({
    mutationFn: (value: string) => authApi.botSignin(value, takeBotLegal()),
    onSuccess: (accessToken) => {
      completeLogin(accessToken);
      void navigate("/", { replace: true, state: INTRO_STATE });
    },
  });

  // the token is single-use; StrictMode's second effect run must not resend it,
  // and it must leave the address bar before anything else can read or store it
  const { mutate } = exchange; // stable across renders, unlike the result object
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // already signed in: the bearer would make a stale link's 401 look like an expired
    // session and sign the user out (and a forged link could swap it) - skip the exchange
    if (getAccessToken()) {
      void navigate("/", { replace: true });
      return;
    }
    void navigate("/login/bot", { replace: true });
    if (token) mutate(token);
  }, [token, mutate, navigate]);

  if (token && !exchange.isError) {
    return (
      <FullScreen>
        <Spinner />
      </FullScreen>
    );
  }
  return (
    // a failed exchange has its own reason (blocked, rate-limited, expired...); only a
    // missing token is plainly an expired link
    <FullScreenMessage
      tone={exchange.isError ? "error" : "warning"}
      title={t(exchange.isError ? "auth.bootFailed" : "auth.botLinkExpired")}
      text={exchange.isError ? getErrorMessage(exchange.error, t("errors.generic")) : null}
    >
      <ButtonLink to="/login" variant="outline" size="lg" className="w-full">
        {t("auth.backToLogin")}
      </ButtonLink>
    </FullScreenMessage>
  );
}
