import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { authApi, completeLogin } from "@features/auth/api";
import { readOAuthLegal, readOAuthState, takeOAuthNext } from "@features/auth/oauth-redirect";
import { linkApi } from "@features/link-identity/api";
import { takeOAuthLink } from "@shared/lib/oauth-link-marker";
import { getErrorMessage } from "@shared/api/http";
import { INTRO_STATE } from "@shared/lib/intro";
import { parseOAuthCallback } from "@shared/lib/oauth-callback";
import { Spinner } from "@shared/ui/Spinner";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { FullScreen, FullScreenMessage } from "@widgets/full-screen/FullScreen";

export function LoginCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { provider = "" } = useParams();
  const parsed = useMemo(() => parseOAuthCallback(window.location.search, readOAuthState()), []);
  // the profile's "connect" comes back here too; null until the effect has taken the marker
  const [linking, setLinking] = useState<boolean | null>(null);
  const started = useRef(false);

  const exchange = useMutation({
    mutationFn: async ({ code, state, link }: { code: string; state: string; link: boolean }) => {
      if (link) {
        const linkResult = await linkApi.oauthCallback(provider, code, state);
        // the route's provider is the method: google -> GOOGLE
        void navigate(takeOAuthNext(), { replace: true, state: { linkResult, linkKind: provider.toUpperCase() } });
      } else {
        completeLogin(await authApi.oauthCallback(provider, code, state, readOAuthLegal()));
        void navigate(takeOAuthNext(), { replace: true, state: INTRO_STATE });
      }
    },
  });

  // the code is single-use: StrictMode's second effect run must not resend it
  const { mutate } = exchange; // stable across renders, unlike the result object
  // the marker is taken (and erased) here, once: a render may be thrown away (Suspense, StrictMode)
  // and must not spend it; a cancelled or broken callback erases it too
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const link = takeOAuthLink(provider);
    setLinking(link);
    if (parsed.ok) mutate({ code: parsed.code, state: parsed.state, link });
  }, [parsed, mutate, provider]);

  if (linking === null || (parsed.ok && !exchange.isError)) {
    return (
      <FullScreen>
        <Spinner />
      </FullScreen>
    );
  }
  return (
    <FullScreenMessage
      tone="error"
      title={t(linking ? "link.failed" : "auth.callbackFailed")}
      text={exchange.isError ? getErrorMessage(exchange.error, t("errors.generic")) : null}
    >
      <ButtonLink to={linking ? "/profile" : "/login"} variant="outline" size="lg" className="w-full">
        {t(linking ? "link.toProfile" : "auth.backToLogin")}
      </ButtonLink>
    </FullScreenMessage>
  );
}
