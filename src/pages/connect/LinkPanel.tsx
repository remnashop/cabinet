import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useReissue, type OwnSubscription } from "@entities/subscription/api";
import { getErrorMessage } from "@shared/api/http";
import { haptic, openExternal } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { QrCode } from "@shared/ui/QrCode";
import { FormError } from "@shared/ui/FormError";

import { CopyLinkField } from "./CopyLinkField";
import { useCopyLink } from "./use-copy-link";

/**
 * QR, the link itself, copy/open and reissue: the plain connect page. The guide's dialog (dialog) is for another
 * device, so it keeps the QR and the copy field only: opening the app here or reissuing doesn't belong there.
 */
export function LinkPanel({ subscription, dialog = false }: { subscription: OwnSubscription; dialog?: boolean }) {
  const { t } = useTranslation();
  const settings = useCabinetSettingsQuery();
  const reissue = useReissue();
  const [confirm, setConfirm] = useState(false);
  const linkRef = useRef<HTMLParagraphElement>(null);
  const [copied, copy] = useCopyLink(subscription.url, () => linkRef.current);

  return (
    <div className="flex flex-col items-center gap-4">
      <QrCode value={subscription.url} size={dialog ? "full" : 208} />
      {dialog ? (
        <CopyLinkField url={subscription.url} caption={t("connect.tapToCopy")} />
      ) : (
        <>
          <p ref={linkRef} className="w-full break-all rounded-xl bg-white/[0.04] p-3 font-mono text-xs">
            {subscription.url}
          </p>
          {/* stacked on phones: "Открыть в приложении" doesn't fit half a row */}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="gap-2 sm:flex-1" onClick={() => void copy()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t("connect.copied") : t("connect.copy")}
            </Button>
            <Button
              variant="accent"
              className="gap-2 sm:flex-1"
              onClick={() => {
                haptic();
                openExternal(subscription.url);
              }}
            >
              <ExternalLink className="size-4" />
              {t("connect.open")}
            </Button>
          </div>
        </>
      )}
      {!dialog && settings.data?.link_reset_enabled && (
        <Button variant="outline" className="w-full gap-2" onClick={() => setConfirm(true)}>
          <RefreshCw className="size-4" />
          {t("connect.reissue")}
        </Button>
      )}
      {reissue.isError && <FormError>{getErrorMessage(reissue.error, t("errors.generic"))}</FormError>}
      <ConfirmSheet
        open={confirm}
        danger
        title={t("connect.reissueTitle")}
        text={t("connect.reissueWarning")}
        confirmLabel={t("connect.reissue")}
        icon={RefreshCw}
        pending={reissue.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => reissue.mutate({ subscriptionId: subscription.id }, { onSettled: () => setConfirm(false) })}
      />
    </div>
  );
}
