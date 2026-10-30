import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmailLogin, type EmailCodeFlow } from "@features/auth/ui/EmailLogin";
import { BottomSheet } from "@shared/ui/BottomSheet";

import { linkApi, type LinkResult } from "./api";

/** Address -> 6-digit code, the same form as sign-in but against the link endpoints. */
export function LinkEmailSheet({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (result: LinkResult) => void;
}) {
  const { t } = useTranslation();
  const flow: EmailCodeFlow = {
    sendCode: linkApi.sendEmailCode,
    verify: async (email, code) => {
      const result = await linkApi.verifyEmail(email, code);
      onClose();
      onResult(result);
    },
  };
  return (
    <BottomSheet narrow icon={Mail} open={open} onClose={onClose} title={t("link.emailTitle")}>
      {/* no domain hint: it's about creating accounts, and this one exists */}
      <EmailLogin flow={flow} emailHint={t("link.emailHint")} />
    </BottomSheet>
  );
}
