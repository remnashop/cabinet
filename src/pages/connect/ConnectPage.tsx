import { CloudOff, QrCode } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { useConnectGuideQuery } from "@entities/connect-guide/api";
import { useSubscriptionsQuery } from "@entities/subscription/api";
import { Modal } from "@shared/ui/Modal";
import { Button } from "@shared/ui/Button";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { PageEmpty } from "@shared/ui/PageEmpty";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { GuideView } from "./GuideView";
import { Hero, HeroArt } from "./HeroArt";
import { LinkPanel } from "./LinkPanel";

export function ConnectPage() {
  const { t } = useTranslation();
  const id = Number(useParams().id);
  const subscriptions = useSubscriptionsQuery();
  const guide = useConnectGuideQuery();
  const navigate = useNavigate();
  const [linkOpen, setLinkOpen] = useState(false);

  const header = <PageHeader title={t("connect.title")} backTo="/" />;

  if (subscriptions.isError && !subscriptions.data) {
    return (
      <>
        {header}
        <ErrorCard round error={subscriptions.error} onRetry={() => void subscriptions.refetch()} />
      </>
    );
  }
  if (!subscriptions.data || guide.isPending) {
    return (
      <>
        {header}
        <Skeleton round className="h-72" />
      </>
    );
  }
  // never another subscription's link in place of the one asked for
  const subscription = subscriptions.data.items.find((s) => s.id === id);
  if (!subscription) {
    return (
      <>
        {header}
        <PageEmpty warning text={t("connect.notFound")}>
          <ButtonLink to="/" variant="glass" className="mt-1">
            {t("common.home")}
          </ButtonLink>
        </PageEmpty>
      </>
    );
  }

  // the guide didn't load: the plain link page still connects
  if (guide.isError && !guide.data) {
    return (
      <>
        {header}
        <Card round>
          <LinkPanel subscription={subscription} />
        </Card>
      </>
    );
  }
  // switched off or empty in the dashboard: nothing to set up with, said the way the wizard says it
  if (!guide.data.platforms.length) {
    return (
      <>
        {header}
        <Hero title={t("connect.unavailableTitle")} hint={t("connect.guideOffHint")} art={<HeroArt icon={CloudOff} />}>
          <Button variant="glassSolid" size="lg" onClick={() => void navigate("/")}>
            {t("connect.backHome")}
          </Button>
        </Hero>
      </>
    );
  }

  // the guide draws its own header: its back walks the wizard's steps
  return (
    <>
      <GuideView
        guide={guide.data}
        subscription={subscription}
        onShowLink={() => setLinkOpen(true)}
      />
      <Modal
        narrow
        icon={QrCode}
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title={t("connect.linkAndQr")}
      >
        <LinkPanel subscription={subscription} dialog />
      </Modal>
    </>
  );
}
