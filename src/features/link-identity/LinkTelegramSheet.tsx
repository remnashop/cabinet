import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { getErrorMessage } from "@shared/api/http";
import { telegramLink } from "@shared/lib/safe-redirect";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { Spinner } from "@shared/ui/Spinner";

import { linkApi } from "./api";

// The bot answers with a button to /link/bot#token=, which finishes the link in the browser it opens.
function TelegramLinkBody() {
  const { t } = useTranslation();
  const request = useMutation({ mutationFn: linkApi.telegramDeeplink });
  const { mutate } = request;
  // one start link per opening, even under StrictMode's double effect
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  if (request.isError) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-error">{getErrorMessage(request.error, t("errors.generic"))}</p>
        <Button variant="outline" className="w-full" onClick={() => mutate()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (!request.data) return <Spinner />;
  return (
    <div className="flex flex-col gap-2">
      {/* a link, not window.open: after an await browsers block a scripted popup and iOS won't hand it to the app */}
      <a
        href={telegramLink(request.data.bot_url)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        {t("auth.openBot")}
      </a>
      <p className="text-center text-sm text-muted-foreground">{t("link.botHint")}</p>
      {/* the start link lives 5 minutes */}
      <Button variant="outline" className="w-full" disabled={request.isPending} onClick={() => mutate()}>
        {t("auth.newBotLink")}
      </Button>
    </div>
  );
}

export function LinkTelegramSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <BottomSheet open={open} onClose={onClose} title={t("link.telegramTitle")}>
      <TelegramLinkBody />
    </BottomSheet>
  );
}
