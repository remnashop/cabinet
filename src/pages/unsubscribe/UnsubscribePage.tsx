import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { apiPost, getErrorMessage } from "@shared/api/http";
import { Button } from "@shared/ui/Button";
import { FullScreen } from "@widgets/full-screen/FullScreen";

function unsubscribe(token: string): Promise<null> {
  return apiPost<null, undefined>(`/unsubscribe?token=${encodeURIComponent(token)}`, undefined);
}

export function UnsubscribePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), []);
  const action = useMutation({ mutationFn: unsubscribe });

  // the token is a standing unsubscribe credential: keep it out of history and referrers
  useEffect(() => {
    void navigate("/unsubscribe", { replace: true });
  }, [navigate]);

  let title: string;
  let text: string | null = null;
  if (!token) {
    title = t("apiErrors.UNSUBSCRIBE_TOKEN_INVALID");
  } else if (action.isSuccess) {
    title = t("unsubscribe.done");
    text = t("unsubscribe.hint");
  } else if (action.isError) {
    title = t("unsubscribe.failed");
    text = getErrorMessage(action.error, t("errors.generic"));
  } else {
    title = t("unsubscribe.title");
    text = t("unsubscribe.hint");
  }

  // a scanner opening the link runs no click: only a person unsubscribes
  const canSubmit = token !== null && !action.isSuccess;

  return (
    <FullScreen>
      <h1 className="text-xl font-semibold">{title}</h1>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      {canSubmit && (
        <Button variant="solid" disabled={action.isPending} onClick={() => action.mutate(token)}>
          {action.isError ? t("common.retry") : t("unsubscribe.confirm")}
        </Button>
      )}
      <Link to="/" className="text-sm text-primary">
        {t("common.home")}
      </Link>
    </FullScreen>
  );
}
