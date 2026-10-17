import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useReferralQuery } from "@entities/referral/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { RedeemDaysSheet } from "./RedeemDaysSheet";
import { WithdrawSheet } from "./WithdrawSheet";
import { formatNumber, inviteLinks, rewardTerms } from "@features/referral/links";
import { formatDate } from "@shared/lib/format";
import { haptic, share } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { QrCode } from "@shared/ui/QrCode";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

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
        <div className="flex flex-col gap-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-40" />
        </div>
      </>
    );
  }

  const { program, points, bonus_days: bonusDays, counts_by_level: counts, rewards } = referral.data;
  if (!program.enabled) {
    return (
      <>
        {header}
        <Card className="text-sm text-muted-foreground">{t("referral.disabled")}</Card>
      </>
    );
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
      <div className="flex flex-col gap-3">
        <Card className="flex flex-col gap-3">
          <div>
            <p className="font-semibold">{t("referral.title")}</p>
            <p className="text-sm text-muted-foreground">{rewardTerms(program, t, locale)}</p>
          </div>
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

        <div className="grid grid-cols-2 gap-3">
          {stats.map(([label, value]) => (
            <Card key={label} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
              <b className="text-xl">{value}</b>
            </Card>
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

        <Card title={t("referral.rewards")} variant="list">
          {rewards.length === 0 && <p className="px-2.5 py-2 text-sm text-muted-foreground">{t("referral.noRewards")}</p>}
          {rewards.map((reward, i) => (
            <div key={i} className="flex h-9.5 items-center justify-between gap-3 px-2.5 text-[13px]">
              <b>
                {reward.type === "POINTS"
                  ? t("referral.rewardPoints", { n: formatNumber(reward.amount, locale) })
                  : t("referral.rewardDays", { count: Number(reward.amount) })}
              </b>
              {reward.created_at && <span className="text-muted-foreground">{formatDate(reward.created_at, locale)}</span>}
            </div>
          ))}
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
