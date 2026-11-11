import { QrCode as QrCodeIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";

import { invitedCount, useReferralQuery } from "@entities/referral/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { inviteLinks } from "@features/referral/links";
import { isMiniApp } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { QrCode } from "@shared/ui/QrCode";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";
import { RedeemDaysSheet } from "@widgets/redeem-days/RedeemDaysSheet";
import { useSupport } from "@widgets/support/use-support";
import { CopyLinkField } from "@pages/connect/CopyLinkField";

import { InviteBlocks } from "./InviteBlocks";

export function ReferralPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const referral = useReferralQuery();
  const settings = useCabinetSettingsQuery();
  const [sheet, setSheet] = useState<"qr" | "days" | null>(null);
  const support = useSupport();
  const close = () => setSheet(null);

  const header = <PageHeader title={t("pages.referral")} backTo="/" navItem />;

  if (referral.isError && !referral.data) {
    return (
      <>
        {header}
        <ErrorCard round error={referral.error} onRetry={() => void referral.refetch()} />
      </>
    );
  }
  if (!referral.data) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-5">
          <Skeleton round className="h-44" />
          <Skeleton round className="h-40" />
        </div>
      </>
    );
  }

  const { program, counts_by_level: counts } = referral.data;
  if (!program.enabled) {
    // the nav drops the tab; a bookmarked /invite goes home
    return <Navigate to="/" replace />;
  }

  const links = inviteLinks(referral.data.referral_code, settings.data?.bot_username ?? null, window.location.origin);
  // where the page is open decides the link: the Mini App invites to the bot, the web to the cabinet
  const miniApp = isMiniApp();
  const main = miniApp ? (links.bot ?? links.cabinet) : (links.cabinet ?? links.bot);
  // until the settings arrive the bot link is unknown: in the Mini App don't let Share/Copy/QR grab the cabinet link
  const linkPending = miniApp && settings.isPending;
  const invited = invitedCount(counts);

  return (
    <>
      {header}
      <div className="flex flex-col gap-5">
        <InviteBlocks
          data={{
            program,
            main,
            linkPending,
            invited,
            points: referral.data.points,
            bonusDays: referral.data.bonus_days,
            countsByLevel: counts,
            onQr: () => setSheet("qr"),
            onRedeemDays: () => setSheet("days"),
            onWithdraw: support.available ? support.open : undefined,
            onInvited: () => void navigate("/invite/friends"),
          }}
        />
      </div>

      <RedeemDaysSheet open={sheet === "days"} onClose={close} bonusDays={referral.data.bonus_days} />
      {support.dialog}

      <BottomSheet
        narrow
        icon={QrCodeIcon}
        open={sheet === "qr"}
        onClose={close}
        title={t("referral.qr")}
      >
        {main && (
          <div className="flex flex-col items-center gap-4">
            <QrCode value={main} size="full" />
            <CopyLinkField url={main} caption={t("connect.tapToCopy")} />
          </div>
        )}
      </BottomSheet>
    </>
  );
}
