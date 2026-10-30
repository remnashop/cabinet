import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { telegramLink } from "@shared/lib/safe-redirect";
import { Button } from "@shared/ui/Button";
import type { ButtonVariant } from "@shared/ui/button-class";
import { ButtonLink } from "@shared/ui/ButtonLink";

/** The bot's start link as a button, then a fresh one: it lives 5 minutes. hint: between the two; primary: the
 *  link's look, accent inside a dialog. */
export function BotLinkActions({
  url,
  renewing,
  onRenew,
  hint,
  primary = "solid",
}: {
  url: string;
  renewing: boolean;
  onRenew: () => void;
  hint?: ReactNode;
  primary?: ButtonVariant;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-col gap-2">
      {/* a link, not window.open: after an await browsers block a scripted popup and iOS won't hand it to the app */}
      <ButtonLink href={telegramLink(url)} target="_blank" rel="noopener noreferrer" variant={primary} className="w-full">
        <Send className="size-4" />
        {t("auth.openBot")}
      </ButtonLink>
      {hint}
      <Button variant="outline" className="w-full" disabled={renewing} onClick={onRenew}>
        {t("auth.newBotLink")}
      </Button>
    </div>
  );
}
