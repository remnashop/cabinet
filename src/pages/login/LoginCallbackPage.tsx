import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

import { authApi, completeLogin } from "@features/auth/api";
import { readOAuthState, takeOAuthNext } from "@features/auth/oauth-redirect";
import { getErrorMessage } from "@shared/api/http";
import { parseOAuthCallback } from "@shared/lib/oauth-callback";
import { Spinner } from "@shared/ui/Spinner";
import { FullScreen } from "@widgets/full-screen/FullScreen";

export function LoginCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { provider = "" } = useParams();
  const parsed = useMemo(() => parseOAuthCallback(window.location.search, readOAuthState()), []);
  const started = useRef(false);

  const exchange = useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) => authApi.oauthCallback(provider, code, state),
    onSuccess: (tokens) => {
      completeLogin(tokens);
      void navigate(takeOAuthNext(), { replace: true });
    },
  });

  // the code is single-use: StrictMode's second effect run must not resend it
  const { mutate } = exchange; // stable across renders, unlike the result object
  useEffect(() => {
    if (started.current || !parsed.ok) return;
    started.current = true;
    mutate({ code: parsed.code, state: parsed.state });
  }, [parsed, mutate]);

  if (parsed.ok && !exchange.isError) {
    return (
      <FullScreen>
        <Spinner />
      </FullScreen>
    );
  }
  return (
    <FullScreen>
      <h1 className="text-xl font-semibold">{t("auth.callbackFailed")}</h1>
      {exchange.isError && (
        <p className="text-sm text-muted-foreground">{getErrorMessage(exchange.error, t("errors.generic"))}</p>
      )}
      <Link to="/login" className="text-sm text-primary">
        {t("auth.backToLogin")}
      </Link>
    </FullScreen>
  );
}
