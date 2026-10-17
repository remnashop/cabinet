import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useReissue, useSubscriptionsQuery } from "@entities/subscription/api";
import { getErrorMessage } from "@shared/api/http";
import { haptic, openExternal } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { QrCode } from "@shared/ui/QrCode";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

export function ConnectPage() {
  const { t } = useTranslation();
  const id = Number(useParams().id);
  const subscriptions = useSubscriptionsQuery();
  const settings = useCabinetSettingsQuery();
  const reissue = useReissue();
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLParagraphElement>(null);
  // one pending "copied → copy" reset; a re-click restarts it, unmount drops it
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const header = <PageHeader title={t("connect.title")} backTo="/" />;

  if (subscriptions.isError) {
    return (
      <>
        {header}
        <ErrorCard onRetry={() => void subscriptions.refetch()} />
      </>
    );
  }
  if (!subscriptions.data) {
    return (
      <>
        {header}
        <Skeleton className="h-72" />
      </>
    );
  }
  const subscription = subscriptions.data.items.find((s) => s.id === id);
  if (!subscription) {
    return (
      <>
        {header}
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{t("connect.notFound")}</p>
          <Link to="/" className="text-sm text-primary">
            {t("common.home")}
          </Link>
        </Card>
      </>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(subscription.url);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked or missing: select the text so the user can copy by hand
      const range = document.createRange();
      if (linkRef.current) range.selectNodeContents(linkRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <>
      {header}
      <Card className="flex flex-col items-center gap-4">
        <QrCode value={subscription.url} size={208} />
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
        {settings.data?.link_reset_enabled && (
          <Button variant="outline" className="w-full gap-2" onClick={() => setConfirm(true)}>
            <RefreshCw className="size-4" />
            {t("connect.reissue")}
          </Button>
        )}
        {reissue.isError && <p className="text-sm text-error">{getErrorMessage(reissue.error, t("errors.generic"))}</p>}
      </Card>
      <ConfirmSheet
        open={confirm}
        danger
        title={t("connect.reissueTitle")}
        text={t("connect.reissueWarning")}
        confirmLabel={t("connect.reissue")}
        pending={reissue.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => reissue.mutate({ subscriptionId: id }, { onSettled: () => setConfirm(false) })}
      />
    </>
  );
}
