import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { apiPost, getErrorMessage } from "@shared/api/http";
import { Button } from "@shared/ui/Button";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { FullScreenMessage } from "@widgets/full-screen/FullScreen";

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
    <FullScreenMessage tone={!token ? "warning" : action.isError ? "error" : undefined} title={title} text={text}>
      <div className="flex w-full flex-col gap-2">
        {canSubmit && (
          <Button variant="solid" size="lg" disabled={action.isPending} onClick={() => action.mutate(token)}>
            {action.isError ? t("common.retry") : t("unsubscribe.confirm")}
          </Button>
        )}
        <ButtonLink to="/" variant="outline" size="lg">
          {t("common.home")}
        </ButtonLink>
      </div>
    </FullScreenMessage>
  );
}
