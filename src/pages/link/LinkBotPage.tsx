import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import {
  clearStashedBotLinkToken,
  readBotSignInToken,
  readStashedBotLinkToken,
} from "@features/auth/bot-signin-token";
import { linkApi } from "@features/link-identity/api";
import { getErrorMessage } from "@shared/api/http";
import { Spinner } from "@shared/ui/Spinner";
import { FullScreen } from "@widgets/full-screen/FullScreen";

/** The bot's "link" button lands here (#token=), or back here after /login stashed it; the profile shows the result. */
export function LinkBotPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useMemo(() => readBotSignInToken(window.location.hash) ?? readStashedBotLinkToken(), []);
  const started = useRef(false);

  const exchange = useMutation({
    mutationFn: (value: string) => linkApi.telegramSignin(value),
    onSuccess: (linkResult) => void navigate("/profile", { replace: true, state: { linkResult } }),
  });

  // the token is single-use: StrictMode's second effect run must not resend it,
  // and it leaves the address bar before anything else can read or store it
  const { mutate } = exchange;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void navigate("/link/bot", { replace: true });
    clearStashedBotLinkToken();
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
    <FullScreen>
      <h1 className="text-lg font-bold">{t(exchange.isError ? "link.failed" : "link.botLinkExpired")}</h1>
      <p className="text-sm text-muted-foreground">
        {exchange.isError ? getErrorMessage(exchange.error, t("errors.generic")) : t("link.botLinkElsewhere")}
      </p>
      <Link to="/profile" className="text-sm text-primary">
        {t("link.toProfile")}
      </Link>
    </FullScreen>
  );
}
