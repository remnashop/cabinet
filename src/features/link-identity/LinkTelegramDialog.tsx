import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Modal } from "@shared/ui/Modal";
import { Spinner } from "@shared/ui/Spinner";
import { ErrorCard } from "@shared/ui/ErrorCard";

import { BotLinkActions } from "@features/auth/ui/BotLinkActions";

import { linkApi } from "./api";

// The bot answers with a button to /link/bot#token=, which finishes the link in the browser it opens.
function TelegramLinkBody({ onClose }: { onClose: () => void }) {
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
    return <ErrorCard error={request.error} onRetry={() => mutate()} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/80">{t("link.botHint")}</p>
      {request.data ? (
        <BotLinkActions url={request.data.bot_url} renewing={request.isPending} onRenew={() => mutate()} onCancel={onClose} />
      ) : (
        <Spinner />
      )}
    </div>
  );
}

export function LinkTelegramDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal narrow icon={Send} open={open} onClose={onClose} title={t("link.telegramTitle")}>
      <TelegramLinkBody onClose={onClose} />
    </Modal>
  );
}
