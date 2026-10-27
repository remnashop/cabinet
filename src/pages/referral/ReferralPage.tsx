import { CalendarPlus, Check, Coins, Copy, Gift, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import { useReferralQuery } from "@entities/referral/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { WithdrawSheet } from "./WithdrawSheet";
import { formatNumber, inviteLinks, rewardTerms } from "@features/referral/links";
import { formatDate } from "@shared/lib/format";
import { haptic, share } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EVENT_ROW, EventIcon, EventList, EventListEmpty } from "@shared/ui/EventList";
import { KpiTile } from "@shared/ui/KpiTile";
import { QrCode } from "@shared/ui/QrCode";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";
import { RedeemDaysSheet } from "@widgets/redeem-days/RedeemDaysSheet";

/** "Copied" for two seconds after flash(). */
function useCopied() {
  const [copied, setCopied] = useState(false);
  // one pending "copied → copy" reset; unmount drops it
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = () => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return [copied, flash] as const;
}

function CopyButton({ value, className }: { value: string; className?: string }) {
  const { t } = useTranslation();
  const [copied, flash] = useCopied();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      flash();
    } catch {
      // clipboard blocked: the link is printed right there to copy by hand
    }
  };

  return (
    <Button variant="accent" className={`gap-2 ${className ?? ""}`} onClick={() => void copy()}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? t("referral.copied") : t("referral.copy")}
    </Button>
  );
}

/** Without a share sheet the link lands in the clipboard: say so like the Copy button does. */
function ShareButton({ value }: { value: string }) {
  const { t } = useTranslation();
  const [copied, flash] = useCopied();
  return (
    <Button
      variant="solid"
      className="flex-1 gap-2"
      onClick={() => {
        haptic();
        void share(value, t("referral.shareText")).then((toClipboard) => toClipboard && flash());
      }}
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? t("referral.copied") : t("referral.share")}
    </Button>
  );
}

const LINK_CLASS = "w-full break-all rounded-xl bg-white/[0.04] p-3 font-mono text-xs";

export function ReferralPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const referral = useReferralQuery();
  const settings = useCabinetSettingsQuery();
  const [sheet, setSheet] = useState<"cabinet" | "qr" | "redeem" | "withdraw" | null>(null);
  const close = () => setSheet(null);

  const header = <PageHeader title={t("pages.referral")} />;

  if (referral.isError) {
    return (
      <>
        {header}
        <ErrorCard onRetry={() => void referral.refetch()} />
      </>
    );
  }
  if (!referral.data) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-40" />
        </div>
      </>
    );
  }

  const { program, points, bonus_days: bonusDays, counts_by_level: counts, rewards } = referral.data;
  if (!program.enabled) {
    // the nav drops the tab; a bookmarked /referral goes home
    return <Navigate to="/" replace />;
  }

  const links = inviteLinks(referral.data.referral_code, settings.data?.bot_username ?? null, window.location.origin);
  // the bot link is the main one; without a bot the cabinet link takes its place
  const main = links.bot ?? links.cabinet;
  // until the settings arrive the bot link is unknown: don't let Share/Copy/QR grab the cabinet link
  const linkPending = settings.isPending;
  const pointsValue = Number(points);
  const invited = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const stats: [string, string][] = [
    [t("referral.invited"), String(invited)],
    [t("referral.level1"), String(counts["1"] ?? 0)],
    [t("referral.points"), formatNumber(points, locale)],
    [t("referral.bonusDays"), String(bonusDays)],
  ];

  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <Card title={t("referral.title")} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{rewardTerms(program, t, locale)}</p>
          {linkPending ? (
            <>
              <Skeleton className="h-12 w-full rounded-xl" />
              <div className="flex gap-2">
                <Button variant="solid" className="flex-1 gap-2" disabled>
                  <Share2 className="size-4" />
                  {t("referral.share")}
                </Button>
                <Button variant="accent" className="flex-1 gap-2" disabled>
                  <Copy className="size-4" />
                  {t("referral.copy")}
                </Button>
              </div>
              <div className="flex gap-4 text-sm text-primary opacity-50">
                <span>{t("referral.qr")}</span>
              </div>
            </>
          ) : main ? (
            <>
              <p className={LINK_CLASS}>{main}</p>
              <div className="flex gap-2">
                <ShareButton value={main} />
                <CopyButton value={main} className="flex-1" />
              </div>
              <div className="flex gap-4 text-sm text-primary">
                {links.bot && links.cabinet && (
                  <button type="button" onClick={() => setSheet("cabinet")}>
                    {t("referral.cabinetLink")}
                  </button>
                )}
                <button type="button" onClick={() => setSheet("qr")}>
                  {t("referral.qr")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("referral.noCode")}</p>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <KpiTile key={label} label={label} value={value} />
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="accent" className="sm:flex-1" disabled={bonusDays === 0} onClick={() => setSheet("redeem")}>
            {t("referral.redeemDays")}
          </Button>
          <Button
            variant="accent"
            className="sm:flex-1"
            disabled={Math.floor(pointsValue) < 1}
            onClick={() => setSheet("withdraw")}
          >
            {t("referral.withdraw")}
          </Button>
        </div>

        <Card title={t("referral.rewards")}>
          {rewards.length === 0 ? (
            <EventListEmpty icon={Gift} text={t("referral.noRewards")} />
          ) : (
            <EventList className="mt-2">
              {rewards.map((reward, i) => (
                <div key={i} className={`flex ${EVENT_ROW} items-center justify-between gap-3 hover:bg-white/[0.04]`}>
                  <span className="flex min-w-0 items-center gap-3">
                    <EventIcon icon={reward.type === "POINTS" ? Coins : CalendarPlus} />
                    <span className="truncate text-[13px] font-medium text-foreground/90">
                      {reward.type === "POINTS"
                        ? t("referral.rewardPoints", { n: formatNumber(reward.amount, locale) })
                        : t("referral.rewardDays", { count: Number(reward.amount) })}
                    </span>
                  </span>
                  {reward.created_at && (
                    <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                      {formatDate(reward.created_at, locale)}
                    </span>
                  )}
                </div>
              ))}
            </EventList>
          )}
        </Card>
      </div>

      <BottomSheet open={sheet === "cabinet"} onClose={close} title={t("referral.cabinetLink")}>
        {links.cabinet && (
          <div className="flex flex-col gap-3">
            <p className={LINK_CLASS}>{links.cabinet}</p>
            <CopyButton value={links.cabinet} />
          </div>
        )}
      </BottomSheet>
      <BottomSheet open={sheet === "qr"} onClose={close} title={t("referral.qr")}>
        {main && (
          <div className="flex flex-col items-center gap-3">
            <QrCode value={main} size={208} />
            <p className={LINK_CLASS}>{main}</p>
          </div>
        )}
      </BottomSheet>
      <RedeemDaysSheet open={sheet === "redeem"} onClose={close} bonusDays={bonusDays} />
      <WithdrawSheet open={sheet === "withdraw"} onClose={close} maxPoints={Math.floor(pointsValue)} />
    </>
  );
}
