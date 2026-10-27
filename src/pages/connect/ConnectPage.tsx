import { QrCode } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { useConnectGuideQuery } from "@entities/connect-guide/api";
import { useSubscriptionsQuery } from "@entities/subscription/api";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { GuideView } from "./GuideView";
import { LinkPanel } from "./LinkPanel";

export function ConnectPage() {
  const { t } = useTranslation();
  const id = Number(useParams().id);
  const subscriptions = useSubscriptionsQuery();
  const guide = useConnectGuideQuery();
  const [linkOpen, setLinkOpen] = useState(false);

  const header = <PageHeader title={t("connect.title")} backTo="/" />;

  if (subscriptions.isError) {
    return (
      <>
        {header}
        <ErrorCard onRetry={() => void subscriptions.refetch()} />
      </>
    );
  }
  // a guide that failed to load is no guide: the plain link page still connects
  if (!subscriptions.data || guide.isPending) {
    return (
      <>
        {header}
        <Skeleton className="h-72" />
      </>
    );
  }
  // never another subscription's link in place of the one asked for
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

  if (!guide.data?.platforms.length) {
    return (
      <>
        {header}
        <Card>
          <LinkPanel subscription={subscription} />
        </Card>
      </>
    );
  }

  return (
    <>
      {header}
      <GuideView
        guide={guide.data}
        subscription={subscription}
        linkAction={
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setLinkOpen(true)}>
            <QrCode className="size-3.5" />
            {t("connect.linkAndQr")}
          </Button>
        }
      />
      <BottomSheet variant="dialog" narrow open={linkOpen} onClose={() => setLinkOpen(false)} title={t("connect.linkAndQr")}>
        <LinkPanel subscription={subscription} />
      </BottomSheet>
    </>
  );
}
