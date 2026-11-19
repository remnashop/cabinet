import { useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { usePendingLegalQuery } from "@entities/legal/api";
import { useMeQuery } from "@entities/session/api";
import { useAuthMethodsQuery } from "@features/auth/api";
import { logout } from "@features/auth/logout";
import { EmailLogin, type EmailCodeFlow } from "@features/auth/ui/EmailLogin";
import { DialogFooter, Modal } from "@shared/ui/Modal";
import { Button } from "@shared/ui/Button";
import { FormError } from "@shared/ui/FormError";
import { isMiniApp } from "@shared/telegram";

import { linkApi } from "./api";
import { MergeDialog } from "./MergeDialog";
import type { MergeOffer } from "./useLinkResult";

/** The shop requires an email: blocks the cabinet until the customer links one; only sign-out leaves it. */
export function RequiredEmailGate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const methods = useAuthMethodsQuery();
  const me = useMeQuery();
  const pendingLegal = usePendingLegalQuery();
  const [merge, setMerge] = useState<MergeOffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  // documents first: their gate holds the screen until they are accepted
  const waiting = !pendingLegal.data || pendingLegal.data.items.length > 0;
  if (!methods.data?.email_required || !me.data || me.data.email || waiting) return null;

  const refetch = () =>
    Promise.all(["me", "identities"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));

  const flow: EmailCodeFlow = {
    sendCode: linkApi.sendEmailCode,
    verify: async (email, code) => {
      const result = await linkApi.verifyEmail(email, code);
      if (result.status !== "merge_required") {
        await refetch();
      } else if (result.merge_token && result.other) {
        setMerge({ kind: "EMAIL", token: result.merge_token, expiresIn: result.expires_in ?? 0, other: result.other });
      } else {
        setError(t("link.failed"));
      }
    },
  };

  return (
    <>
      <Modal narrow fullScreen icon={Mail} open title={t("link.requiredTitle")}>
        <div className="flex flex-col gap-3">
          <EmailLogin flow={flow} emailHint={t("link.requiredHint")} />
          {error && <FormError>{error}</FormError>}
        </div>
        {/* the Mini App would sign straight back in and land here again: no sign-out there */}
        {!isMiniApp() && (
          <DialogFooter>
            <Button variant="glass" onClick={() => void logout().then(() => queryClient.clear())}>
              {t("common.logout")}
            </Button>
          </DialogFooter>
        )}
      </Modal>
      <MergeDialog
        offer={merge}
        onClose={() => setMerge(null)}
        onMerged={() => {
          setMerge(null);
          void refetch();
        }}
        onExpired={(message) => {
          setMerge(null);
          setError(message);
        }}
      />
    </>
  );
}
