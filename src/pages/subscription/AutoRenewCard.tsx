import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAutoRenewQuery, useSetAutoRenew, type AutoRenewState } from "@entities/subscription/api";
import { getErrorMessage } from "@shared/api/http";
import { formatDateTime } from "@shared/lib/format";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { FormError } from "@shared/ui/FormError";
import { LegalMarkdown } from "@shared/ui/LegalDocumentDialog";
import { DialogFooter, Modal } from "@shared/ui/Modal";

function statusKey(state: AutoRenewState) {
  if (state.payment_in_flight) return "inFlight" as const;
  if (state.paused) return "paused" as const;
  if (state.retrying) return "retrying" as const;
  if (state.enabled) return "on" as const;
  return "off" as const;
}

export function AutoRenewCard({ subscriptionId }: { subscriptionId: number }) {
  const { t, i18n } = useTranslation();
  const state = useAutoRenewQuery(subscriptionId).data;
  const setAutoRenew = useSetAutoRenew(subscriptionId);
  const [confirming, setConfirming] = useState<"enable" | "disable" | null>(null);

  if (!state || !(state.enabled || state.available || state.can_disable)) return null;
  const close = () => setConfirming(null);
  const nextPayment = state.next_payment_at ? formatDateTime(state.next_payment_at, i18n.language) : null;

  return (
    <Card round>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <RefreshCw className="size-4" />
          {t(`subscription.autoRenew.status.${statusKey(state)}`)}
        </div>
        {state.payment_in_flight && <p className="text-xs text-foreground/80">{t("subscription.autoRenew.inFlightNote")}</p>}
        {state.enabled && nextPayment && (
          <p className="text-xs text-foreground/80">{t("subscription.autoRenew.nextPayment", { when: nextPayment })}</p>
        )}
        {!state.enabled && state.terms && <p className="text-xs text-foreground/80">{state.terms.summary}</p>}
        {setAutoRenew.error && <FormError>{getErrorMessage(setAutoRenew.error, t("errors.generic"))}</FormError>}
        {state.can_disable ? (
          <Button variant="glass" onClick={() => setConfirming("disable")}>
            {t("subscription.autoRenew.disable")}
          </Button>
        ) : (
          state.available &&
          state.terms && (
            <Button variant="glassAccent" onClick={() => setConfirming("enable")}>
              {t("subscription.autoRenew.enable")}
            </Button>
          )
        )}
      </div>
      <ConfirmDialog
        open={confirming === "disable"}
        danger
        title={t("subscription.autoRenew.disableTitle")}
        text={t("subscription.autoRenew.disableText")}
        confirmLabel={t("subscription.autoRenew.disable")}
        pending={setAutoRenew.isPending}
        onConfirm={() => setAutoRenew.mutate({ enabled: false }, { onSuccess: close })}
        onClose={close}
      />
      <Modal fullScreen open={confirming === "enable"} onClose={close} title={t("purchase.recurring.termsTitle")}>
        {state.terms && <LegalMarkdown>{state.terms.text}</LegalMarkdown>}
        <DialogFooter>
          <Button variant="glass" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="glassAccent"
            disabled={setAutoRenew.isPending || !state.terms}
            onClick={() =>
              state.terms &&
              setAutoRenew.mutate({ enabled: true, terms_id: state.terms.terms_id }, { onSuccess: close })
            }
          >
            {t("subscription.autoRenew.agree")}
          </Button>
        </DialogFooter>
      </Modal>
    </Card>
  );
}
