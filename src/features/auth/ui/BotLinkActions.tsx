import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { telegramLink } from "@shared/lib/safe-redirect";
import { DialogFooter } from "@shared/ui/Modal";
import { Button } from "@shared/ui/Button";
import { ButtonLink } from "@shared/ui/ButtonLink";

/** The bot's start link as a button, then a fresh one: it lives 5 minutes. hint: between the two. onCancel: in a
 *  dialog, closes it; the link then goes to its footer beside cancel (DialogFooter), the fresh one stays in the body. */
export function BotLinkActions({
  url,
  renewing,
  onRenew,
  hint,
  onCancel,
}: {
  url: string;
  renewing: boolean;
  onRenew: () => void;
  hint?: ReactNode;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  // a link, not window.open: after an await browsers block a scripted popup and iOS won't hand it to the app
  const link = { href: telegramLink(url), target: "_blank", rel: "noopener noreferrer" };
  if (onCancel) {
    return (
      <>
        <Button variant="glass" size="sm" className="self-start" disabled={renewing} onClick={onRenew}>
          {t("auth.newBotLink")}
        </Button>
        <DialogFooter>
          <Button variant="glass" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <ButtonLink {...link} variant="glassAccent">
            <Send className="size-4" />
            {t("auth.openBot")}
          </ButtonLink>
        </DialogFooter>
      </>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <ButtonLink {...link} variant="glassSolid" className="w-full">
        <Send className="size-4" />
        {t("auth.openBot")}
      </ButtonLink>
      {hint}
      <Button variant="glass" className="w-full" disabled={renewing} onClick={onRenew}>
        {t("auth.newBotLink")}
      </Button>
    </div>
  );
}
