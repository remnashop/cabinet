import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useConnectGuideQuery, useVerifyHopQuery } from "@entities/connect-guide/api";
import { catalogBuilds, decodeHop } from "@entities/connect-guide/lib";
import { Button } from "@shared/ui/Button";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { Spinner } from "@shared/ui/Spinner";
import { FullScreen, FullScreenMessage as Message } from "@widgets/full-screen/FullScreen";

import { useCopyLink } from "./use-copy-link";

/**
 * Where a Mini App deep link lands: Telegram's webview can't open an app scheme, so the connect screen
 * hands the link to the real browser on this page. It rides in the fragment, never sent in a request.
 * Public (the browser has no cabinet session) and its address is anybody's to write, so the app opens
 * only from a tap, and only when a catalog button builds exactly this link from this subscription and
 * the backend signed that subscription for a signed-in customer. The host is still shown: a valid
 * signature can't tell a subscription somebody else passed on from one's own.
 */
export function OpenInAppPage() {
  const { t } = useTranslation();
  const [hop] = useState(() => decodeHop(window.location.hash.slice(1)));
  const guide = useConnectGuideQuery();
  const built = hop !== null && guide.data !== undefined && catalogBuilds(guide.data, hop);
  const verify = useVerifyHopQuery(built ? hop : null);
  const [copied, copy] = useCopyLink(hop?.sub ?? "");

  if (hop === null || (guide.data !== undefined && !built)) {
    return <Message tone="warning" title={t("connect.openInvalid")} text={t("connect.openInvalidHint")} />;
  }
  if (guide.isError || verify.isError) {
    return (
      <Message tone="error" title={t("connect.openFailed")} text={t("connect.openFailedHint")}>
        <Button variant="outline" size="lg" className="w-full" onClick={() => void (guide.isError ? guide.refetch() : verify.refetch())}>
          {t("common.retry")}
        </Button>
      </Message>
    );
  }
  if (!verify.data) {
    return (
      <FullScreen>
        <Spinner />
      </FullScreen>
    );
  }
  if (!verify.data.valid) {
    return <Message tone="warning" title={t("connect.openUnverified")} text={t("connect.openUnverifiedHint")} />;
  }
  return (
    <Message title={t("connect.openTitle")} text={t("connect.openHint")}>
      <p className="break-all text-xs text-muted-foreground">
        {t("connect.openSource", { host: new URL(hop.sub).host })}
      </p>
      <div className="flex w-full flex-col gap-2">
        <ButtonLink href={hop.link} variant="solid" size="lg">
          {t("connect.open")}
        </ButtonLink>
        <Button variant="outline" size="lg" onClick={() => void copy()}>
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          {copied ? t("connect.copied") : t("connect.copy")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("connect.openNotOpened")}</p>
    </Message>
  );
}
